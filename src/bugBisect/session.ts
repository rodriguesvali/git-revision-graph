import { randomUUID } from 'node:crypto';
import { isOwnedBisectLog } from './logOwnership';
import { resolve } from 'node:path';
import type { Repository } from '../git';
import { createMutationGuardedRepository, RepositoryMutationCoordinator, type RepositoryMutationLease } from '../repositoryMutationCoordinator';
import { BisectGit, type BisectSelection } from './git';
import { bisectView, readBisectSessions, type BisectSession } from './sessionState';

export interface BugBisectHost {
  hasUnsavedDocuments(repository: Repository): boolean;
  save(sessions: readonly BisectSession[]): PromiseLike<void>;
  changed(repositoryPath: string, state: RevisionGraphProtocol.BisectView | null, reveal: boolean): void;
  confirmStop(destination: string, detached: boolean): Promise<boolean>;
  confirmAbandon?(destination: string): Promise<boolean>;
  inspect(repository: Repository, hash: string): Promise<void>;
  copy(hash: string): PromiseLike<void>;
  openSourceControl(): Promise<void>;
}

export class BugBisectSessions {
  private readonly sessions = new Map<string, BisectSession>();
  private readonly releases = new Map<string, () => void>();
  private readonly owner = Symbol('bug-bisect');
  private persistence: Promise<void> = Promise.resolve();

  constructor(private readonly coordinator: RepositoryMutationCoordinator, private readonly host: BugBisectHost, stored?: unknown) {
    for (const session of readBisectSessions(stored)) {
      this.sessions.set(resolve(session.repositoryPath), session);
      if (session.started) this.reserve(session.repositoryPath);
    }
  }

  state(repositoryPath: string): RevisionGraphProtocol.BisectView | null {
    const session = this.sessions.get(resolve(repositoryPath));
    return session ? bisectView(session) : null;
  }

  dispose(): void {
    for (const release of this.releases.values()) release();
    this.releases.clear();
  }

  async prepare(repository: Repository, revision: string): Promise<void> {
    const root = repository.rootUri.fsPath;
    const existing = this.sessions.get(resolve(root));
    if (existing?.started || existing?.busy) { this.publish(existing, true); return; }
    const outcome = await this.coordinator.run(root, async (lease) => {
      const git = new BisectGit(root, lease.signal);
      await this.assertClean(repository, git);
      if (await git.hasMetadata('BISECT_START')) throw new Error('A Git bisect is already active. Finish it before starting another search.');
      const selected = await git.resolveCommit(revision);
      const head = await git.head();
      if (head.hash === selected.hash) throw new Error('Choose a revision different from HEAD.');
      const original = await git.commit(head.hash);
      lease.assertCurrent();
      const session: BisectSession = {
        id: randomUUID(), version: 1, repositoryPath: root, status: 'preparing',
        selected, original, branch: head.branch, swapped: false, candidates: [],
        history: [], mergeBaseCheck: false, busy: false, started: false, log: '', expectedHead: head.hash
      };
      this.sessions.set(resolve(root), session);
      this.publish(session, true);
    });
    if (outcome.status === 'rejected') throw new Error('Another operation or bug search is active in this repository.');
  }

  async control(repository: Repository, message: RevisionGraphProtocol.MessageOf<'bisect-control'>): Promise<void> {
    const root = repository.rootUri.fsPath;
    const session = this.match(root, message);
    if (!session) return;
    if (await this.handleReadOnly(repository, session, message)) return;
    if (message.action === 'abandon') { await this.abandon(session); return; }
    if (!await this.acceptControl(session, message.action)) return;
    // Confirmation can outlive the current question or repository state.
    if (session.busy || message.version !== session.version) return;
    if (!this.reserve(root)) { this.publishError(session, new Error('Another repository operation is active.')); return; }
    this.replace(session, { busy: true, error: undefined });
    try {
      const outcome = await this.coordinator.run(root, async (lease) => {
        const git = new BisectGit(root, lease.signal);
        await this.assertClean(repository, git);
        await this.assertOwned(git, session);
        lease.assertCurrent();
        await this.execute(createMutationGuardedRepository(repository, lease), git, session, message.action, lease);
      }, this.owner);
      if (outcome.status === 'rejected') throw new Error('Another repository operation is active.');
    } catch (error) {
      this.publishError(session, error);
    } finally {
      if (this.sessions.get(resolve(root)) === session) {
        this.replace(session, { busy: false });
        try { await this.save(); } catch (error) { this.publishError(session, error); }
        if (!session.started) {
          this.releases.get(resolve(root))?.();
          this.releases.delete(resolve(root));
        }
      }
    }
  }

  private match(root: string, message: RevisionGraphProtocol.MessageOf<'bisect-control'>): BisectSession | undefined {
    const session = this.sessions.get(resolve(root));
    return session && message.repositoryPath === root && message.id === session.id
      && message.version === session.version && !session.busy ? session : undefined;
  }

  private async acceptControl(session: BisectSession, action: RevisionGraphProtocol.BisectControl): Promise<boolean> {
    if (!session.started) {
      if (action === 'stop') {
        this.sessions.delete(resolve(session.repositoryPath));
        this.host.changed(session.repositoryPath, null, false);
        return false;
      }
      return action === 'start' || action === 'start-swapped';
    }
    if (action !== 'stop' && action !== 'stop-detached') return true;
    const confirmed = await this.host.confirmStop(session.branch ?? session.original.hash.slice(0, 7), action === 'stop-detached');
    if (!confirmed) this.publish(session, false);
    return confirmed;
  }

  private async abandon(session: BisectSession): Promise<void> {
    if (!session.error) { this.publish(session, false); return; }
    const version = session.version;
    const confirmed = await this.host.confirmAbandon?.(session.original.hash);
    if (session.busy || session.version !== version || this.sessions.get(resolve(session.repositoryPath)) !== session) return;
    if (!confirmed) { this.publish(session, false); return; }
    this.sessions.delete(resolve(session.repositoryPath));
    try { await this.save(); }
    catch (error) { this.sessions.set(resolve(session.repositoryPath), session); this.publishError(session, error); return; }
    this.releases.get(resolve(session.repositoryPath))?.();
    this.releases.delete(resolve(session.repositoryPath));
    this.host.changed(session.repositoryPath, null, false);
  }

  private async handleReadOnly(repository: Repository, session: BisectSession, message: RevisionGraphProtocol.MessageOf<'bisect-control'>): Promise<boolean> {
    if (message.action === 'scm') { await this.host.openSourceControl(); return true; }
    if (message.action !== 'inspect' && message.action !== 'copy') return false;
    const hash = message.commitHash ?? session.current?.hash ?? session.candidates[0]?.hash;
    const allowed = [session.current, session.selected, session.original, ...session.candidates, ...session.history.map((item) => item.commit)];
    if (hash && allowed.some((item) => item?.hash === hash)) {
      if (message.action === 'copy') await this.host.copy(hash);
      else await this.host.inspect(repository, hash);
    }
    return true;
  }

  private async execute(repository: Repository, git: BisectGit, session: BisectSession, action: RevisionGraphProtocol.BisectControl, lease: RepositoryMutationLease): Promise<void> {
    if (action === 'stop' || action === 'stop-detached') { await this.stop(repository, git, session, action === 'stop-detached', lease); return; }
    if (action === 'start' || action === 'start-swapped') {
      await this.start(repository, git, session, action === 'start-swapped', lease);
      return;
    }
    if (action === 'undo') { await this.undo(repository, git, session, lease); return; }
    if (action === 'retry') {
      if (session.rebuilding) await this.rebuild(git, session, lease);
      if (session.pendingAnswer) {
        await this.completeAnswer(repository, git, session, lease);
        return;
      }
      await this.checkoutSelection(repository, git, session, lease); return;
    }
    if (action !== 'good' && action !== 'bad' && action !== 'skip') return;
    if (session.status !== 'testing' || !session.current || session.current.hash !== session.expectedHead) {
      throw new Error('Check out the pending test revision before recording an answer.');
    }
    const commit = session.current;
    const answer = { commit, answer: action };
    this.replace(session, { history: [...session.history, answer], pendingAnswer: answer });
    await this.save();
    await this.completeAnswer(repository, git, session, lease);
  }

  private async start(repository: Repository, git: BisectGit, session: BisectSession, swapped: boolean, lease: RepositoryMutationLease): Promise<void> {
    if (session.started && session.status !== 'preparing') return;
    if (session.started) {
      await this.resetOwned(git, session);
      this.replace(session, { started: false, log: '' });
    }
    this.replace(session, { swapped, started: true });
    await this.save();
    const selection = await this.ownCommand(git, session, () => git.start(
      session.swapped ? session.selected.hash : session.original.hash,
      session.swapped ? session.original.hash : session.selected.hash
    ), this.startCommand(session));
    await this.applySelection(repository, git, session, selection, lease);
  }

  private async completeAnswer(repository: Repository, git: BisectGit, session: BisectSession, lease: RepositoryMutationLease): Promise<void> {
    const answer = session.pendingAnswer!;
    const selection = await this.ownCommand(git, session, () => git.answer(answer.answer, answer.commit.hash), [answer.answer, answer.commit.hash]);
    await this.applySelection(repository, git, session, selection, lease);
  }

  private async ownCommand(git: BisectGit, session: BisectSession, command: () => Promise<BisectSelection>, expected: readonly string[]): Promise<BisectSelection> {
    const previous = session.log;
    try { return await command(); }
    finally {
      // Capture partial metadata changes as well as success, so failure remains recoverable.
      const recovery = new BisectGit(git.repositoryPath);
      if (await recovery.hasMetadata('BISECT_START')) {
        const log = await recovery.log();
        if (!isOwnedBisectLog(previous, log, expected)) throw new Error('Git bisect state changed outside this search during the operation.');
        this.replace(session, { log });
      }
      await this.save();
    }
  }

  private async applySelection(repository: Repository, git: BisectGit, session: BisectSession, selection: BisectSelection, lease: RepositoryMutationLease): Promise<void> {
    this.replace(session, { ...selection, pendingAnswer: undefined });
    await this.save();
    await this.checkoutSelection(repository, git, session, lease);
  }

  private async checkoutSelection(repository: Repository, git: BisectGit, session: BisectSession, lease: RepositoryMutationLease): Promise<void> {
    if (session.status !== 'testing' || !session.current) return;
    await this.assertClean(repository, git);
    lease.assertCurrent();
    // Persist the intended revision before checkout for crash recovery.
    const target = session.current.hash;
    await repository.checkout(target);
    this.replace(session, { expectedHead: target });
    await this.save();
    lease.assertCurrent();
    if ((await git.head()).hash !== target) throw new Error('HEAD changed while checking out the test revision. Reopen the search to recover.');
  }

  private async undo(repository: Repository, git: BisectGit, session: BisectSession, lease: RepositoryMutationLease): Promise<void> {
    if (session.history.length === 0) return;
    const previous = session.history[session.history.length - 1];
    this.replace(session, { rebuilding: true, pendingAnswer: undefined, history: session.history.slice(0, -1), status: 'testing', current: previous.commit, candidates: [] });
    await this.save();
    await this.rebuild(git, session, lease);
    await this.checkoutSelection(repository, git, session, lease);
  }

  private async rebuild(git: BisectGit, session: BisectSession, lease: RepositoryMutationLease): Promise<void> {
    await this.resetOwned(git, session);
    this.replace(session, { log: '' });
    await this.save();
    let selection = await this.ownCommand(git, session, () => git.start(
      session.swapped ? session.selected.hash : session.original.hash,
      session.swapped ? session.original.hash : session.selected.hash
    ), this.startCommand(session));
    for (const entry of session.history) {
      lease.assertCurrent();
      selection = await this.ownCommand(git, session, () => git.answer(entry.answer, entry.commit.hash), [entry.answer, entry.commit.hash]);
    }
    this.replace(session, { rebuilding: false, mergeBaseCheck: selection.mergeBaseCheck, stepsRemaining: selection.stepsRemaining });
    await this.save();
  }

  private startCommand(session: BisectSession): readonly string[] {
    return ['start', '--no-checkout',
      session.swapped ? session.selected.hash : session.original.hash,
      session.swapped ? session.original.hash : session.selected.hash, '--'];
  }

  private async stop(repository: Repository, git: BisectGit, session: BisectSession, detached: boolean, lease: RepositoryMutationLease): Promise<void> {
    let destination = session.original.hash;
    if (session.branch && !detached) {
      if ((await git.resolveCommit(session.branch)).hash !== session.original.hash) {
        throw new Error('The original branch moved. Choose “Return to original commit” to recover without moving it.');
      }
      destination = session.branch.slice('refs/heads/'.length);
    }
    this.replace(session, { returning: true });
    await this.save();
    await this.assertClean(repository, git);
    await repository.checkout(destination);
    this.replace(session, { expectedHead: session.original.hash });
    await this.save();
    lease.assertCurrent();
    if ((await git.head()).hash !== session.original.hash) throw new Error('Could not restore the original revision.');
    await this.resetOwned(git, session);
    this.sessions.delete(resolve(session.repositoryPath));
    try { await this.save(); }
    catch (error) { this.sessions.set(resolve(session.repositoryPath), session); throw error; }
    this.releases.get(resolve(session.repositoryPath))?.();
    this.releases.delete(resolve(session.repositoryPath));
    this.host.changed(session.repositoryPath, null, false);
  }

  private async assertOwned(git: BisectGit, session: BisectSession): Promise<void> {
    const head = await git.head();
    const crashCheckout = session.started && (session.current?.hash === head.hash || (session.returning && head.hash === session.original.hash));
    if (head.hash !== session.expectedHead && !crashCheckout) throw new Error('HEAD changed outside this search. Restore the expected revision before continuing.');
    if (crashCheckout) this.replace(session, { expectedHead: head.hash });
    const active = await git.hasMetadata('BISECT_START');
    if (active ? !session.started || !session.log || await git.log() !== session.log
      : session.started && !!session.log && !session.rebuilding && !(session.returning && head.hash === session.original.hash)) {
      throw new Error('Git bisect state changed outside this search. No external session will be reset.');
    }
  }

  private async resetOwned(git: BisectGit, session: BisectSession): Promise<void> {
    await this.assertOwned(git, session);
    if (await git.hasMetadata('BISECT_START')) await git.reset();
  }

  private assertClean(repository: Repository, git: BisectGit): Promise<void> {
    return git.assertClean(this.host.hasUnsavedDocuments(repository));
  }

  private reserve(root: string): boolean {
    const key = resolve(root);
    if (this.releases.has(key)) return true;
    const release = this.coordinator.reserve(root, this.owner);
    if (!release) return false;
    this.releases.set(key, release);
    return true;
  }

  private replace(session: BisectSession, changes: Partial<BisectSession>): void {
    Object.assign(session, changes);
    this.publish(session, false);
  }

  private publish(session: BisectSession, reveal: boolean): void {
    Object.assign(session, { version: session.version + 1 });
    this.host.changed(session.repositoryPath, bisectView(session), reveal);
  }

  private publishError(session: BisectSession, error: unknown): void {
    this.replace(session, { error: error instanceof Error ? error.message : String(error) });
  }

  private save(): Promise<void> {
    const snapshot = JSON.parse(JSON.stringify([...this.sessions.values()].filter((session) => session.started))) as BisectSession[];
    const write = this.persistence.catch(() => undefined).then(() => this.host.save(snapshot));
    this.persistence = write;
    return write;
  }
}

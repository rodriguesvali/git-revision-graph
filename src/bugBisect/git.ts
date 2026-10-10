import { stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { execGit, GIT_EXEC_LOCAL_MUTATION_PROFILE, GIT_EXEC_METADATA_PROFILE } from '../gitExec';

export type BisectAnswer = 'good' | 'bad' | 'skip';
export interface BisectCommit { readonly hash: string; readonly subject: string }
export interface BisectSelection {
  readonly status: 'testing' | 'found' | 'inconclusive' | 'outside';
  readonly current?: BisectCommit;
  readonly candidates: readonly BisectCommit[];
  readonly mergeBaseCheck: boolean;
  readonly stepsRemaining?: number;
}
export interface BisectHead { readonly hash: string; readonly branch?: string }

export function isBisectHash(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
}

export class BisectGit {
  constructor(readonly repositoryPath: string, private readonly signal?: AbortSignal) {}

  async resolveCommit(revision: string): Promise<BisectCommit> {
    const hash = (await this.read(['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`])).trim();
    if (!isBisectHash(hash)) throw new Error('The selected revision does not resolve to a commit.');
    return this.commit(hash);
  }

  async commit(hash: string): Promise<BisectCommit> {
    if (!isBisectHash(hash)) throw new Error('Invalid bisect commit.');
    const subject = (await this.read(['show', '-s', '--format=%s', hash, '--'])).trim();
    return { hash, subject };
  }

  async head(): Promise<BisectHead> {
    const hash = (await this.resolveCommit('HEAD')).hash;
    const branch = (await this.read(['symbolic-ref', '--quiet', 'HEAD'], [0, 1])).trim() || undefined;
    return { hash, branch };
  }

  async assertClean(hasUnsavedDocuments: boolean): Promise<void> {
    if (hasUnsavedDocuments || (await this.read(['status', '--porcelain=v1', '--untracked-files=all'])).length > 0) {
      throw new Error('Resolve changes and save files in this repository before switching revisions.');
    }
    const operations = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'];
    for (const name of operations) {
      if (await this.hasMetadata(name)) throw new Error('Finish the current Git operation before searching for a bug.');
    }
  }

  async hasMetadata(name: string): Promise<boolean> {
    const gitPath = (await this.read(['rev-parse', '--git-path', name])).trim();
    try {
      await stat(isAbsolute(gitPath) ? gitPath : resolve(this.repositoryPath, gitPath));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  log(): Promise<string> { return this.read(['bisect', 'log']); }

  async start(bad: string, good: string): Promise<BisectSelection> {
    if (!isBisectHash(bad) || !isBisectHash(good)) throw new Error('Invalid bisect endpoints.');
    return this.select(['start', '--no-checkout', bad, good, '--']);
  }

  async answer(answer: BisectAnswer, hash: string): Promise<BisectSelection> {
    if (!isBisectHash(hash)) throw new Error('Invalid test revision.');
    return this.select([answer, hash]);
  }

  async reset(): Promise<void> {
    // A no-checkout session removes metadata without touching the worktree.
    await this.mutate(['bisect', 'reset', 'HEAD']);
  }

  private async select(args: readonly string[]): Promise<BisectSelection> {
    let output: string;
    let exitCode = 0;
    try {
      output = await this.mutate(['bisect', ...args]);
    } catch (error) {
      const detail = error as { code?: number; stdout?: string; stderr?: string };
      if (detail.code !== 2 && detail.code !== 3) throw error;
      exitCode = detail.code;
      output = `${detail.stdout ?? ''}\n${detail.stderr ?? ''}`;
    }
    const found = output.match(/^([a-f0-9]{40,64}) is the first 'bad' commit$/m);
    if (found) return this.result('found', [found[1]]);
    if (exitCode === 2) {
      const hashes = [...output.matchAll(/^([a-f0-9]{40,64})\s*$/gm)].map((item) => item[1]);
      if (hashes.length === 0) throw new Error(output.trim() || 'Git could not identify candidate commits.');
      return this.result('inconclusive', hashes);
    }
    if (exitCode === 3) return this.result('outside', []);
    const current = await this.resolveCommit('BISECT_HEAD');
    const remaining = output.match(/roughly (\d+) steps?/);
    return {
      status: 'testing', current, candidates: [],
      mergeBaseCheck: !await this.hasMetadata('BISECT_ANCESTORS_OK'),
      stepsRemaining: remaining ? Number(remaining[1]) + 1 : undefined
    };
  }

  private async result(status: BisectSelection['status'], hashes: readonly string[]): Promise<BisectSelection> {
    const candidates: BisectCommit[] = [];
    for (const hash of [...new Set(hashes)]) candidates.push(await this.commit(hash));
    return { status, candidates, mergeBaseCheck: false };
  }

  private read(args: readonly string[], allowedExitCodes?: readonly number[]): Promise<string> {
    return execGit(this.repositoryPath, args, { ...GIT_EXEC_METADATA_PROFILE, signal: this.signal, allowedExitCodes });
  }

  private mutate(args: readonly string[]): Promise<string> {
    return execGit(this.repositoryPath, args, {
      ...GIT_EXEC_LOCAL_MUTATION_PROFILE, signal: this.signal, forceEnglishOutput: true
    });
  }
}

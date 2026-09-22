import * as path from 'node:path';
import type { Memento } from 'vscode';
import type { RevisionGraphDescendantFocus } from './model/commitGraphTypes';
import { validateProjectionOptions } from './messageValidationOptions';

/** Workspace-local preferences, separated by repository (including worktrees). */
export class RevisionGraphDescendantFocusPersistence {
  private readonly session = new Map<string, RevisionGraphDescendantFocus | undefined>();
  private pending = Promise.resolve();

  constructor(
    private readonly state?: Pick<Memento, 'get' | 'update'>,
    private readonly warn: (message: string, error: unknown) => void = console.warn
  ) {}

  restore(repositoryPath: string | undefined): RevisionGraphDescendantFocus | undefined {
    if (!repositoryPath) { return undefined; }
    const key = this.key(repositoryPath);
    if (!this.session.has(key)) {
      try {
        const value = this.state?.get<unknown>(key);
        this.session.set(key, validateProjectionOptions({ descendantFocus: value })?.descendantFocus ?? undefined);
      } catch (error) {
        this.warn('Could not restore Focus Descendants.', error);
        this.session.set(key, undefined);
      }
    }
    return this.session.get(key);
  }

  save(repositoryPath: string | undefined, focus: RevisionGraphDescendantFocus | undefined): Promise<void> {
    if (!repositoryPath) { return Promise.resolve(); }
    const key = this.key(repositoryPath);
    const value = focus ? { ...focus } : undefined;
    this.session.set(key, value);
    this.pending = this.pending.then(async () => {
      try {
        await this.state?.update(key, value);
      } catch (error) {
        this.warn('Could not persist Focus Descendants.', error);
      }
    });
    return this.pending;
  }

  private key(repositoryPath: string): string {
    const normalized = path.resolve(repositoryPath);
    const identity = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    return `gitRevisionGraph.descendantFocus.v1:${identity}`;
  }
}

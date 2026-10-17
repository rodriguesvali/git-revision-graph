import { randomUUID } from 'node:crypto';
import { createWebviewMessageOrigin, type WebviewMessageOrigin } from '../webviewMessageOrigin';
import type { CompareResultsState } from '../compareResultsShared';

export class CompareResultsReviewSessions {
  private readonly identities = new WeakMap<CompareResultsState, string>();

  idFor(state: CompareResultsState): string | undefined {
    if (state.kind === 'empty') return undefined;
    let identity = this.identities.get(state);
    if (!identity) {
      identity = randomUUID();
      this.identities.set(state, identity);
    }
    return identity;
  }

  originFor(state: CompareResultsState): WebviewMessageOrigin | undefined {
    return createWebviewMessageOrigin(state.kind === 'empty' ? undefined : state.repository.rootUri.fsPath, this.idFor(state));
  }

  preserveWorktreeRefresh(previous: CompareResultsState, next: CompareResultsState): void {
    if (previous.kind !== 'worktree' || next.kind !== 'worktree') return;
    if (previous.repository.rootUri.fsPath !== next.repository.rootUri.fsPath) return;
    if (previous.target.refName !== next.target.refName) return;
    this.identities.set(next, this.idFor(previous)!);
  }
}

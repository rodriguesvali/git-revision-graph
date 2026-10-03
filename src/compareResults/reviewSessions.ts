import type { CompareResultsState } from '../compareResultsShared';

export class CompareResultsReviewSessions {
  private sequence = 0;
  private readonly identities = new WeakMap<CompareResultsState, string>();

  idFor(state: CompareResultsState): string | undefined {
    if (state.kind === 'empty') return undefined;
    let identity = this.identities.get(state);
    if (!identity) {
      identity = JSON.stringify([state.repository.rootUri.fsPath, ++this.sequence]);
      this.identities.set(state, identity);
    }
    return identity;
  }

  preserveWorktreeRefresh(previous: CompareResultsState, next: CompareResultsState): void {
    if (previous.kind !== 'worktree' || next.kind !== 'worktree') return;
    if (previous.repository.rootUri.fsPath !== next.repository.rootUri.fsPath) return;
    if (previous.target.refName !== next.target.refName) return;
    this.identities.set(next, this.idFor(previous)!);
  }
}

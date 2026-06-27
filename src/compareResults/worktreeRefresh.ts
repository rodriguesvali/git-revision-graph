import { getRepositoryRelativeChangePath } from '../changePresentation';
import { Status, type Repository } from '../git';
import {
  applyCompareResultsWorktreeRefresh,
  type CompareResultsState,
  type CompareResultsWorktreeRefreshOutcome
} from '../compareResultsShared';

export interface CompareResultsWorktreeUnifiedDiffRequest {
  readonly repository: Repository;
  readonly refName: string;
  readonly label: string;
  readonly untrackedPaths: readonly string[];
}

export interface CompareResultsWorktreeUnifiedDiffPreparation extends CompareResultsWorktreeRefreshOutcome {
  readonly request: CompareResultsWorktreeUnifiedDiffRequest | undefined;
}

export async function refreshCompareResultsWorktreeComparison(
  state: CompareResultsState,
  repository: Repository,
  refName: string,
  getCurrentState?: () => CompareResultsState
): Promise<CompareResultsWorktreeRefreshOutcome | undefined> {
  const changes = await repository.diffWith(refName);
  if (getCurrentState && getCurrentState() !== state) {
    return undefined;
  }

  return applyCompareResultsWorktreeRefresh(state, repository, refName, changes);
}

export async function prepareCompareResultsWorktreeUnifiedDiff(
  state: Extract<CompareResultsState, { readonly kind: 'worktree' }>,
  getCurrentState: () => CompareResultsState
): Promise<CompareResultsWorktreeUnifiedDiffPreparation | undefined> {
  const outcome = await refreshCompareResultsWorktreeComparison(
    state,
    state.repository,
    state.target.refName,
    getCurrentState
  );
  if (!outcome) {
    return undefined;
  }

  if (outcome.nextState.kind !== 'worktree') {
    return {
      ...outcome,
      request: undefined
    };
  }

  const refreshedState = outcome.nextState;
  return {
    ...outcome,
    request: {
      repository: refreshedState.repository,
      refName: refreshedState.target.refName,
      label: refreshedState.target.label,
      untrackedPaths: refreshedState.changes
        .filter((change) => change.status === Status.UNTRACKED)
        .map((change) => getRepositoryRelativeChangePath(
          refreshedState.repository.rootUri.fsPath,
          change
        ))
    }
  };
}

import type { Repository } from '../git';
import {
  applyCompareResultsWorktreeRefresh,
  type CompareResultsState,
  type CompareResultsWorktreeRefreshOutcome
} from '../compareResultsShared';

export async function refreshCompareResultsWorktreeComparison(
  state: CompareResultsState,
  repository: Repository,
  refName: string
): Promise<CompareResultsWorktreeRefreshOutcome | undefined> {
  const changes = await repository.diffWith(refName);
  return applyCompareResultsWorktreeRefresh(state, repository, refName, changes);
}

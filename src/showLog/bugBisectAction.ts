import type { Repository } from '../git';
import type { ShowLogState } from '../showLogShared';
import { getVisibleShowLogRepository, isLoadedShowLogCommitHash } from './stateLookup';

export async function startShowLogBugBisect(
  state: ShowLogState,
  hash: string,
  sourceToken: string,
  start?: (repository: Repository, hash: string) => Promise<void>
): Promise<void> {
  if (state.kind !== 'visible' || state.sourceToken !== sourceToken) return;
  const repository = getVisibleShowLogRepository(state);
  if (repository && isLoadedShowLogCommitHash(state, hash)) await start?.(repository, hash);
}

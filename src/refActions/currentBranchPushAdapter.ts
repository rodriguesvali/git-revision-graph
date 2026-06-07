import { ForcePushMode, Repository } from '../git';
import { CurrentBranchPushMode } from './types';

export type CurrentBranchAheadReader = (repository: Repository) => Promise<number | undefined>;

export async function pushCurrentBranchWithMode(
  repository: Repository,
  remoteName: string,
  branchName: string,
  mode: CurrentBranchPushMode,
  getCurrentBranchAhead: CurrentBranchAheadReader
): Promise<boolean> {
  if (mode === 'normal') {
    const beforeAhead = await getCurrentBranchAhead(repository);
    await repository.push(remoteName, branchName, false);
    const afterAhead = await getCurrentBranchAhead(repository);
    if (beforeAhead === undefined || afterAhead === undefined) {
      return true;
    }

    return afterAhead < beforeAhead;
  }

  await repository.push(remoteName, branchName, false, getForcePushMode(mode));
  return true;
}

export function getForcePushMode(mode: CurrentBranchPushMode): ForcePushMode | undefined {
  switch (mode) {
    case 'force-with-lease':
      return ForcePushMode.ForceWithLease;
    case 'force':
      return ForcePushMode.Force;
    case 'normal':
      return undefined;
  }
}

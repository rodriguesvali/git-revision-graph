import type { Change, Repository } from '../git';
import type { ShowLogState } from '../showLogShared';

export function getVisibleShowLogRepository(state: ShowLogState): Repository | undefined {
  return state.kind === 'visible' ? state.repository : undefined;
}

export function isLoadedShowLogCommitHash(state: ShowLogState, commitHash: string): boolean {
  return state.kind === 'visible' && state.entries.some((entry) => entry.hash === commitHash);
}

export function findShowLogChange(
  state: ShowLogState,
  commitHash: string,
  changeId: string
): Change | undefined {
  if (!getVisibleShowLogRepository(state)) {
    return undefined;
  }

  if (!isLoadedShowLogCommitHash(state, commitHash)) {
    return undefined;
  }

  const index = parseShowLogChangeIndex(changeId);
  if (index === undefined) {
    return undefined;
  }

  return state.cachedChanges[commitHash]?.[index];
}

export function parseShowLogChangeIndex(changeId: string): number | undefined {
  const match = /^.+:(\d+)$/.exec(changeId);
  if (!match) {
    return undefined;
  }

  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

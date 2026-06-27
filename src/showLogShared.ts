import type { Change, Repository } from './git';
import type { RevisionLogEntry, RevisionLogSource } from './revisionGraphTypes';

export const SHOW_LOG_CACHED_CHANGES_MAX_COMMITS = 50;

export interface ShowLogState {
  readonly kind: 'hidden' | 'visible';
  readonly sourceToken: string;
  readonly repository: Repository | undefined;
  readonly source: RevisionLogSource | undefined;
  readonly showAllBranches: boolean;
  readonly filterText: string;
  readonly entries: readonly RevisionLogEntry[];
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly errorMessage: string | undefined;
  readonly expandedCommitHash: string | undefined;
  readonly loadingCommitHash: string | undefined;
  readonly expandedCommitError: string | undefined;
  readonly cachedChanges: Readonly<Record<string, readonly Change[]>>;
}

export function createHiddenShowLogState(): ShowLogState {
  return {
    kind: 'hidden',
    sourceToken: '',
    repository: undefined,
    source: undefined,
    showAllBranches: false,
    filterText: '',
    entries: [],
    hasMore: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: undefined,
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {}
  };
}

export function isShowLogStateForRepository(
  state: ShowLogState,
  repository: Repository
): boolean {
  return state.repository?.rootUri.fsPath === repository.rootUri.fsPath;
}

export function addShowLogCachedChanges(
  cache: Readonly<Record<string, readonly Change[]>>,
  commitHash: string,
  changes: readonly Change[],
  maxCommits = SHOW_LOG_CACHED_CHANGES_MAX_COMMITS
): Readonly<Record<string, readonly Change[]>> {
  if (maxCommits <= 0) {
    return {};
  }

  const entries = Object.entries(cache)
    .filter(([hash]) => hash !== commitHash);
  entries.push([commitHash, [...changes]]);

  while (entries.length > maxCommits) {
    entries.shift();
  }

  return Object.fromEntries(entries);
}

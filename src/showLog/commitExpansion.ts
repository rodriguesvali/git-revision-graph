import { toOperationError } from '../errorDetail';
import type { ShowLogBackend } from '../revisionGraph/backend';
import { addShowLogCachedChanges, type ShowLogState } from '../showLogShared';
import type { ShowLogExpansionRequests } from './expansionRequests';
import type { ShowLogFileSearch } from './fileSearch';
import { isLoadedShowLogCommitHash } from './stateLookup';

export interface ShowLogCommitExpansionOptions {
  readonly backend: ShowLogBackend;
  readonly requests: ShowLogExpansionRequests;
  readonly fileSearch: ShowLogFileSearch;
  readonly getState: () => ShowLogState;
  readonly applyState: (state: ShowLogState) => void;
}

export async function toggleShowLogCommit(commitHash: string, options: ShowLogCommitExpansionOptions): Promise<void> {
  const state = options.getState();
  if (state.kind !== 'visible' || !isLoadedShowLogCommitHash(state, commitHash)) return;
  options.requests.invalidate();
  options.fileSearch.invalidate();
  const expanding = state.expandedCommitHash !== commitHash;
  options.applyState({ ...state, expandedCommitHash: expanding ? commitHash : undefined,
    loadingCommitHash: undefined, expandedCommitError: undefined, fileFilter: undefined });
  if (!expanding) return;
  const cachedChanges = state.cachedChanges[commitHash];
  if (cachedChanges) {
    options.applyState({ ...options.getState(), cachedChanges: addShowLogCachedChanges(state.cachedChanges, commitHash, cachedChanges) });
    await options.fileSearch.show(commitHash);
    return;
  }
  const entry = state.entries.find(item => item.hash === commitHash);
  const repository = state.repository;
  if (!entry || !repository) return;
  const request = options.requests.start();
  options.applyState({ ...options.getState(), loadingCommitHash: commitHash });
  try {
    const changes = await options.backend.loadRevisionLogChanges(repository, commitHash, entry.parentHashes[0]);
    const current = options.getState();
    if (!options.requests.isCurrent(request) || current.kind !== 'visible') return;
    options.applyState({ ...current, loadingCommitHash: undefined,
      cachedChanges: addShowLogCachedChanges(current.cachedChanges, commitHash, changes) });
    await options.fileSearch.show(commitHash);
  } catch (error) {
    const current = options.getState();
    if (!options.requests.isCurrent(request) || current.kind !== 'visible') return;
    options.applyState({ ...current, loadingCommitHash: undefined,
      expandedCommitError: toOperationError('Could not load the changed files for this commit.', error) });
  }
}

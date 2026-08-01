import { toOperationError } from '../errorDetail';
import { isAbortError } from '../errors';
import type { RevisionGraphLogBackend } from '../revisionGraph/backend';
import type { ShowLogState } from '../showLogShared';
import type { ShowLogLoadRequests } from './loadRequests';

export interface RefreshVisibleShowLogOptions {
  readonly sourceToken: string;
  readonly pageSize: number;
  readonly backend: RevisionGraphLogBackend;
  readonly loadRequests: ShowLogLoadRequests;
  readonly getState: () => ShowLogState;
  readonly applyState: (state: ShowLogState) => void;
}

export async function refreshVisibleShowLog(options: RefreshVisibleShowLogOptions): Promise<void> {
  const initialState = options.getState();
  if (initialState.kind !== 'visible' || initialState.sourceToken !== options.sourceToken) {
    return;
  }

  const repository = initialState.repository;
  const source = initialState.source;
  if (!repository || !source) {
    return;
  }

  const request = options.loadRequests.start();
  const activeRequest = options.loadRequests.activate(request);
  try {
    const result = await options.backend.loadRevisionLog(
      repository,
      source,
      options.pageSize,
      0,
      initialState.showAllBranches,
      initialState.filterText,
      activeRequest.signal
    );
    const currentState = options.getState();
    if (
      !options.loadRequests.isCurrent(activeRequest)
      || currentState.kind !== 'visible'
      || currentState.sourceToken !== options.sourceToken
    ) {
      return;
    }

    options.applyState({
      ...currentState,
      loading: false,
      loadingMore: false,
      entries: [...result.entries],
      hasMore: result.hasMore,
      searchTruncated: result.searchTruncated,
      errorMessage: undefined
    });
  } catch (error) {
    const currentState = options.getState();
    if (!options.loadRequests.isCurrent(activeRequest) || currentState.kind !== 'visible') {
      return;
    }
    if (isAbortError(error)) {
      return;
    }

    options.applyState({
      ...currentState,
      loading: false,
      loadingMore: false,
      errorMessage: toOperationError('Could not refresh Show Log after updating the reference.', error)
    });
  } finally {
    options.loadRequests.finish(activeRequest);
  }
}

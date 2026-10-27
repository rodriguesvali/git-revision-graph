export { isAbortError } from '../errors';
import type { ShowLogState } from '../showLogShared';
import type { RevisionGraphLogBackend } from '../revisionGraph/backend';

export interface ShowLogLoadRequest {
  readonly id: number;
}

export interface ActiveShowLogLoadRequest extends ShowLogLoadRequest {
  readonly abortController: AbortController;
  readonly signal: AbortSignal;
}

export class ShowLogLoadRequests {
  private requestId = 0;
  private activeAbortController: AbortController | undefined;

  start(): ShowLogLoadRequest {
    this.requestId += 1;
    return { id: this.requestId };
  }

  activate(request: ShowLogLoadRequest): ActiveShowLogLoadRequest {
    this.cancelActive();
    const abortController = new AbortController();
    this.activeAbortController = abortController;
    return {
      ...request,
      abortController,
      signal: abortController.signal
    };
  }

  isCurrent(request: ShowLogLoadRequest): boolean {
    return request.id === this.requestId;
  }

  finish(request: ActiveShowLogLoadRequest): void {
    if (this.activeAbortController === request.abortController) {
      this.activeAbortController = undefined;
    }
  }

  invalidateAndCancel(): void {
    this.requestId += 1;
    this.cancelActive();
  }

  cancelActive(): void {
    this.activeAbortController?.abort();
    this.activeAbortController = undefined;
  }
}

export function replaceLoadedShowLogEntries(state: ShowLogState, result: Awaited<ReturnType<RevisionGraphLogBackend['loadRevisionLog']>>): ShowLogState {
  return {
    ...state,
    loading: false,
    entries: [...result.entries],
    hasMore: result.hasMore,
    searchTruncated: result.searchTruncated
  };
}

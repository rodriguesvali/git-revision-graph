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

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

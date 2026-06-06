export interface ShowLogExpansionRequest {
  readonly id: number;
}

export class ShowLogExpansionRequests {
  private requestId = 0;

  start(): ShowLogExpansionRequest {
    this.requestId += 1;
    return { id: this.requestId };
  }

  isCurrent(request: ShowLogExpansionRequest): boolean {
    return request.id === this.requestId;
  }

  invalidate(): void {
    this.requestId += 1;
  }
}

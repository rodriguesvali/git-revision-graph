export class RevisionGraphRenderCoordinator<TResult> {
  private pendingRender = false;
  private drainPromise: Promise<void> | undefined;
  private latestRequestedId = 0;
  private latestLoadingLabel = '';
  private latestBuild: ((requestId: number, signal: AbortSignal) => Promise<TResult | undefined>) | undefined;
  private activeAbortController: AbortController | undefined;

  constructor(
    private readonly onLoading: (label: string) => void,
    private readonly onResult: (result: TResult) => void,
    private readonly onError: (error: unknown) => void
  ) {}

  async schedule(
    loadingLabel: string,
    build: (requestId: number, signal: AbortSignal) => Promise<TResult | undefined>
  ): Promise<void> {
    this.pendingRender = true;
    this.latestRequestedId += 1;
    this.latestLoadingLabel = loadingLabel;
    this.latestBuild = build;
    this.activeAbortController?.abort();
    if (!this.drainPromise) {
      this.drainPromise = this.drain()
        .finally(() => {
          this.drainPromise = undefined;
        });
    }

    await this.drainPromise;
  }

  getCurrentRequestId(): number {
    return this.latestRequestedId;
  }

  cancel(): void {
    this.pendingRender = false;
    this.latestBuild = undefined;
    this.activeAbortController?.abort();
  }

  private async drain(): Promise<void> {
    while (this.pendingRender) {
      this.pendingRender = false;
      const build = this.latestBuild;
      const requestId = this.latestRequestedId;
      if (!build) {
        continue;
      }

      this.onLoading(this.latestLoadingLabel);
      const abortController = new AbortController();
      this.activeAbortController = abortController;

      try {
        const result = await build(requestId, abortController.signal);
        if (result === undefined || requestId !== this.latestRequestedId) {
          continue;
        }

        this.onResult(result);
      } catch (error) {
        if (requestId !== this.latestRequestedId || isAbortError(error)) {
          continue;
        }

        this.onError(error);
      } finally {
        if (this.activeAbortController === abortController) {
          this.activeAbortController = undefined;
        }
      }
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

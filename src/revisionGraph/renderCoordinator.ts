export class RevisionGraphRenderCoordinator<TResult> {
  private pendingRender = false;
  private drainPromise: Promise<void> | undefined;
  private latestRequestedId = 0;
  private latestLoadingLabel = '';
  private latestBuild: ((requestId: number) => Promise<TResult | undefined>) | undefined;

  constructor(
    private readonly onLoading: (label: string) => void,
    private readonly onResult: (result: TResult) => void,
    private readonly onError: (error: unknown) => void
  ) {}

  async schedule(
    loadingLabel: string,
    build: (requestId: number) => Promise<TResult | undefined>
  ): Promise<void> {
    this.pendingRender = true;
    this.latestRequestedId += 1;
    this.latestLoadingLabel = loadingLabel;
    this.latestBuild = build;
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

  private async drain(): Promise<void> {
    while (this.pendingRender) {
      this.pendingRender = false;
      const build = this.latestBuild;
      const requestId = this.latestRequestedId;
      if (!build) {
        continue;
      }

      this.onLoading(this.latestLoadingLabel);

      try {
        const result = await build(requestId);
        if (result === undefined || requestId !== this.latestRequestedId) {
          continue;
        }

        this.onResult(result);
      } catch (error) {
        if (requestId !== this.latestRequestedId) {
          continue;
        }

        this.onError(error);
      }
    }
  }
}

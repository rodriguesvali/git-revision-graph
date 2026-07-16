export const FLOW_REMOTE_FETCH_LOADING_LABEL = 'Fetching remotes...';

export interface FlowRemoteFetchLoadingHost {
  postActionLoading(label: string): void;
  postCurrentState(): void;
}

export async function withFlowRemoteFetchLoading<T>(
  host: FlowRemoteFetchLoadingHost,
  operation: () => Promise<T>
): Promise<T> {
  host.postActionLoading(FLOW_REMOTE_FETCH_LOADING_LABEL);
  try {
    return await operation();
  } finally {
    host.postCurrentState();
  }
}

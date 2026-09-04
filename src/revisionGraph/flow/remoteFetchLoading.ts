import type { RefActionServices } from '../../refActions';
import { runWithRefActionProgress } from '../../refActions/shared';

export const FLOW_REMOTE_FETCH_LOADING_LABEL = 'Fetching remotes...';

export async function withFlowRemoteFetchLoading<T>(
  services: Pick<RefActionServices, 'progress'>,
  operation: () => Promise<T>
): Promise<T> {
  return runWithRefActionProgress(
    services,
    FLOW_REMOTE_FETCH_LOADING_LABEL,
    'blocking',
    operation
  );
}

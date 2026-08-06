import type {
  D3DagSugiyamaEdgeRoute,
  D3DagSugiyamaLayoutInput,
  D3DagSugiyamaLayoutPosition,
  D3DagSugiyamaLayoutProfile
} from './d3DagSugiyamaLayout';

export interface D3DagSugiyamaLayoutWorkerRequest {
  readonly type: 'calculate';
  readonly requestId: number;
  readonly projection: D3DagSugiyamaLayoutInput;
}

export interface D3DagSugiyamaLayoutWorkerSuccessMessage {
  readonly type: 'result';
  readonly requestId: number;
  readonly positions: readonly [string, D3DagSugiyamaLayoutPosition][];
  readonly edgeRoutes?: readonly [string, D3DagSugiyamaEdgeRoute][];
  readonly profile: D3DagSugiyamaLayoutProfile;
}

export interface D3DagSugiyamaLayoutWorkerErrorMessage {
  readonly type: 'error';
  readonly requestId: number;
  readonly message: string;
  readonly stack?: string;
}

export type D3DagSugiyamaLayoutWorkerMessage =
  | D3DagSugiyamaLayoutWorkerSuccessMessage
  | D3DagSugiyamaLayoutWorkerErrorMessage;

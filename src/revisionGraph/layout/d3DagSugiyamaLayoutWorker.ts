import { parentPort } from 'node:worker_threads';

import { calculateD3DagSugiyamaLayout } from './d3DagSugiyamaLayout';
import type { D3DagSugiyamaLayoutWorkerRequest } from './d3DagSugiyamaLayoutWorkerProtocol';

if (!parentPort) {
  throw new Error('The d3-dag layout worker requires a parent port.');
}
const layoutWorkerParentPort = parentPort;

layoutWorkerParentPort.on('message', (request: D3DagSugiyamaLayoutWorkerRequest) => {
  if (request.type !== 'calculate') {
    return;
  }

  try {
    const result = calculateD3DagSugiyamaLayout(request.projection);
    layoutWorkerParentPort.postMessage({
      type: 'result',
      requestId: request.requestId,
      positions: [...result.positions.entries()],
      edgeRoutes: [...result.edgeRoutes.entries()],
      profile: result.profile
    });
  } catch (error) {
    layoutWorkerParentPort.postMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

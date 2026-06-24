import { parentPort, workerData } from 'node:worker_threads';

import {
  calculateD3DagSugiyamaLayout,
  D3DagSugiyamaLayoutInput
} from './d3DagSugiyamaLayout';

try {
  const result = calculateD3DagSugiyamaLayout(workerData as D3DagSugiyamaLayoutInput);
  parentPort?.postMessage({
    type: 'result',
    positions: [...result.positions.entries()],
    edgeRoutes: [...result.edgeRoutes.entries()],
    profile: result.profile
  });
} catch (error) {
  parentPort?.postMessage({
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}

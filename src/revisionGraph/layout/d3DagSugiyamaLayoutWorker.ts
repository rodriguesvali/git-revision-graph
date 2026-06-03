import { parentPort, workerData } from 'node:worker_threads';

import {
  calculateD3DagSugiyamaLayout,
  D3DagSugiyamaLayoutInput
} from './d3DagSugiyamaLayout';

try {
  const positions = calculateD3DagSugiyamaLayout(workerData as D3DagSugiyamaLayoutInput);
  parentPort?.postMessage({
    type: 'result',
    positions: [...positions.entries()]
  });
} catch (error) {
  parentPort?.postMessage({
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}

import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import {
  D3DagSugiyamaLayoutInput,
  D3DagSugiyamaLayoutPosition
} from './d3DagSugiyamaLayout';

interface D3DagSugiyamaLayoutWorkerSuccessMessage {
  readonly type: 'result';
  readonly positions: readonly [string, D3DagSugiyamaLayoutPosition][];
}

interface D3DagSugiyamaLayoutWorkerErrorMessage {
  readonly type: 'error';
  readonly message: string;
  readonly stack?: string;
}

type D3DagSugiyamaLayoutWorkerMessage =
  | D3DagSugiyamaLayoutWorkerSuccessMessage
  | D3DagSugiyamaLayoutWorkerErrorMessage;

export async function calculateD3DagSugiyamaLayoutInWorker(
  projection: D3DagSugiyamaLayoutInput,
  signal?: AbortSignal
): Promise<Map<string, D3DagSugiyamaLayoutPosition>> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(join(__dirname, 'd3DagSugiyamaLayoutWorker.js'), {
      workerData: projection
    });

    const settle = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      signal?.removeEventListener('abort', abort);
      worker.removeAllListeners();
      callback();
    };

    function abort(): void {
      void worker.terminate();
      settle(() => reject(createAbortError()));
    }

    signal?.addEventListener('abort', abort, { once: true });

    worker.once('message', (message: D3DagSugiyamaLayoutWorkerMessage) => {
      settle(() => {
        if (message.type === 'result') {
          resolve(new Map(message.positions));
          return;
        }

        reject(createWorkerError(message));
      });
    });
    worker.once('error', (error) => {
      settle(() => reject(error));
    });
    worker.once('exit', (code) => {
      if (code !== 0) {
        settle(() => reject(new Error(`d3-dag layout worker exited with code ${code}.`)));
      }
    });
  });
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function createAbortError(): Error {
  const error = new Error('The d3-dag layout worker was aborted.');
  error.name = 'AbortError';
  return error;
}

function createWorkerError(message: D3DagSugiyamaLayoutWorkerErrorMessage): Error {
  const error = new Error(message.message);
  if (message.stack) {
    error.stack = message.stack;
  }

  return error;
}

import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { createAbortError, throwIfAborted } from '../../errors';
import {
  D3DagSugiyamaEdgeRoute,
  D3DagSugiyamaLayoutInput,
  D3DagSugiyamaLayoutPosition,
  D3DagSugiyamaLayoutProfile,
  D3DagSugiyamaLayoutResult
} from './d3DagSugiyamaLayout';

interface D3DagSugiyamaLayoutWorkerSuccessMessage {
  readonly type: 'result';
  readonly positions: readonly [string, D3DagSugiyamaLayoutPosition][];
  readonly edgeRoutes?: readonly [string, D3DagSugiyamaEdgeRoute][];
  readonly profile: D3DagSugiyamaLayoutProfile;
}

interface D3DagSugiyamaLayoutWorkerErrorMessage {
  readonly type: 'error';
  readonly message: string;
  readonly stack?: string;
}

type D3DagSugiyamaLayoutWorkerMessage =
  | D3DagSugiyamaLayoutWorkerSuccessMessage
  | D3DagSugiyamaLayoutWorkerErrorMessage;

const DEFAULT_LAYOUT_WORKER_TIMEOUT_MS = 30_000;

export interface D3DagSugiyamaLayoutWorkerLike {
  once(event: 'message', listener: (message: D3DagSugiyamaLayoutWorkerMessage) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: 'exit', listener: (code: number) => void): this;
  removeAllListeners(): this;
  terminate(): Promise<number>;
}

export type D3DagSugiyamaLayoutWorkerFactory = (
  projection: D3DagSugiyamaLayoutInput
) => D3DagSugiyamaLayoutWorkerLike;

export async function calculateD3DagSugiyamaLayoutInWorker(
  projection: D3DagSugiyamaLayoutInput,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_LAYOUT_WORKER_TIMEOUT_MS,
  createWorker: D3DagSugiyamaLayoutWorkerFactory = createDefaultWorker
): Promise<D3DagSugiyamaLayoutResult> {
  throwIfAborted(signal, 'The d3-dag layout worker was aborted.');

  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = createWorker(projection);
    let timeout: NodeJS.Timeout | undefined;

    const settle = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      signal?.removeEventListener('abort', abort);
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      worker.removeAllListeners();
      callback();
    };

    function abort(): void {
      void worker.terminate();
      settle(() => reject(createAbortError('The d3-dag layout worker was aborted.')));
    }

    signal?.addEventListener('abort', abort, { once: true });
    timeout = setTimeout(() => {
      void worker.terminate();
      const error = new Error(`The d3-dag layout worker exceeded the timeout of ${timeoutMs} ms.`);
      error.name = 'TimeoutError';
      settle(() => reject(error));
    }, timeoutMs);

    worker.once('message', (message: D3DagSugiyamaLayoutWorkerMessage) => {
      settle(() => {
        if (message.type === 'result') {
          resolve({
            positions: new Map(message.positions),
            edgeRoutes: new Map(message.edgeRoutes ?? []),
            profile: message.profile
          });
          return;
        }

        reject(createWorkerError(message));
      });
    });
    worker.once('error', (error) => {
      settle(() => reject(error));
    });
    worker.once('exit', (code) => {
      settle(() => reject(new Error(
        code === 0
          ? 'd3-dag layout worker exited without returning a result.'
          : `d3-dag layout worker exited with code ${code}.`
      )));
    });
  });
}

function createDefaultWorker(projection: D3DagSugiyamaLayoutInput): D3DagSugiyamaLayoutWorkerLike {
  return new Worker(join(__dirname, 'd3DagSugiyamaLayoutWorker.js'), {
    workerData: projection
  });
}

function createWorkerError(message: D3DagSugiyamaLayoutWorkerErrorMessage): Error {
  const error = new Error(message.message);
  if (message.stack) {
    error.stack = message.stack;
  }

  return error;
}

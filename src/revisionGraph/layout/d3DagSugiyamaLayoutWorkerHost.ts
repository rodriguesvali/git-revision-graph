import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { createAbortError, throwIfAborted } from '../../errors';
import {
  D3DagSugiyamaLayoutInput,
  D3DagSugiyamaLayoutResult
} from './d3DagSugiyamaLayout';
import type {
  D3DagSugiyamaLayoutWorkerErrorMessage,
  D3DagSugiyamaLayoutWorkerMessage,
  D3DagSugiyamaLayoutWorkerRequest
} from './d3DagSugiyamaLayoutWorkerProtocol';

const DEFAULT_LAYOUT_WORKER_TIMEOUT_MS = 30_000;

export interface D3DagSugiyamaLayoutWorkerLike {
  on(event: 'message', listener: (message: D3DagSugiyamaLayoutWorkerMessage) => void): this;
  on(event: 'messageerror', listener: (error: Error) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'exit', listener: (code: number) => void): this;
  off(event: 'message', listener: (message: D3DagSugiyamaLayoutWorkerMessage) => void): this;
  off(event: 'messageerror', listener: (error: Error) => void): this;
  off(event: 'error', listener: (error: Error) => void): this;
  off(event: 'exit', listener: (code: number) => void): this;
  postMessage(request: D3DagSugiyamaLayoutWorkerRequest): void;
  ref(): void;
  unref(): void;
  terminate(): Promise<number>;
}

export type D3DagSugiyamaLayoutWorkerFactory = () => D3DagSugiyamaLayoutWorkerLike;

interface IdleLayoutWorker {
  readonly worker: D3DagSugiyamaLayoutWorkerLike;
  readonly errorListener: (error: Error) => void;
  readonly exitListener: (code: number) => void;
}

interface ActiveLayoutWorkerRequest {
  cancel(error: Error): void;
}

export class D3DagSugiyamaLayoutWorkerHost {
  private idleWorker: IdleLayoutWorker | undefined;
  private readonly activeRequests = new Set<ActiveLayoutWorkerRequest>();
  private nextRequestId = 1;
  private disposed = false;

  constructor(
    private readonly createWorker: D3DagSugiyamaLayoutWorkerFactory = createDefaultWorker,
    private readonly retainIdleWorker = true
  ) {}

  async calculate(
    projection: D3DagSugiyamaLayoutInput,
    signal?: AbortSignal,
    timeoutMs = DEFAULT_LAYOUT_WORKER_TIMEOUT_MS
  ): Promise<D3DagSugiyamaLayoutResult> {
    if (this.disposed) {
      throw createAbortError('The d3-dag layout worker host was disposed.');
    }
    throwIfAborted(signal, 'The d3-dag layout worker was aborted.');

    const worker = this.acquireWorker();
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const settle = (
        callback: () => void,
        reusable: boolean,
        terminate = !reusable
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        signal?.removeEventListener('abort', abort);
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        worker.off('message', onMessage);
        worker.off('messageerror', onMessageError);
        worker.off('error', onError);
        worker.off('exit', onExit);
        this.activeRequests.delete(activeRequest);
        if (reusable) {
          this.releaseWorker(worker);
        } else if (terminate) {
          void worker.terminate();
        }
        callback();
      };

      const activeRequest: ActiveLayoutWorkerRequest = {
        cancel: (error) => settle(() => reject(error), false)
      };
      const abort = (): void => activeRequest.cancel(
        createAbortError('The d3-dag layout worker was aborted.')
      );
      const onMessage = (message: D3DagSugiyamaLayoutWorkerMessage): void => {
        if (message.requestId !== requestId) {
          return;
        }
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
        }, true);
      };
      const onMessageError = (error: Error): void => settle(() => reject(error), false);
      const onError = (error: Error): void => settle(() => reject(error), false, false);
      const onExit = (code: number): void => settle(() => reject(new Error(
        code === 0
          ? 'd3-dag layout worker exited without returning a result.'
          : `d3-dag layout worker exited with code ${code}.`
      )), false, false);

      this.activeRequests.add(activeRequest);
      signal?.addEventListener('abort', abort, { once: true });
      timeout = setTimeout(() => {
        const error = new Error(`The d3-dag layout worker exceeded the timeout of ${timeoutMs} ms.`);
        error.name = 'TimeoutError';
        activeRequest.cancel(error);
      }, timeoutMs);
      worker.on('message', onMessage);
      worker.on('messageerror', onMessageError);
      worker.on('error', onError);
      worker.on('exit', onExit);

      if (signal?.aborted) {
        abort();
        return;
      }

      try {
        worker.postMessage({ type: 'calculate', requestId, projection });
      } catch (error) {
        settle(() => reject(error), false);
      }
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const idleWorker = this.takeIdleWorker();
    if (idleWorker) {
      void idleWorker.terminate();
    }
    for (const request of [...this.activeRequests]) {
      request.cancel(createAbortError('The d3-dag layout worker host was disposed.'));
    }
  }

  private acquireWorker(): D3DagSugiyamaLayoutWorkerLike {
    return this.takeIdleWorker() ?? this.createWorker();
  }

  private takeIdleWorker(): D3DagSugiyamaLayoutWorkerLike | undefined {
    const idle = this.idleWorker;
    if (!idle) {
      return undefined;
    }
    this.idleWorker = undefined;
    idle.worker.off('error', idle.errorListener);
    idle.worker.off('exit', idle.exitListener);
    idle.worker.ref();
    return idle.worker;
  }

  private releaseWorker(worker: D3DagSugiyamaLayoutWorkerLike): void {
    if (this.disposed || !this.retainIdleWorker || this.idleWorker) {
      void worker.terminate();
      return;
    }

    const discardIdleWorker = (): void => {
      if (this.idleWorker?.worker === worker) {
        this.idleWorker = undefined;
      }
    };
    this.idleWorker = {
      worker,
      errorListener: discardIdleWorker,
      exitListener: discardIdleWorker
    };
    worker.on('error', discardIdleWorker);
    worker.on('exit', discardIdleWorker);
    worker.unref();
  }
}

let defaultLayoutWorkerHost = new D3DagSugiyamaLayoutWorkerHost();

export async function calculateD3DagSugiyamaLayoutInWorker(
  projection: D3DagSugiyamaLayoutInput,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_LAYOUT_WORKER_TIMEOUT_MS,
  createWorker?: D3DagSugiyamaLayoutWorkerFactory
): Promise<D3DagSugiyamaLayoutResult> {
  if (!createWorker) {
    return defaultLayoutWorkerHost.calculate(projection, signal, timeoutMs);
  }

  const host = new D3DagSugiyamaLayoutWorkerHost(createWorker, false);
  try {
    return await host.calculate(projection, signal, timeoutMs);
  } finally {
    host.dispose();
  }
}

export function disposeD3DagSugiyamaLayoutWorkerHost(): void {
  defaultLayoutWorkerHost.dispose();
  defaultLayoutWorkerHost = new D3DagSugiyamaLayoutWorkerHost();
}

function createDefaultWorker(): D3DagSugiyamaLayoutWorkerLike {
  return new Worker(join(__dirname, 'd3DagSugiyamaLayoutWorker.js'), {
    // d3-dag 1.2.1 loads a bundled web-worker shim that destructures workerData in worker threads.
    workerData: {}
  });
}

function createWorkerError(message: D3DagSugiyamaLayoutWorkerErrorMessage): Error {
  const error = new Error(message.message);
  if (message.stack) {
    error.stack = message.stack;
  }
  return error;
}

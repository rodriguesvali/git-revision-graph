import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
  calculateD3DagSugiyamaLayoutInWorker,
  type D3DagSugiyamaLayoutWorkerLike
} from '../src/revisionGraph/layout/d3DagSugiyamaLayoutWorkerHost';

const EMPTY_PROJECTION = { nodes: [], edges: [] };

class FakeLayoutWorker extends EventEmitter implements D3DagSugiyamaLayoutWorkerLike {
  terminated = false;

  async terminate(): Promise<number> {
    this.terminated = true;
    return 0;
  }
}

test('layout worker host rejects a clean exit without a result', async () => {
  const worker = new FakeLayoutWorker();
  const result = calculateD3DagSugiyamaLayoutInWorker(
    EMPTY_PROJECTION,
    undefined,
    1_000,
    () => worker
  );
  queueMicrotask(() => worker.emit('exit', 0));

  await assert.rejects(result, /exited without returning a result/);
});

test('layout worker host times out and terminates a silent worker', async () => {
  const worker = new FakeLayoutWorker();
  await assert.rejects(
    calculateD3DagSugiyamaLayoutInWorker(
      EMPTY_PROJECTION,
      undefined,
      10,
      () => worker
    ),
    (error: unknown) => error instanceof Error && error.name === 'TimeoutError'
  );
  assert.equal(worker.terminated, true);
});

test('layout worker host aborts and terminates an active worker', async () => {
  const worker = new FakeLayoutWorker();
  const controller = new AbortController();
  const result = calculateD3DagSugiyamaLayoutInWorker(
    EMPTY_PROJECTION,
    controller.signal,
    1_000,
    () => worker
  );
  controller.abort();

  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(worker.terminated, true);
});

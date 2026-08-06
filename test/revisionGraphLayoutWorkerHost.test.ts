import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
  calculateD3DagSugiyamaLayoutInWorker,
  D3DagSugiyamaLayoutWorkerHost,
  type D3DagSugiyamaLayoutWorkerLike
} from '../src/revisionGraph/layout/d3DagSugiyamaLayoutWorkerHost';
import type { D3DagSugiyamaLayoutWorkerRequest } from '../src/revisionGraph/layout/d3DagSugiyamaLayoutWorkerProtocol';

const EMPTY_PROJECTION = { nodes: [], edges: [] };

class FakeLayoutWorker extends EventEmitter implements D3DagSugiyamaLayoutWorkerLike {
  terminated = false;
  readonly requests: D3DagSugiyamaLayoutWorkerRequest[] = [];

  constructor(
    private readonly respond?: (
      request: D3DagSugiyamaLayoutWorkerRequest,
      worker: FakeLayoutWorker
    ) => void
  ) {
    super();
  }

  postMessage(request: D3DagSugiyamaLayoutWorkerRequest): void {
    this.requests.push(request);
    this.respond?.(request, this);
  }

  ref(): void {}

  unref(): void {}

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

test('layout worker host reuses one idle worker for sequential cache misses', async () => {
  const workers: FakeLayoutWorker[] = [];
  const host = new D3DagSugiyamaLayoutWorkerHost(() => {
    const worker = new FakeLayoutWorker((request, activeWorker) => {
      queueMicrotask(() => activeWorker.emit('message', {
        type: 'result',
        requestId: request.requestId,
        positions: [],
        edgeRoutes: [],
        profile: 'balanced'
      }));
    });
    workers.push(worker);
    return worker;
  });

  await host.calculate(EMPTY_PROJECTION);
  await host.calculate(EMPTY_PROJECTION);

  assert.equal(workers.length, 1);
  assert.equal(workers[0].requests.length, 2);
  assert.ok(workers[0].requests[1].requestId > workers[0].requests[0].requestId);
  assert.equal(workers[0].terminated, false);

  host.dispose();
  assert.equal(workers[0].terminated, true);
});

test('layout worker host preserves concurrent execution and bounds idle retention', async () => {
  const workers: FakeLayoutWorker[] = [];
  const host = new D3DagSugiyamaLayoutWorkerHost(() => {
    const worker = new FakeLayoutWorker();
    workers.push(worker);
    return worker;
  });

  const first = host.calculate(EMPTY_PROJECTION);
  const second = host.calculate(EMPTY_PROJECTION);
  assert.equal(workers.length, 2);

  for (const worker of workers) {
    worker.emit('message', {
      type: 'result',
      requestId: worker.requests[0].requestId,
      positions: [],
      edgeRoutes: [],
      profile: 'balanced'
    });
  }
  await Promise.all([first, second]);

  assert.equal(workers.filter((worker) => worker.terminated).length, 1);
  const retainedWorker = workers.find((worker) => !worker.terminated);
  assert.ok(retainedWorker);
  const third = host.calculate(EMPTY_PROJECTION);
  assert.equal(workers.length, 2);
  retainedWorker.emit('message', {
    type: 'result',
    requestId: retainedWorker.requests[1].requestId,
    positions: [],
    edgeRoutes: [],
    profile: 'balanced'
  });
  await third;
  host.dispose();
});

test('layout worker host ignores messages owned by another request', async () => {
  const worker = new FakeLayoutWorker();
  const host = new D3DagSugiyamaLayoutWorkerHost(() => worker);
  const result = host.calculate(EMPTY_PROJECTION);
  const requestId = worker.requests[0].requestId;

  worker.emit('message', {
    type: 'result',
    requestId: requestId + 1,
    positions: [['stale', { x: 1, y: 1 }]],
    profile: 'balanced'
  });
  worker.emit('message', {
    type: 'result',
    requestId,
    positions: [['current', { x: 2, y: 2 }]],
    profile: 'balanced'
  });

  assert.deepEqual([...(await result).positions.keys()], ['current']);
  host.dispose();
});

test('layout worker host disposal aborts and terminates active work', async () => {
  const worker = new FakeLayoutWorker();
  const host = new D3DagSugiyamaLayoutWorkerHost(() => worker);
  const result = host.calculate(EMPTY_PROJECTION);

  host.dispose();

  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(worker.terminated, true);
  await assert.rejects(host.calculate(EMPTY_PROJECTION), { name: 'AbortError' });
});

test('layout worker host discards a timed-out worker before recovering', async () => {
  const workers: FakeLayoutWorker[] = [];
  const host = new D3DagSugiyamaLayoutWorkerHost(() => {
    const worker = new FakeLayoutWorker();
    workers.push(worker);
    return worker;
  });

  await assert.rejects(
    host.calculate(EMPTY_PROJECTION, undefined, 5),
    (error: unknown) => error instanceof Error && error.name === 'TimeoutError'
  );
  assert.equal(workers[0].terminated, true);

  const recovered = host.calculate(EMPTY_PROJECTION);
  assert.equal(workers.length, 2);
  workers[1].emit('message', {
    type: 'result',
    requestId: workers[1].requests[0].requestId,
    positions: [],
    edgeRoutes: [],
    profile: 'balanced'
  });
  await recovered;
  host.dispose();
});

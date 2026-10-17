import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphRenderCoordinator } from '../src/revisionGraph/renderCoordinator';

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
} {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: unknown) => void;
  return {
    promise: new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    resolve(value: T) {
      resolvePromise(value);
    },
    reject(error: unknown) {
      rejectPromise(error);
    }
  };
}

test('discards obsolete render results when a newer request supersedes them', async () => {
  const loadingLabels: string[] = [];
  const appliedResults: string[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    (label) => loadingLabels.push(label),
    (result) => appliedResults.push(result),
    () => assert.fail('did not expect an error')
  );
  const first = createDeferred<string>();
  const second = createDeferred<string>();
  let callCount = 0;

  const firstSchedule = coordinator.schedule('Loading revision graph...', async () => {
    callCount += 1;
    return callCount === 1 ? first.promise : second.promise;
  });
  const secondSchedule = coordinator.schedule('Loading revision graph...', async () => {
    callCount += 1;
    return callCount === 1 ? first.promise : second.promise;
  });

  first.resolve('stale');
  await Promise.resolve();
  second.resolve('fresh');
  const [firstOutcome, secondOutcome] = await Promise.all([firstSchedule, secondSchedule]);

  assert.deepEqual(appliedResults, ['fresh']);
  assert.equal(loadingLabels.length, 2);
  assert.equal(firstOutcome, 'discarded');
  assert.equal(secondOutcome, 'applied');
});

test('coalesces bursts into one follow-up render while one is already in flight', async () => {
  const appliedResults: string[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {},
    (result) => appliedResults.push(result),
    () => assert.fail('did not expect an error')
  );
  const first = createDeferred<string>();
  const second = createDeferred<string>();
  let invocation = 0;

  const scheduleA = coordinator.schedule('Loading revision graph...', async () => {
    invocation += 1;
    return invocation === 1 ? first.promise : second.promise;
  });
  const scheduleB = coordinator.schedule('Loading revision graph...', async () => {
    invocation += 1;
    return invocation === 1 ? first.promise : second.promise;
  });
  const scheduleC = coordinator.schedule('Loading revision graph...', async () => {
    invocation += 1;
    return invocation === 1 ? first.promise : second.promise;
  });

  first.resolve('first');
  await Promise.resolve();
  second.resolve('second');
  const [outcomeA, outcomeB, outcomeC] = await Promise.all([scheduleA, scheduleB, scheduleC]);

  assert.deepEqual(appliedResults, ['second']);
  assert.equal(invocation, 2);
  assert.equal(outcomeA, 'discarded');
  assert.equal(outcomeB, 'discarded');
  assert.equal(outcomeC, 'applied');
});

test('aborts the in-flight render when a newer request arrives', async () => {
  const appliedResults: string[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {},
    (result) => appliedResults.push(result),
    () => assert.fail('did not expect an error')
  );
  let firstSignal: AbortSignal | undefined;

  const firstSchedule = coordinator.schedule('Loading revision graph...', async (_requestId, signal) => {
    firstSignal = signal;
    await new Promise<void>((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        },
        { once: true }
      );
    });
    return 'stale';
  });
  const secondSchedule = coordinator.schedule('Loading revision graph...', async () => 'fresh');

  const [firstOutcome, secondOutcome] = await Promise.all([firstSchedule, secondSchedule]);

  assert.equal(firstSignal?.aborted, true);
  assert.deepEqual(appliedResults, ['fresh']);
  assert.equal(firstOutcome, 'discarded');
  assert.equal(secondOutcome, 'applied');
});

test('reports failed when the latest render throws', async () => {
  const appliedResults: string[] = [];
  const receivedErrors: unknown[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {},
    (result) => appliedResults.push(result),
    (error) => receivedErrors.push(error)
  );

  const outcome = await coordinator.schedule('Loading revision graph...', async () => {
    throw new Error('boom');
  });

  assert.equal(outcome, 'failed');
  assert.deepEqual(appliedResults, []);
  assert.equal(receivedErrors.length, 1);
});

test('treats undefined render results as discarded', async () => {
  const appliedResults: string[] = [];
  const receivedErrors: unknown[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {},
    (result) => appliedResults.push(result),
    (error) => receivedErrors.push(error)
  );

  const outcome = await coordinator.schedule('Loading revision graph...', async () => undefined);

  assert.equal(outcome, 'discarded');
  assert.deepEqual(appliedResults, []);
  assert.deepEqual(receivedErrors, []);
});

for (const completion of ['resolve', 'reject'] as const) {
  test(`discards a noncooperative render that ${completion}s after cancellation and allows later work`, async () => {
    const applied: string[] = [];
    const errors: unknown[] = [];
    const coordinator = new RevisionGraphRenderCoordinator<string>(
      () => {}, (result) => applied.push(result), (error) => errors.push(error)
    );
    const pending = createDeferred<string>();
    let signal: AbortSignal | undefined;
    const scheduled = coordinator.schedule('Old render', async (_requestId, abortSignal) => {
      signal = abortSignal;
      return pending.promise;
    });
    const cancelledId = coordinator.getCurrentRequestId();
    coordinator.cancel();
    if (completion === 'resolve') pending.resolve('cancelled result');
    else pending.reject(new Error('late ordinary failure'));

    assert.equal(await scheduled, 'discarded');
    assert.deepEqual(applied, []);
    assert.deepEqual(errors, []);
    assert.equal(signal?.aborted, true);
    assert.ok(coordinator.getCurrentRequestId() > cancelledId);

    assert.equal(await coordinator.schedule('Fresh render', async () => 'fresh'), 'applied');
    assert.deepEqual(applied, ['fresh']);
    assert.deepEqual(errors, []);
  });
}

test('cancellation discards the active render and removes its queued replacement', async () => {
  const applied: string[] = [];
  const builds: string[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {}, (result) => applied.push(result), () => assert.fail('cancelled error')
  );
  const pending = createDeferred<string>();
  const active = coordinator.schedule('Active', async () => {
    builds.push('active');
    return pending.promise;
  });
  const queued = coordinator.schedule('Queued', async () => {
    builds.push('queued');
    return 'queued';
  });
  coordinator.cancel();
  coordinator.cancel();
  pending.resolve('old');

  assert.deepEqual(await Promise.all([active, queued]), ['discarded', 'discarded']);
  assert.deepEqual(applied, []);
  assert.deepEqual(builds, ['active']);
  assert.equal(await coordinator.schedule('Fresh', async () => 'fresh'), 'applied');
  assert.deepEqual(applied, ['fresh']);
});

for (const completion of ['resolve', 'reject'] as const) {
  test(`runs a new request queued after cancel before the old producer ${completion}s`, async () => {
    const applied: string[] = [];
    const labels: string[] = [];
    const coordinator = new RevisionGraphRenderCoordinator<string>(
      (label) => labels.push(label), (result) => applied.push(result), () => assert.fail('cancelled error')
    );
    const pending = createDeferred<string>();
    const old = coordinator.schedule('Old', async () => pending.promise);
    coordinator.cancel();
    let freshSignal: AbortSignal | undefined;
    const fresh = coordinator.schedule('Fresh', async (_requestId, signal) => {
      freshSignal = signal;
      return 'fresh';
    });
    if (completion === 'resolve') pending.resolve('old');
    else pending.reject(new Error('late ordinary failure'));

    assert.deepEqual(await Promise.all([old, fresh]), ['discarded', 'applied']);
    assert.deepEqual(applied, ['fresh']);
    assert.deepEqual(labels, ['Old', 'Fresh']);
    assert.equal(freshSignal?.aborted, false);
  });
}

test('cancellation preserves a fresh request scheduled synchronously by an abort listener', async () => {
  const applied: string[] = [];
  const coordinator = new RevisionGraphRenderCoordinator<string>(
    () => {}, (result) => applied.push(result), () => assert.fail('cancelled error')
  );
  const pending = createDeferred<string>();
  let replacement: ReturnType<typeof coordinator.schedule> | undefined;
  const old = coordinator.schedule('Old', async (_requestId, signal) => {
    signal.addEventListener('abort', () => {
      replacement = coordinator.schedule('Fresh', async () => 'fresh');
    }, { once: true });
    return pending.promise;
  });
  coordinator.cancel();
  pending.resolve('old');

  assert.ok(replacement);
  assert.equal(await old, 'discarded');
  assert.equal(await replacement, 'applied');
  assert.deepEqual(applied, ['fresh']);
});

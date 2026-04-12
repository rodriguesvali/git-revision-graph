import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphRenderCoordinator } from '../src/revisionGraph/renderCoordinator';

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolvePromise!: (value: T) => void;
  return {
    promise: new Promise<T>((resolve) => {
      resolvePromise = resolve;
    }),
    resolve(value: T) {
      resolvePromise(value);
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
  await Promise.all([firstSchedule, secondSchedule]);

  assert.deepEqual(appliedResults, ['fresh']);
  assert.equal(loadingLabels.length, 2);
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
  await Promise.all([scheduleA, scheduleB, scheduleC]);

  assert.deepEqual(appliedResults, ['second']);
  assert.equal(invocation, 2);
});

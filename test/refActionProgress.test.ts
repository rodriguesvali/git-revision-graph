import test from 'node:test';
import assert from 'node:assert/strict';

import { createLatestRefActionProgress, createRefActionProgress } from '../src/refActions/progress';

test('ref action progress always clears feedback after a failed operation', async () => {
  const events: string[] = [];
  const progress = createRefActionProgress(
    (label, mode) => events.push(`start:${mode}:${label}`),
    () => events.push('stop')
  );

  await assert.rejects(
    progress.run('Deleting remote branch origin/demo...', 'subtle', async () => {
      throw new Error('network failed');
    }),
    /network failed/
  );

  assert.deepEqual(events, [
    'start:subtle:Deleting remote branch origin/demo...',
    'stop'
  ]);
});

test('latest ref action progress ignores completion from an older operation', async () => {
  const events: string[] = [];
  const resolvers: Array<() => void> = [];
  const ownedProgress = createLatestRefActionProgress(
    (label) => events.push(`start:${label}`),
    () => events.push('stop')
  );
  const run = (label: string) => ownedProgress.progress.run(label, 'subtle', () => new Promise<void>((resolve) => {
    resolvers.push(resolve);
  }));

  const older = run('older');
  const latest = run('latest');
  resolvers[0]();
  await older;
  assert.deepEqual(events, ['start:older', 'start:latest']);

  resolvers[1]();
  await latest;
  assert.deepEqual(events, ['start:older', 'start:latest', 'stop']);
});

test('latest ref action progress ignores completion after ownership is invalidated', async () => {
  const events: string[] = [];
  let resolveOperation: (() => void) | undefined;
  const ownedProgress = createLatestRefActionProgress(
    (label) => events.push(`start:${label}`),
    () => events.push('stop')
  );
  const operation = ownedProgress.progress.run('action', 'blocking', () => new Promise<void>((resolve) => {
    resolveOperation = resolve;
  }));

  ownedProgress.invalidate();
  resolveOperation?.();
  await operation;

  assert.deepEqual(events, ['start:action']);
});

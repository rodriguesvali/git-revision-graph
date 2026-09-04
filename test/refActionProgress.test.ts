import test from 'node:test';
import assert from 'node:assert/strict';

import { createRefActionProgress } from '../src/refActions/progress';

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

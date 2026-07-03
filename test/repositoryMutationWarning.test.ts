import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
  showConcurrentRepositoryMutationWarning
} from '../src/repositoryMutationWarning';

test('showConcurrentRepositoryMutationWarning presents and awaits a modal warning', async () => {
  const requests: Array<{
    readonly message: string;
    readonly options: { readonly modal: true };
  }> = [];
  let dismissWarning: (() => void) | undefined;

  const warningPromise = showConcurrentRepositoryMutationWarning({
    async showWarningMessage(message, options) {
      requests.push({ message, options });
      await new Promise<void>((resolve) => {
        dismissWarning = resolve;
      });
    }
  });
  const resultBeforeDismissal = await Promise.race([
    warningPromise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(requests, [{
    message: CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
    options: { modal: true }
  }]);

  dismissWarning?.();
  await warningPromise;
});

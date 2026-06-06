import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAbortError,
  isAbortError,
  throwIfAborted
} from '../src/errors';

test('createAbortError marks errors with the AbortError name', () => {
  const error = createAbortError('Canceled.');

  assert.equal(error.message, 'Canceled.');
  assert.equal(error.name, 'AbortError');
  assert.equal(isAbortError(error), true);
});

test('isAbortError rejects non-error AbortError-shaped values', () => {
  assert.equal(isAbortError({ name: 'AbortError' }), false);
  assert.equal(isAbortError(new Error('Other')), false);
});

test('throwIfAborted raises AbortError only for aborted signals', () => {
  const activeController = new AbortController();
  assert.doesNotThrow(() => {
    throwIfAborted(activeController.signal, 'Active.');
  });

  const abortedController = new AbortController();
  abortedController.abort();

  assert.throws(
    () => {
      throwIfAborted(abortedController.signal, 'Stopped.');
    },
    (error: unknown) =>
      error instanceof Error &&
      error.name === 'AbortError' &&
      error.message === 'Stopped.'
  );
});

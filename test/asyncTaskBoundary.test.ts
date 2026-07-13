import * as assert from 'node:assert/strict';
import test from 'node:test';

import { handleAsyncTaskSafely } from '../src/asyncTaskBoundary';
import { createAbortError } from '../src/errors';

test('async task boundary completes successful tasks', async () => {
  let completed = false;
  await handleAsyncTaskSafely(
    async () => { completed = true; },
    { onUnexpectedError: () => assert.fail('Unexpected error callback.') }
  );
  assert.equal(completed, true);
});

test('async task boundary reports rejected tasks', async () => {
  const expected = new Error('failed');
  let reported: unknown;
  await handleAsyncTaskSafely(
    async () => { throw expected; },
    { onUnexpectedError: (error) => { reported = error; } }
  );
  assert.equal(reported, expected);
});

test('async task boundary ignores expected cancellation', async () => {
  let reported = false;
  await handleAsyncTaskSafely(
    async () => { throw createAbortError('cancelled'); },
    { onUnexpectedError: () => { reported = true; } }
  );
  assert.equal(reported, false);
});

test('async task boundary contains error reporter failures', async () => {
  const reporterFailure = new Error('reporter failed');
  let boundaryFailure: unknown;
  await handleAsyncTaskSafely(
    async () => { throw new Error('task failed'); },
    {
      onUnexpectedError: () => { throw reporterFailure; },
      reportBoundaryFailure: (error) => { boundaryFailure = error; }
    }
  );
  assert.equal(boundaryFailure, reporterFailure);
});

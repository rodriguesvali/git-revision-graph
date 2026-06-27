import test from 'node:test';
import assert from 'node:assert/strict';

import { createAbortError } from '../src/errors';
import { handleWebviewMessageSafely } from '../src/webviewMessageBoundary';

test('webview message boundary completes successful handlers', async () => {
  let handled = false;

  await handleWebviewMessageSafely(
    () => {
      handled = true;
    },
    { onUnexpectedError: () => assert.fail('Unexpected error callback.') }
  );

  assert.equal(handled, true);
});

test('webview message boundary contains rejected handlers', async () => {
  const expected = new Error('Rejected handler.');
  let reported: unknown;

  await handleWebviewMessageSafely(
    async () => {
      throw expected;
    },
    { onUnexpectedError: (error) => { reported = error; } }
  );

  assert.equal(reported, expected);
});

test('webview message boundary ignores expected cancellation', async () => {
  let reported = false;

  await handleWebviewMessageSafely(
    () => {
      throw createAbortError('Canceled.');
    },
    { onUnexpectedError: () => { reported = true; } }
  );

  assert.equal(reported, false);
});

test('webview message boundary contains error reporter failures', async () => {
  const reporterFailure = new Error('Reporter failed.');
  let boundaryFailure: unknown;

  await handleWebviewMessageSafely(
    () => {
      throw new Error('Handler failed.');
    },
    {
      onUnexpectedError: () => {
        throw reporterFailure;
      },
      reportBoundaryFailure: (error) => { boundaryFailure = error; }
    }
  );

  assert.equal(boundaryFailure, reporterFailure);
});

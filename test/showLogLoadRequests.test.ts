import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAbortError,
  ShowLogLoadRequests
} from '../src/showLog/loadRequests';

test('ShowLogLoadRequests tracks the latest started request', () => {
  const requests = new ShowLogLoadRequests();
  const first = requests.start();
  const second = requests.start();

  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});

test('ShowLogLoadRequests aborts the previous active request when a new one activates', () => {
  const requests = new ShowLogLoadRequests();
  const first = requests.activate(requests.start());
  const second = requests.activate(requests.start());

  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, false);
  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});

test('ShowLogLoadRequests invalidates and cancels active requests', () => {
  const requests = new ShowLogLoadRequests();
  const active = requests.activate(requests.start());

  requests.invalidateAndCancel();

  assert.equal(active.signal.aborted, true);
  assert.equal(requests.isCurrent(active), false);
});

test('ShowLogLoadRequests clears only the matching finished active request', () => {
  const requests = new ShowLogLoadRequests();
  const first = requests.activate(requests.start());
  const second = requests.activate(requests.start());

  requests.finish(first);

  assert.equal(second.signal.aborted, false);
  requests.cancelActive();
  assert.equal(second.signal.aborted, true);
});

test('isAbortError recognizes AbortError instances', () => {
  const abortError = new Error('Canceled');
  abortError.name = 'AbortError';

  assert.equal(isAbortError(abortError), true);
  assert.equal(isAbortError(new Error('Other')), false);
  assert.equal(isAbortError({ name: 'AbortError' }), false);
});

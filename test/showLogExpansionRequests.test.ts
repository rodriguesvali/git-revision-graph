import test from 'node:test';
import assert from 'node:assert/strict';

import { ShowLogExpansionRequests } from '../src/showLog/expansionRequests';

test('ShowLogExpansionRequests tracks the latest started request', () => {
  const requests = new ShowLogExpansionRequests();
  const first = requests.start();
  const second = requests.start();

  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});

test('ShowLogExpansionRequests invalidates active expansion responses', () => {
  const requests = new ShowLogExpansionRequests();
  const request = requests.start();

  requests.invalidate();

  assert.equal(requests.isCurrent(request), false);
});

test('ShowLogExpansionRequests keeps new requests current after invalidation', () => {
  const requests = new ShowLogExpansionRequests();
  const stale = requests.start();

  requests.invalidate();
  const current = requests.start();

  assert.equal(requests.isCurrent(stale), false);
  assert.equal(requests.isCurrent(current), true);
});

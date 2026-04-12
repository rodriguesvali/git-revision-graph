import test from 'node:test';
import assert from 'node:assert/strict';

import {
  consumePendingFollowUpRefresh,
  createActionRefreshRequest,
  getDefaultFollowUpEventsForIntent,
  normalizeRefreshRequest,
  registerPendingFollowUpRefresh
} from '../src/revisionGraphRefresh';

test('createActionRefreshRequest attaches the default follow-up repository events', () => {
  assert.deepEqual(
    createActionRefreshRequest('metadata-patch', '/workspace/repo'),
    {
      intent: 'metadata-patch',
      repositoryPath: '/workspace/repo',
      followUpEvents: ['state', 'checkout']
    }
  );
  assert.deepEqual(getDefaultFollowUpEventsForIntent('projection-rebuild'), []);
});

test('registerPendingFollowUpRefresh suppresses matching event bursts within the suppression window', () => {
  const pending = new Map();
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('metadata-patch', '/workspace/repo'),
    100
  );

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 200), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 300), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'checkout', 400), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'checkout', 500), true);
});

test('consumePendingFollowUpRefresh expires old suppressions and ignores other repositories', () => {
  const pending = new Map();
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    100
  );

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/other', 'state', 200), false);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 1700), false);
});

test('normalizeRefreshRequest preserves object requests and defaults missing requests to full rebuild', () => {
  const request = createActionRefreshRequest('metadata-patch', '/workspace/repo');

  assert.deepEqual(normalizeRefreshRequest(undefined), { intent: 'full-rebuild' });
  assert.deepEqual(normalizeRefreshRequest('projection-rebuild'), { intent: 'projection-rebuild' });
  assert.equal(normalizeRefreshRequest(request), request);
});

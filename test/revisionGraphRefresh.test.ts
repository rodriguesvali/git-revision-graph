import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelPendingFollowUpRefresh,
  consumePendingFollowUpRefresh,
  createActionRefreshRequest,
  createRepositoryRefreshRequest,
  getDefaultFollowUpEventsForIntent,
  normalizeRefreshRequest,
  RevisionGraphSnapshotReloadSemaphore,
  registerPendingFollowUpRefresh,
  shouldReloadSnapshotForProjectionOptionsChange
} from '../src/revisionGraphRefresh';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';

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

test('createRepositoryRefreshRequest attaches follow-up suppression only when a repository path is available', () => {
  assert.deepEqual(
    createRepositoryRefreshRequest('full-rebuild', '/workspace/repo'),
    {
      intent: 'full-rebuild',
      repositoryPath: '/workspace/repo',
      followUpEvents: ['state', 'checkout']
    }
  );
  assert.deepEqual(createRepositoryRefreshRequest('full-rebuild'), {
    intent: 'full-rebuild'
  });
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

test('cancelPendingFollowUpRefresh removes a prepared suppression entry', () => {
  const pending = new Map();
  const preparedRefresh = registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    100
  );

  assert.ok(preparedRefresh);
  cancelPendingFollowUpRefresh(pending, preparedRefresh!);

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 200), false);
});

test('consumePendingFollowUpRefresh expires old suppressions and ignores other repositories', () => {
  const pending = new Map();
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    100
  );

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/other', 'state', 200), false);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 5200), false);
});

test('normalizeRefreshRequest preserves object requests and defaults missing requests to full rebuild', () => {
  const request = createActionRefreshRequest('metadata-patch', '/workspace/repo');

  assert.deepEqual(normalizeRefreshRequest(undefined), { intent: 'full-rebuild' });
  assert.deepEqual(normalizeRefreshRequest('projection-rebuild'), { intent: 'projection-rebuild' });
  assert.equal(normalizeRefreshRequest(request), request);
});

test('RevisionGraphSnapshotReloadSemaphore tracks when a repository snapshot can be reused', () => {
  const semaphore = new RevisionGraphSnapshotReloadSemaphore();

  assert.equal(semaphore.requiresReload('/workspace/repo'), true);
  assert.equal(semaphore.canReuseSnapshot('/workspace/repo'), false);

  semaphore.markReloadComplete('/workspace/repo');

  assert.equal(semaphore.requiresReload('/workspace/repo'), false);
  assert.equal(semaphore.canReuseSnapshot('/workspace/repo'), true);
  assert.equal(semaphore.canReuseSnapshot('/workspace/other'), false);
  assert.equal(semaphore.requiresReload(undefined), true);

  semaphore.markReloadRequired();

  assert.equal(semaphore.requiresReload('/workspace/repo'), true);
});

test('projection option changes require a fresh graph snapshot', () => {
  const defaultOptions = createDefaultRevisionGraphProjectionOptions();

  assert.equal(shouldReloadSnapshotForProjectionOptionsChange(defaultOptions, defaultOptions), false);
  assert.equal(shouldReloadSnapshotForProjectionOptionsChange(defaultOptions, {
    ...defaultOptions,
    refScope: 'current'
  }), true);
  assert.equal(shouldReloadSnapshotForProjectionOptionsChange(defaultOptions, {
    ...defaultOptions,
    showRemoteBranches: false
  }), true);
  assert.equal(shouldReloadSnapshotForProjectionOptionsChange(defaultOptions, {
    ...defaultOptions,
    showCurrentBranchDescendants: true
  }), true);
});

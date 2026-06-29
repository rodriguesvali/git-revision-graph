import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelPendingFollowUpRefresh,
  canReuseSnapshotForProjectionOptions,
  consumePendingFollowUpRefresh,
  createActionRefreshRequest,
  createRepositoryRefreshRequest,
  getDefaultFollowUpEventsForIntent,
  getRefreshLoadingLabel,
  getRefreshLoadingMode,
  normalizeRefreshRequest,
  registerPendingFollowUpRefresh
} from '../src/revisionGraphRefresh';
import {
  createDefaultRevisionGraphProjectionOptions,
  normalizeRevisionGraphProjectionOptionsForScope
} from '../src/revisionGraphTypes';

test('createActionRefreshRequest attaches the default follow-up repository events', () => {
  assert.deepEqual(
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    {
      intent: 'full-rebuild',
      repositoryPath: '/workspace/repo',
      followUpEvents: ['state', 'checkout'],
      clearSnapshotCache: true
    }
  );
  assert.deepEqual(getDefaultFollowUpEventsForIntent('full-rebuild'), ['state', 'checkout']);
  assert.deepEqual(getDefaultFollowUpEventsForIntent('projection-only'), []);
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

test('registerPendingFollowUpRefresh suppresses prepared follow-up events during the active window', () => {
  const pending = new Map();
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    100
  );

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 200), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 300), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'checkout', 400), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'checkout', 500), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 5200), false);
});

test('registerPendingFollowUpRefresh keeps overlapping prepared entries independent', () => {
  const pending = new Map();
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    100
  );
  registerPendingFollowUpRefresh(
    pending,
    createActionRefreshRequest('full-rebuild', '/workspace/repo'),
    150
  );

  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 200), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 300), true);
  assert.equal(consumePendingFollowUpRefresh(pending, '/workspace/repo', 'state', 400), true);
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
  const request = createActionRefreshRequest('full-rebuild', '/workspace/repo');

  assert.deepEqual(normalizeRefreshRequest(undefined), { intent: 'full-rebuild' });
  assert.deepEqual(normalizeRefreshRequest('full-rebuild'), { intent: 'full-rebuild' });
  assert.equal(normalizeRefreshRequest(request), request);
});

test('projection-only refresh uses lightweight loading feedback', () => {
  assert.equal(getRefreshLoadingLabel('projection-only'), 'Updating revision graph...');
  assert.equal(getRefreshLoadingMode('projection-only'), 'subtle');
  assert.equal(getRefreshLoadingLabel('full-rebuild'), 'Loading revision graph...');
  assert.equal(getRefreshLoadingMode('full-rebuild'), 'blocking');
});

test('snapshot reuse is limited to options that do not affect Git history loading', () => {
  const options = createDefaultRevisionGraphProjectionOptions();

  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      showMergeCommits: true
    }),
    true
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      showCurrentBranchDescendants: true
    }),
    true
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      revisionRange: {
        baseRevision: 'main',
        baseLabel: 'main',
        compareRevision: 'feature/demo',
        compareLabel: 'feature/demo'
      }
    }),
    true
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(
      {
        ...options,
        revisionRange: {
          baseRevision: 'main',
          baseLabel: 'main',
          compareRevision: 'feature/demo',
          compareLabel: 'feature/demo'
        }
      },
      {
        ...options,
        revisionRange: undefined
      }
    ),
    true
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      refScope: 'current',
      showCurrentBranchDescendants: true
    }),
    false
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      showTags: false
    }),
    false
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      showRemoteBranches: false
    }),
    false
  );
  assert.equal(
    canReuseSnapshotForProjectionOptions(options, {
      ...options,
      showStashes: false
    }),
    false
  );
});

test('projection options keep descendants as core current branch behavior', () => {
  const defaultOptions = createDefaultRevisionGraphProjectionOptions();

  assert.deepEqual(
    normalizeRevisionGraphProjectionOptionsForScope({
      ...defaultOptions,
      refScope: 'current',
      showCurrentBranchDescendants: false
    }),
    {
      ...defaultOptions,
      refScope: 'current',
      showCurrentBranchDescendants: true
    }
  );
  assert.deepEqual(
    normalizeRevisionGraphProjectionOptionsForScope({
      ...defaultOptions,
      refScope: 'all',
      showCurrentBranchDescendants: true
    }),
    {
      ...defaultOptions,
      refScope: 'all',
      showCurrentBranchDescendants: false
    }
  );
  assert.deepEqual(
    normalizeRevisionGraphProjectionOptionsForScope({
      ...defaultOptions,
      refScope: 'remoteHead',
      showCurrentBranchDescendants: true
    }),
    {
      ...defaultOptions,
      refScope: 'remoteHead',
      showCurrentBranchDescendants: false
    }
  );
  assert.deepEqual(
    normalizeRevisionGraphProjectionOptionsForScope({
      ...defaultOptions,
      refScope: 'local',
      showCurrentBranchDescendants: true
    }),
    {
      ...defaultOptions,
      refScope: 'local',
      showCurrentBranchDescendants: false
    }
  );
});

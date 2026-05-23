import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH,
  MAX_WEBVIEW_MESSAGE_STRING_LENGTH,
  isBoundedStringArray
} from '../src/webviewMessageValidation';
import {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState,
  validateRevisionGraphMessage
} from '../src/revisionGraph/messageValidation';
import { validateCompareResultsWebviewMessage } from '../src/compareResults/messageValidation';
import { validateShowLogWebviewMessage } from '../src/showLog/messageValidation';
import { RevisionGraphViewState } from '../src/revisionGraphTypes';

test('validateRevisionGraphMessage rejects malformed graph messages', () => {
  assert.equal(validateRevisionGraphMessage(undefined), undefined);
  assert.equal(validateRevisionGraphMessage({}), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'checkout', refName: 'main', refKind: 'evil' }), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'set-projection-options', options: { showTags: 'yes' } }), undefined);
  assert.equal(
    validateRevisionGraphMessage({
      type: 'copy-commit-hash',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'copy-ref-name', refName: 'main', refKind: 'commit' }),
    undefined
  );
});

test('validateRevisionGraphMessage accepts and sanitizes graph messages', () => {
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        refScope: 'local',
        showTags: false,
        unknown: 'ignored'
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        refScope: 'local',
        showTags: false
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        refScope: 'remoteHead'
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        refScope: 'remoteHead'
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'checkout', refName: 'main', refKind: 'head' }),
    { type: 'checkout', refName: 'main', refKind: 'head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'abort-merge' }),
    { type: 'abort-merge' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'copy-ref-name', refName: 'main', refKind: 'head' }),
    { type: 'copy-ref-name', refName: 'main', refKind: 'head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'reset-current-workspace', includeUntracked: true }),
    { type: 'reset-current-workspace', includeUntracked: true }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'pull-current-head' }),
    { type: 'pull-current-head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'push-current-head' }),
    { type: 'push-current-head' }
  );
});

test('isRevisionGraphMessageAllowedForState restricts graph actions to known refs and commits', () => {
  const state = createReadyRevisionGraphState();

  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'checkout', refName: 'missing', refKind: 'branch' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'create-branch', revision: 'structural1', label: 'structural1', refKind: 'commit' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'copy-ref-name', refName: 'main', refKind: 'head' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'copy-ref-name', refName: 'missing', refKind: 'branch' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-tag', refName: 'main', label: 'main', refKind: 'head' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'abort-merge' }, state),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'abort-merge' },
      { ...state, hasMergeConflicts: true, hasConflictedMerge: false, isWorkspaceDirty: true }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'abort-merge' },
      { ...state, hasMergeConflicts: true, hasConflictedMerge: true, isWorkspaceDirty: true }
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'reset-current-workspace', includeUntracked: false },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'reset-current-workspace', includeUntracked: false },
      { ...state, currentHeadName: 'missing' }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'pull-current-head' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'push-current-head' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-current-head' },
      { ...state, currentHeadUpstreamName: undefined }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-current-head' },
      { ...state, publishedLocalBranchNames: [] }
    ),
    false
  );
});

test('isRevisionGraphMessageAllowedForCurrentRepository rejects stale repository-scoped graph actions', () => {
  const state = createReadyRevisionGraphState();

  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state,
      '/workspace/repo'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state,
      '/workspace/other'
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      '/workspace/repo'
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'refresh' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      '/workspace/other'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'choose-repository' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      undefined
    ),
    true
  );
});

test('validateCompareResultsWebviewMessage rejects malformed compare result messages', () => {
  assert.equal(validateCompareResultsWebviewMessage({ type: 'base' }), undefined);
  assert.equal(validateCompareResultsWebviewMessage({ type: 'copyFileName', itemIds: 'file:0' }), undefined);
  assert.equal(
    validateCompareResultsWebviewMessage({
      type: 'copyFileName',
      itemIds: Array.from({ length: MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH + 1 }, (_, index) => `file:${index}`)
    }),
    undefined
  );
  assert.deepEqual(
    validateCompareResultsWebviewMessage({ type: 'copyFullPath', itemIds: ['file:0'] }),
    { type: 'copyFullPath', itemIds: ['file:0'] }
  );
});

test('validateShowLogWebviewMessage rejects malformed show log messages', () => {
  assert.equal(validateShowLogWebviewMessage({ type: 'toggleShowAllBranches', value: 'true' }), undefined);
  assert.equal(validateShowLogWebviewMessage({ type: 'openFile', commitHash: 'abc123' }), undefined);
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'setFilterText',
      value: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1),
      sourceToken: '1'
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({ type: 'setFilterText', value: 'Ada' }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'setFilterText',
      value: 'Ada',
      sourceToken: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'openCommitDetails',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'compareCommits',
      baseCommitHash: 'abc123',
      compareCommitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'compareCommitWithWorktree',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'resetToCommit',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }),
    { type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }),
    { type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'compareCommitWithWorktree', commitHash: 'abc123' }),
    { type: 'compareCommitWithWorktree', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'resetToCommit', commitHash: 'abc123' }),
    { type: 'resetToCommit', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'setFilterText', value: 'Ada', sourceToken: '1' }),
    { type: 'setFilterText', value: 'Ada', sourceToken: '1' }
  );
});

test('isBoundedStringArray rejects oversized items', () => {
  assert.equal(isBoundedStringArray(['ok']), true);
  assert.equal(isBoundedStringArray(['a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)]), false);
});

function createReadyRevisionGraphState(): RevisionGraphViewState {
  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: '/workspace/repo',
    currentHeadName: 'main',
    currentHeadUpstreamName: 'origin/main',
    publishedLocalBranchNames: ['main'],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
    projectionOptions: {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showCurrentBranchDescendants: true
    },
    mergeBlockedTargets: [],
    primaryAncestorNextByHash: {},
    scene: {
      nodes: [
        {
          hash: 'head1',
          row: 0,
          lane: 0,
          x: 0,
          refs: [{ name: 'main', kind: 'head' }],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Main'
        },
        {
          hash: 'tag1',
          row: 1,
          lane: 0,
          x: 0,
          refs: [{ name: 'v1.0.0', kind: 'tag' }],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Tag'
        },
        {
          hash: 'structural1',
          row: 2,
          lane: 0,
          x: 0,
          refs: [],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Structural'
        }
      ],
      edges: [],
      laneCount: 1,
      rowCount: 3
    },
    nodeLayouts: [],
    references: [
      { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head', title: 'main' },
      { id: 'tag1::tag::v1.0.0', hash: 'tag1', name: 'v1.0.0', kind: 'tag', title: 'v1.0.0' }
    ],
    sceneLayoutKey: 'head1:0:0|tag1:0:0|structural1:0:0',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

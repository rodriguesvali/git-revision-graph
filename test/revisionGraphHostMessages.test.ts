import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRevisionGraphCommitShortStatMessage,
  createRevisionGraphErrorMessage,
  createRevisionGraphInitStateMessage,
  createRevisionGraphLoadingMessage,
  createRevisionGraphFlowAiTextResultMessage,
  createRevisionGraphRemoteTagStateMessage,
  createRevisionGraphShowFlowBranchFormMessage,
  createRevisionGraphUpdateStateMessage
} from '../src/revisionGraph/hostMessages';
import { RevisionGraphViewState } from '../src/revisionGraphTypes';

test('builds revision graph host state messages with stable payloads', () => {
  const state = createReadyRevisionGraphState();

  assert.deepEqual(createRevisionGraphInitStateMessage(state), {
    type: 'init-state',
    state
  });
  assert.deepEqual(createRevisionGraphUpdateStateMessage(state), {
    type: 'update-state',
    state
  });
});

test('builds revision graph host status messages with stable payloads', () => {
  assert.deepEqual(createRevisionGraphLoadingMessage('Loading revision graph...', 'blocking'), {
    type: 'set-loading',
    label: 'Loading revision graph...',
    mode: 'blocking'
  });
  assert.deepEqual(createRevisionGraphErrorMessage('Could not load the revision graph.'), {
    type: 'set-error',
    message: 'Could not load the revision graph.'
  });
});

test('builds the host request that opens a prepared Flow Governance branch form', () => {
  assert.deepEqual(createRevisionGraphShowFlowBranchFormMessage('release', 'main'), {
    type: 'show-flow-branch-form',
    branchKind: 'release',
    sourceRefName: 'main'
  });
});

test('builds Flow AI text results with explicit ready and unavailable states', () => {
  assert.deepEqual(
    createRevisionGraphFlowAiTextResultMessage(4, 'pull-request', 'title', 'ready', 'Release 2.0.0'),
    {
      type: 'set-flow-ai-text-result',
      requestId: 4,
      surface: 'pull-request',
      field: 'title',
      status: 'ready',
      content: 'Release 2.0.0'
    }
  );
  assert.deepEqual(
    createRevisionGraphFlowAiTextResultMessage(5, 'release', 'description', 'unavailable'),
    {
      type: 'set-flow-ai-text-result',
      requestId: 5,
      surface: 'release',
      field: 'description',
      status: 'unavailable'
    }
  );
});

test('builds revision graph remote tag host messages with stable payloads', () => {
  assert.deepEqual(createRevisionGraphRemoteTagStateMessage('v1.0.0', 'published'), {
    type: 'set-remote-tag-state',
    tagName: 'v1.0.0',
    state: 'published'
  });
});

test('builds revision graph commit stat host messages with explicit empty results', () => {
  assert.deepEqual(
    createRevisionGraphCommitShortStatMessage('abc123', { files: 2, insertions: 5, deletions: 1 }),
    {
      type: 'set-commit-short-stat',
      commitHash: 'abc123',
      shortStat: { files: 2, insertions: 5, deletions: 1 }
    }
  );
  assert.deepEqual(createRevisionGraphCommitShortStatMessage('abc123', undefined), {
    type: 'set-commit-short-stat',
    commitHash: 'abc123',
    shortStat: null
  });
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
      showMergeCommits: false,
      showCurrentBranchDescendants: false,
      revisionRange: undefined,
      descendantFocus: undefined
    },
    mergeBlockedTargets: [],
    primaryAncestorNextByHash: {},
    scene: {
      nodes: [],
      edges: [],
      laneCount: 1,
      rowCount: 1
    },
    nodeLayouts: [],
    references: [],
    sceneLayoutKey: 'empty',
    baseCanvasWidth: 880,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

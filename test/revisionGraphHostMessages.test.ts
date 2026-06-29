import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRevisionGraphErrorMessage,
  createRevisionGraphInitStateMessage,
  createRevisionGraphLoadingMessage,
  createRevisionGraphRemoteTagStateMessage,
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

test('builds revision graph remote tag host messages with stable payloads', () => {
  assert.deepEqual(createRevisionGraphRemoteTagStateMessage('v1.0.0', 'published'), {
    type: 'set-remote-tag-state',
    tagName: 'v1.0.0',
    state: 'published'
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
      revisionRange: undefined
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

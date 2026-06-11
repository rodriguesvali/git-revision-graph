import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import {
  applyRepositoryStatusToRevisionGraphViewState,
  buildRevisionGraphRepositoryStateSignature
} from '../src/revisionGraph/repository/stateChange';
import { RevisionGraphViewState, createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createChange, createHead, createRef, createRepository } from './fakes';

test('repository state signature ignores workspace-only changes', () => {
  const cleanRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  const dirtyRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })],
    workingTreeChanges: [createChange({ uriPath: '/workspace/repo/src/app.ts' })],
    untrackedChanges: [createChange({ uriPath: '/workspace/repo/tmp.txt' })]
  });

  assert.equal(
    buildRevisionGraphRepositoryStateSignature(dirtyRepository),
    buildRevisionGraphRepositoryStateSignature(cleanRepository)
  );
});

test('repository state signature changes when graph refs change', () => {
  const previousRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  const nextRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head2' })]
  });

  assert.notEqual(
    buildRevisionGraphRepositoryStateSignature(nextRepository),
    buildRevisionGraphRepositoryStateSignature(previousRepository)
  );
});

test('applies repository workspace status without rebuilding graph scene state', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })],
    workingTreeChanges: [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  });
  const state = createReadyRevisionGraphState();

  const nextState = applyRepositoryStatusToRevisionGraphViewState(state, repository);

  assert.notEqual(nextState, state);
  assert.equal(nextState.isWorkspaceDirty, true);
  assert.equal(nextState.hasMergeConflicts, false);
  assert.equal(nextState.hasConflictedMerge, false);
  assert.equal(nextState.scene, state.scene);
  assert.equal(nextState.sceneLayoutKey, state.sceneLayoutKey);
  assert.equal(nextState.loading, false);
  assert.equal(nextState.loadingLabel, undefined);
});

function createReadyRevisionGraphState(): RevisionGraphViewState {
  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: '/workspace/repo',
    currentHeadName: 'main',
    currentHeadUpstreamName: undefined,
    publishedLocalBranchNames: [],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
    projectionOptions: createDefaultRevisionGraphProjectionOptions(),
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
          date: '2026-06-11',
          subject: 'Main'
        }
      ],
      edges: [],
      laneCount: 1,
      rowCount: 1
    },
    nodeLayouts: [],
    references: [
      { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head', title: 'main' }
    ],
    sceneLayoutKey: 'layout',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

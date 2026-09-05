import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphMessageDispatcher } from '../src/revisionGraph/messageDispatcher';
import { RevisionGraphMessage, RevisionGraphViewState } from '../src/revisionGraphTypes';

test('a stale preview request receives rejection feedback without executing an action', async () => {
  const rejected: unknown[] = [];
  const dispatcher = new RevisionGraphMessageDispatcher();
  const request = { type: 'preview-flow-form', requestId: 2, repositoryPath: '/stale', action: {
    type: 'start-flow-branch', sourceRefName: 'main', branchKind: 'release', name: ''
  } };
  await dispatcher.dispatch(request, {
    currentState: createReadyRevisionGraphState(), currentRepositoryPath: '/workspace/repo',
    rejectMessage: (message) => rejected.push(message), async handleMessage() { assert.fail('stale preview'); }
  });
  assert.deepEqual(rejected, [request]);
});

test('rejected form submissions receive a recovery response instead of leaving the form pending', async () => {
  const rejected: unknown[] = [];
  const dispatcher = new RevisionGraphMessageDispatcher();
  const request = { type: 'submit-flow-form', requestId: 1, repositoryPath: '/stale', action: {
    type: 'prepare-flow-equalization', originRefName: 'main', targetRefName: 'release/2', description: 'Keep me'
  } };
  await dispatcher.dispatch(request, {
    currentState: createReadyRevisionGraphState(), currentRepositoryPath: '/workspace/repo',
    rejectMessage: (message) => rejected.push(message),
    async handleMessage() { assert.fail('stale submission must not execute'); }
  });
  assert.deepEqual(rejected, [request]);
});

test('configuration recovery dispatches for a disabled current flow but rejects a stale click', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const state = { ...createReadyRevisionGraphState(), flowGovernance: {
    enabled: false, configSource: 'invalid' as const, diagnostics: [], branchKinds: [], references: []
  } };
  const dispatched: RevisionGraphMessage[] = [];
  for (const repositoryPath of [state.repositoryPath, '/stale']) {
    await dispatcher.dispatch({ type: 'open-flow-config', repositoryPath }, {
      currentState: state, currentRepositoryPath: state.repositoryPath,
      async handleMessage(message) { dispatched.push(message); }
    });
  }
  assert.deepEqual(dispatched, [{ type: 'open-flow-config', repositoryPath: state.repositoryPath }]);
});

test('RevisionGraphMessageDispatcher dispatches only valid messages allowed for the current state and repository', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const dispatchedMessages: RevisionGraphMessage[] = [];
  const state = createReadyRevisionGraphState();

  await dispatcher.dispatch(
    { type: 'checkout', refName: 'main', refKind: 'head' },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'checkout', refName: 'missing', refKind: 'branch' },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'checkout', refName: 'main', refKind: 'head' },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/other',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );

  assert.deepEqual(dispatchedMessages, [
    { type: 'checkout', refName: 'main', refKind: 'head' }
  ]);
});

test('RevisionGraphMessageDispatcher still allows unscoped refresh messages while loading', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const dispatchedMessages: RevisionGraphMessage[] = [];

  await dispatcher.dispatch(
    { type: 'refresh' },
    {
      currentState: {
        ...createReadyRevisionGraphState(),
        loading: true,
        loadingLabel: 'Loading revision graph...'
      },
      currentRepositoryPath: '/workspace/other',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'refresh-with-empty-cache' },
    {
      currentState: {
        ...createReadyRevisionGraphState(),
        loading: true,
        loadingLabel: 'Loading revision graph...'
      },
      currentRepositoryPath: '/workspace/other',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );

  assert.deepEqual(dispatchedMessages, [{ type: 'refresh' }, { type: 'refresh-with-empty-cache' }]);
});

test('RevisionGraphMessageDispatcher authorizes Flow Governance options only for current ready flow state', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const dispatchedMessages: RevisionGraphMessage[] = [];
  const state = {
    ...createReadyRevisionGraphState(),
    flowGovernance: {
      enabled: true,
      configSource: 'workspace' as const,
      diagnostics: [],
      branchKinds: ['main', 'sync', 'unknown'] as const,
      references: []
    }
  };

  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: false } },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: true } },
    {
      currentState: { ...state, flowGovernance: undefined },
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: true } },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/other',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );

  assert.deepEqual(dispatchedMessages, [
    { type: 'set-flow-governance-options', options: { enabled: false } }
  ]);
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
      layoutPreference: 'auto',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showMergeCommits: false,
      showCurrentBranchDescendants: true,
      revisionRange: undefined,
      descendantFocus: undefined
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
    sceneLayoutKey: 'head1:0:0',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphMessageDispatcher } from '../src/revisionGraph/messageDispatcher';
import { RevisionGraphMessage, RevisionGraphViewState } from '../src/revisionGraphTypes';

test('graph rejects unbound actions before resolving an identical reference in the current repository', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  let calls = 0;
  await dispatcher.dispatch({ type: 'checkout', refName: 'main', refKind: 'head' }, {
    currentState: createReadyRevisionGraphState(), currentRepositoryPath: '/workspace/repo',
    async handleMessage() { calls++; }
  });
  assert.equal(calls, 0);
});

test('a stale preview request receives rejection feedback without executing an action', async () => {
  const rejected: unknown[] = [];
  const dispatcher = new RevisionGraphMessageDispatcher();
  const request = { type: 'preview-flow-form', requestId: 2, repositoryPath: '/stale', action: {
    type: 'start-flow-branch', sourceRefName: 'main', branchKind: 'release', name: ''
  } };
  const state = dispatcher.bindState(createReadyRevisionGraphState());
  await dispatcher.dispatch({ ...request, origin: state.messageOrigin }, {
    currentState: state, currentRepositoryPath: '/workspace/repo',
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
  const state = dispatcher.bindState(createReadyRevisionGraphState());
  await dispatcher.dispatch({ ...request, origin: state.messageOrigin }, {
    currentState: state, currentRepositoryPath: '/workspace/repo',
    rejectMessage: (message) => rejected.push(message),
    async handleMessage() { assert.fail('stale submission must not execute'); }
  });
  assert.deepEqual(rejected, [request]);
});

test('configuration recovery dispatches for a disabled current flow but rejects a stale click', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const state = dispatcher.bindState({ ...createReadyRevisionGraphState(), flowGovernance: {
    enabled: false, configSource: 'invalid' as const, diagnostics: [], branchKinds: [], references: []
  } });
  const dispatched: RevisionGraphMessage[] = [];
  for (const repositoryPath of [state.repositoryPath, '/stale']) {
    await dispatcher.dispatch({ type: 'open-flow-config', repositoryPath, origin: state.messageOrigin }, {
      currentState: state, currentRepositoryPath: state.repositoryPath,
      async handleMessage(message) { dispatched.push(message); }
    });
  }
  assert.deepEqual(dispatched, [{ type: 'open-flow-config', repositoryPath: state.repositoryPath }]);
});

test('RevisionGraphMessageDispatcher dispatches only valid messages allowed for the current state and repository', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const dispatchedMessages: RevisionGraphMessage[] = [];
  const state = dispatcher.bindState(createReadyRevisionGraphState());

  await dispatcher.dispatch(
    { type: 'checkout', refName: 'main', refKind: 'head', origin: state.messageOrigin },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'checkout', refName: 'missing', refKind: 'branch', origin: state.messageOrigin },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'checkout', refName: 'main', refKind: 'head', origin: state.messageOrigin },
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
  const state = dispatcher.bindState({
    ...createReadyRevisionGraphState(),
    flowGovernance: {
      enabled: true,
      configSource: 'workspace' as const,
      diagnostics: [],
      branchKinds: ['main', 'sync', 'unknown'] as const,
      references: []
    }
  });

  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: false }, origin: state.messageOrigin },
    {
      currentState: state,
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: true }, origin: state.messageOrigin },
    {
      currentState: { ...state, flowGovernance: undefined },
      currentRepositoryPath: '/workspace/repo',
      async handleMessage(message) {
        dispatchedMessages.push(message);
      }
    }
  );
  await dispatcher.dispatch(
    { type: 'set-flow-governance-options', options: { enabled: true }, origin: state.messageOrigin },
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

test('graph rejects cross-repository, same-repository render and A→B→A replays', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const original = dispatcher.bindState(createReadyRevisionGraphState());
  dispatcher.invalidate();
  dispatcher.bindState({ ...original, repositoryPath: '/other' });
  const current = dispatcher.bindState(createReadyRevisionGraphState());
  let calls = 0;
  const context = { currentState: current, currentRepositoryPath: current.repositoryPath,
    async handleMessage() { calls++; } };
  for (const origin of [original.messageOrigin, undefined, { ...current.messageOrigin, repositoryPath: '/other' }]) {
    await dispatcher.dispatch({ type: 'checkout', refName: 'main', refKind: 'head', origin }, context);
  }
  assert.equal(calls, 0);
  await dispatcher.dispatch({ type: 'checkout', refName: 'main', refKind: 'head', origin: current.messageOrigin }, context);
  assert.equal(calls, 1);
  dispatcher.invalidate();
  await dispatcher.dispatch({ type: 'checkout', refName: 'main', refKind: 'head', origin: current.messageOrigin }, context);
  assert.equal(calls, 1);
});

test('webview bootstrap remains available without a repository or origin', async () => {
  let calls = 0;
  await new RevisionGraphMessageDispatcher().dispatch({ type: 'webview-ready' }, {
    currentState: { ...createReadyRevisionGraphState(), viewMode: 'empty', repositoryPath: undefined },
    currentRepositoryPath: undefined, async handleMessage() { calls++; }
  });
  assert.equal(calls, 1);
});

test('graph file opening rejects old render/repository origins and unknown commits', async () => {
  const dispatcher = new RevisionGraphMessageDispatcher();
  const base = createReadyRevisionGraphState();
  const commitHash = 'a'.repeat(40);
  const state = dispatcher.bindState({ ...base, scene: { ...base.scene, nodes: base.scene.nodes.map(node => ({ ...node, hash: commitHash })) } });
  const calls: string[] = [];
  const context = { currentState: state, currentRepositoryPath: state.repositoryPath,
    async handleMessage(message: { type: string }) { calls.push(message.type); } };
  for (const origin of [undefined, {}, { ...state.messageOrigin, contextId: 'old' }, { ...state.messageOrigin, repositoryPath: '/other' }]) {
    await dispatcher.dispatch({ type: 'open-file-at-revision', commitHash, origin }, context);
  }
  await dispatcher.dispatch({ type: 'open-file-at-revision', commitHash: 'b'.repeat(40), origin: state.messageOrigin }, context);
  assert.deepEqual(calls, []);
  await dispatcher.dispatch({ type: 'open-file-at-revision', commitHash, origin: state.messageOrigin }, context);
  assert.deepEqual(calls, ['open-file-at-revision']);
});

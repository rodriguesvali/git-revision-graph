import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import {
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../src/revisionGraphTypes';
import {
  RevisionGraphViewStateWorkflow,
  RevisionGraphViewStateWorkflowHost
} from '../src/revisionGraph/viewStateWorkflow';

test('RevisionGraphViewStateWorkflow selects a repository and schedules a full rebuild', async () => {
  const repository = createRepository('/repo');
  let currentRepository: Repository | undefined;
  const refreshes: unknown[] = [];
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    async pickRepository() {
      return repository;
    },
    setCurrentRepository(repositoryToSet) {
      currentRepository = repositoryToSet;
    },
    async refresh(request) {
      refreshes.push(request);
    }
  }));

  await workflow.chooseRepository();

  assert.equal(currentRepository, repository);
  assert.deepEqual(refreshes, ['full-rebuild']);
});

test('RevisionGraphViewStateWorkflow reposts current state when repository picking is canceled', async () => {
  const state = createReadyRevisionGraphState();
  const messages: RevisionGraphViewHostMessage[] = [];
  const refreshes: unknown[] = [];
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    getCurrentState: () => state,
    postHostMessage(message) {
      messages.push(message);
    },
    async refresh(request) {
      refreshes.push(request);
    }
  }));

  await workflow.chooseRepository();

  assert.deepEqual(messages, [{ type: 'update-state', state }]);
  assert.deepEqual(refreshes, []);
});

test('RevisionGraphViewStateWorkflow normalizes projection options and schedules a projection-only refresh', async () => {
  let projectionOptions = createReadyRevisionGraphState().projectionOptions;
  const refreshes: unknown[] = [];
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    getProjectionOptions: () => projectionOptions,
    setProjectionOptions(options) {
      projectionOptions = options;
    },
    async refresh(request) {
      refreshes.push(request);
    }
  }));

  await workflow.setProjectionOptions({ refScope: 'current' });

  assert.equal(projectionOptions.refScope, 'current');
  assert.equal(projectionOptions.showCurrentBranchDescendants, true);
  assert.deepEqual(refreshes, ['projection-only']);
});

test('RevisionGraphViewStateWorkflow keeps graph focus modes mutually exclusive', async () => {
  let projectionOptions: RevisionGraphViewState['projectionOptions'] = {
    ...createReadyRevisionGraphState().projectionOptions,
    revisionRange: {
      baseRevision: 'main',
      baseLabel: 'main',
      compareRevision: 'feature/demo',
      compareLabel: 'feature/demo'
    }
  };
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    getProjectionOptions: () => projectionOptions,
    setProjectionOptions(options) {
      projectionOptions = options;
    }
  }));

  await workflow.setProjectionOptions({
    descendantFocus: {
      anchorRevision: 'main-hash',
      anchorLabel: 'main'
    }
  });

  assert.equal(projectionOptions.revisionRange, undefined);
  assert.deepEqual(projectionOptions.descendantFocus, {
    anchorRevision: 'main-hash',
    anchorLabel: 'main'
  });

  await workflow.setProjectionOptions({
    revisionRange: {
      baseRevision: 'main',
      baseLabel: 'main',
      compareRevision: 'feature/demo',
      compareLabel: 'feature/demo'
    }
  });

  assert.equal(projectionOptions.descendantFocus, undefined);
  assert.deepEqual(projectionOptions.revisionRange, {
    baseRevision: 'main',
    baseLabel: 'main',
    compareRevision: 'feature/demo',
    compareLabel: 'feature/demo'
  });
});

test('RevisionGraphViewStateWorkflow clears active focus when the main scope changes', async () => {
  let projectionOptions: RevisionGraphViewState['projectionOptions'] = {
    ...createReadyRevisionGraphState().projectionOptions,
    descendantFocus: {
      anchorRevision: 'main',
      anchorLabel: 'main'
    }
  };
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    getProjectionOptions: () => projectionOptions,
    setProjectionOptions(options) {
      projectionOptions = options;
    }
  }));

  await workflow.setProjectionOptions({ refScope: 'local' });

  assert.equal(projectionOptions.refScope, 'local');
  assert.equal(projectionOptions.descendantFocus, undefined);
  assert.equal(projectionOptions.revisionRange, undefined);
});

test('RevisionGraphViewStateWorkflow preserves state for a stale descendant anchor', async () => {
  const state = createReadyRevisionGraphState();
  const messages: RevisionGraphViewHostMessage[] = [];
  const refreshes: unknown[] = [];
  let projectionOptions = state.projectionOptions;
  const workflow = new RevisionGraphViewStateWorkflow(createHost({
    getCurrentState: () => state,
    getProjectionOptions: () => projectionOptions,
    setProjectionOptions(options) {
      projectionOptions = options;
    },
    postHostMessage(message) {
      messages.push(message);
    },
    async refresh(request) {
      refreshes.push(request);
    }
  }));

  await workflow.setProjectionOptions({
    descendantFocus: {
      anchorRevision: 'missing',
      anchorLabel: 'missing'
    }
  });

  assert.equal(projectionOptions, state.projectionOptions);
  assert.deepEqual(messages, [{ type: 'update-state', state }]);
  assert.deepEqual(refreshes, []);
});

function createHost(
  overrides: Partial<RevisionGraphViewStateWorkflowHost> = {}
): RevisionGraphViewStateWorkflowHost {
  const state = createReadyRevisionGraphState();
  const host: RevisionGraphViewStateWorkflowHost = {
    async pickRepository() {
      return undefined;
    },
    setCurrentRepository() {},
    getCurrentState() {
      return state;
    },
    getProjectionOptions() {
      return state.projectionOptions;
    },
    setProjectionOptions() {},
    async refresh() {},
    postHostMessage() {}
  };

  return {
    ...host,
    ...overrides
  };
}

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
      nodes: [{
        hash: 'main-hash',
        refs: [{ name: 'main', kind: 'head' }],
        author: 'Ada',
        date: '2026-06-30',
        subject: 'Main',
        x: 0,
        row: 0,
        lane: 0
      }],
      edges: [],
      laneCount: 1,
      rowCount: 1
    },
    nodeLayouts: [],
    references: [],
    sceneLayoutKey: 'empty',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

function createRepository(repositoryPath: string): Repository {
  return {
    rootUri: {
      fsPath: repositoryPath
    }
  } as Repository;
}

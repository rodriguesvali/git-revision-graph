import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import {
  RevisionGraphMessageHandler,
  RevisionGraphMessageHandlerHost
} from '../src/revisionGraph/messageHandler';
import { RevisionGraphViewState } from '../src/revisionGraphTypes';
import { RemoteTagPublicationRequestContext } from '../src/revisionGraph/remoteTagState';

test('RevisionGraphMessageHandler rehydrates the webview for ready messages', async () => {
  let rehydrated = false;
  const handler = new RevisionGraphMessageHandler(createHost({
    rehydrateWebview() {
      rehydrated = true;
    }
  }));

  await handler.handleMessage({ type: 'webview-ready' });

  assert.equal(rehydrated, true);
});

test('RevisionGraphMessageHandler applies projection options and schedules a projection-only refresh', async () => {
  const refreshes: unknown[] = [];
  let projectionOptions = createReadyRevisionGraphState().projectionOptions;
  const handler = new RevisionGraphMessageHandler(createHost({
    getProjectionOptions: () => projectionOptions,
    setProjectionOptions(options) {
      projectionOptions = options;
    },
    async refresh(request) {
      refreshes.push(request);
    }
  }));

  await handler.handleMessage({
    type: 'set-projection-options',
    options: {
      refScope: 'current'
    }
  });

  assert.equal(projectionOptions.refScope, 'current');
  assert.equal(projectionOptions.showCurrentBranchDescendants, true);
  assert.deepEqual(refreshes, ['projection-only']);
});

test('RevisionGraphMessageHandler applies Flow Governance option updates through the host boundary', async () => {
  const updates: unknown[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    updateFlowGovernanceOptions(options) {
      updates.push(options);
    }
  }));

  await handler.handleMessage({
    type: 'set-flow-governance-options',
    options: {
      enabled: true
    }
  });

  assert.deepEqual(updates, [{
    enabled: true
  }]);
});

test('RevisionGraphMessageHandler validates release promotion through the host boundary', async () => {
  const validations: string[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    async validateFlowReleasePromotion(refName) {
      validations.push(refName);
    }
  }));

  await handler.handleMessage({
    type: 'validate-release-promotion',
    refName: 'release/1.0.0'
  });

  assert.deepEqual(validations, ['release/1.0.0']);
});

test('RevisionGraphMessageHandler starts Flow Governance branches through the host boundary', async () => {
  const calls: Array<{
    readonly branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
    readonly sourceRefName: string;
    readonly name: string;
    readonly description: string | undefined;
  }> = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    async startFlowBranch(branchKind, sourceRefName, name, description) {
      calls.push({ branchKind, sourceRefName, name, description });
    }
  }));

  await handler.handleMessage({
    type: 'start-flow-branch',
    branchKind: 'release',
    sourceRefName: 'main',
    name: '2.0.0',
    description: 'Release train'
  });
  await handler.handleMessage({
    type: 'start-flow-branch',
    branchKind: 'feature',
    sourceRefName: 'main',
    name: 'checkout-redesign'
  });
  await handler.handleMessage({
    type: 'start-flow-branch',
    branchKind: 'task',
    sourceRefName: 'feature/checkout-redesign',
    name: '4312-adjust-timeout',
    description: 'Keep checkout requests bounded'
  });
  await handler.handleMessage({
    type: 'start-flow-branch',
    branchKind: 'hotfix',
    sourceRefName: 'main',
    name: 'INC-482-login-timeout',
    description: 'Restore login availability'
  });
  await handler.handleMessage({
    type: 'start-flow-branch',
    branchKind: 'bug',
    sourceRefName: 'release/2.0.0',
    name: 'BUG-731-payment-rounding',
    description: 'Correct payment rounding'
  });

  assert.deepEqual(calls, [
    {
      branchKind: 'release',
      sourceRefName: 'main',
      name: '2.0.0',
      description: 'Release train'
    },
    {
      branchKind: 'feature',
      sourceRefName: 'main',
      name: 'checkout-redesign',
      description: undefined
    },
    {
      branchKind: 'task',
      sourceRefName: 'feature/checkout-redesign',
      name: '4312-adjust-timeout',
      description: 'Keep checkout requests bounded'
    },
    {
      branchKind: 'hotfix',
      sourceRefName: 'main',
      name: 'INC-482-login-timeout',
      description: 'Restore login availability'
    },
    {
      branchKind: 'bug',
      sourceRefName: 'release/2.0.0',
      name: 'BUG-731-payment-rounding',
      description: 'Correct payment rounding'
    }
  ]);
});

test('RevisionGraphMessageHandler runs Pull Request handoff through the host boundary', async () => {
  const calls: string[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    async copyFlowPullRequestContext(sourceRefName, targetRefName) {
      calls.push(`copy:${sourceRefName}->${targetRefName}`);
    },
    async openFlowPullRequestUrl(sourceRefName, targetRefName) {
      calls.push(`open:${sourceRefName}->${targetRefName}`);
    }
  }));

  await handler.handleMessage({
    type: 'copy-flow-pr-context',
    sourceRefName: 'release/1.0.0',
    targetRefName: 'main'
  });
  await handler.handleMessage({
    type: 'open-flow-pr-url',
    sourceRefName: 'release/1.0.0',
    targetRefName: 'main'
  });

  assert.deepEqual(calls, [
    'copy:release/1.0.0->main',
    'open:release/1.0.0->main'
  ]);
});

test('RevisionGraphMessageHandler prepares release equalization through the host boundary', async () => {
  const calls: string[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    async prepareFlowEqualization(releaseRefName, productionRefName) {
      calls.push(`${productionRefName}->${releaseRefName}`);
    }
  }));

  await handler.handleMessage({
    type: 'prepare-flow-equalization',
    releaseRefName: 'release/2.0.0',
    productionRefName: 'main'
  });

  assert.deepEqual(calls, ['main->release/2.0.0']);
});

test('RevisionGraphMessageHandler clears graph caches before empty-cache refresh', async () => {
  const calls: unknown[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    async clearLayoutCache() {
      calls.push('clear-layout-cache');
    },
    async refresh(request) {
      calls.push(request);
    }
  }));

  await handler.handleMessage({ type: 'refresh-with-empty-cache' });

  assert.deepEqual(calls, [
    'clear-layout-cache',
    { intent: 'full-rebuild', clearSnapshotCache: true }
  ]);
});

test('RevisionGraphMessageHandler handles clipboard copy actions through the host boundary', async () => {
  const clipboardWrites: string[] = [];
  const informationMessages: string[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    actionServices: createActionServices(informationMessages),
    async writeClipboard(text) {
      clipboardWrites.push(text);
    }
  }));

  await handler.handleMessage({ type: 'copy-commit-hash', commitHash: 'abcdef1234567890' });
  await handler.handleMessage({ type: 'copy-ref-name', refName: 'main', refKind: 'head' });

  assert.deepEqual(clipboardWrites, ['abcdef1234567890', 'main']);
  assert.deepEqual(informationMessages, ['Copied commit abcdef12.', 'Copied ref main.']);
});

test('RevisionGraphMessageHandler loads tooltip stats and opens commits on GitHub', async () => {
  const repository = createRepository('/workspace/repo');
  const hostMessages: unknown[] = [];
  const openedCommitHashes: string[] = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    getCurrentRepository: () => repository,
    async loadCommitShortStat(_repository, commitHash) {
      assert.equal(commitHash, 'head1');
      return { files: 3, insertions: 8, deletions: 2 };
    },
    async openCommitOnGitHub(_repository, commitHash) {
      openedCommitHashes.push(commitHash);
    },
    postHostMessage(message) {
      hostMessages.push(message);
    }
  }));

  await handler.handleMessage({ type: 'load-commit-short-stat', commitHash: 'head1' });
  await handler.handleMessage({ type: 'open-commit-on-github', commitHash: 'head1' });

  assert.deepEqual(hostMessages, [{
    type: 'set-commit-short-stat',
    commitHash: 'head1',
    shortStat: { files: 3, insertions: 8, deletions: 2 }
  }]);
  assert.deepEqual(openedCommitHashes, ['head1']);
});

test('RevisionGraphMessageHandler runs repository-scoped host actions with the current repository', async () => {
  const repository = createRepository('/workspace/repo');
  const openedDiffs: Array<{ repositoryPath: string; left: string; right: string }> = [];
  const handler = new RevisionGraphMessageHandler(createHost({
    getCurrentRepository: () => repository,
    async openUnifiedDiff(currentRepository, left, right) {
      openedDiffs.push({
        repositoryPath: currentRepository.rootUri.fsPath,
        left,
        right
      });
    }
  }));

  await handler.handleMessage({
    type: 'open-unified-diff',
    baseRevision: 'main',
    compareRevision: 'feature'
  });

  assert.deepEqual(openedDiffs, [{
    repositoryPath: '/workspace/repo',
    left: 'main',
    right: 'feature'
  }]);
});

test('RevisionGraphMessageHandler skips repository-scoped host actions without a current repository', async () => {
  let openedDiffCount = 0;
  const handler = new RevisionGraphMessageHandler(createHost({
    async openUnifiedDiff() {
      openedDiffCount += 1;
    }
  }));

  await handler.handleMessage({
    type: 'open-unified-diff',
    baseRevision: 'main',
    compareRevision: 'feature'
  });

  assert.equal(openedDiffCount, 0);
});

test('RevisionGraphMessageHandler posts current state when stash removal is canceled', async () => {
  const repository = createRepository('/workspace/repo');
  let currentStatePosts = 0;
  let stashDrops = 0;
  const handler = new RevisionGraphMessageHandler(createHost({
    getCurrentRepository: () => repository,
    actionServices: {
      ...createActionServices([]),
      referenceManager: {
        ...createActionServices([]).referenceManager,
        async stashDrop() {
          stashDrops += 1;
        }
      }
    },
    postCurrentState() {
      currentStatePosts += 1;
    }
  }));

  await handler.handleMessage({ type: 'stash-drop', refName: 'stash' });

  assert.equal(stashDrops, 0);
  assert.equal(currentStatePosts, 1);
});

function createHost(
  overrides: Partial<RevisionGraphMessageHandlerHost> = {}
): RevisionGraphMessageHandlerHost {
  const state = createReadyRevisionGraphState();
  const host: RevisionGraphMessageHandlerHost = {
    actionServices: createActionServices([]),
    showLogPresenter: {
      async showSource() {}
    },
    rehydrateWebview() {},
    async writeClipboard() {},
    async pickRepository() {
      return undefined;
    },
    async openUnifiedDiff() {},
    async loadCommitShortStat() {
      return undefined;
    },
    async openCommitOnGitHub() {},
    getCurrentRepository() {
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
    async clearLayoutCache() {},
    async runFetchCurrentRepository() {},
    postHostMessage() {},
    postCurrentState() {},
    updateFlowGovernanceOptions() {},
    async validateFlowReleasePromotion() {},
    async startFlowBranch() {},
    async prepareFlowEqualization() {},
    async copyFlowPullRequestContext() {},
    async openFlowPullRequestUrl() {},
    traceWebviewLoadEvent() {},
    createRemoteTagPublicationRequestContext(): RemoteTagPublicationRequestContext {
      return {
        repositoryPath: '/workspace/repo',
        state
      };
    },
    postRemoteTagStateIfCurrent() {}
  };

  return {
    ...host,
    ...overrides
  };
}

function createActionServices(informationMessages: string[]): RefActionServices {
  return {
    ui: {
      async pickChange() {
        return undefined;
      },
      async pickRemoteName() {
        return undefined;
      },
      async promptBranchName() {
        return undefined;
      },
      async promptTagName() {
        return undefined;
      },
      async promptRemoteBranchCheckout() {
        return undefined;
      },
      async pickCurrentBranchPushMode() {
        return undefined;
      },
      async confirm() {
        return false;
      },
      showInformationMessage(message) {
        informationMessages.push(message);
      },
      showWarningMessage() {},
      async showErrorMessage() {},
      async showSourceControl() {}
    },
    diffPresenter: {
      async openBetweenRefs() {},
      async openWithWorktree() {}
    },
    compareResultsPresenter: {
      async showBetweenRefs() {},
      async showWithWorktree() {}
    },
    refreshController: {
      prepare() {
        return undefined;
      },
      refresh() {}
    },
    referenceManager: {
      async createTag() {},
      async resetBranch() {},
      async resetCurrentBranch() {},
      async getRemoteNames() {
        return [];
      },
      async pushCurrentBranch() {
        return true;
      },
      async pushTag() {},
      async deleteRemoteTag() {},
      async deleteRemoteBranch() {},
      async unsetBranchUpstream() {},
      async abortMerge() {},
      async stashSave() {},
      async stashApply() {},
      async stashPop() {},
      async stashDrop() {}
    },
    ancestryInspector: {
      async isRefAncestorOfHead() {
        return false;
      }
    },
    formatPath(fsPath) {
      return fsPath;
    }
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
      nodes: [],
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
      fsPath: repositoryPath,
      toString() {
        return repositoryPath;
      }
    },
    state: {
      mergeChanges: [],
      indexChanges: [],
      workingTreeChanges: [],
      untrackedChanges: []
    }
  } as unknown as Repository;
}

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

test('RevisionGraphMessageHandler applies projection options and schedules a full refresh', async () => {
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
  assert.deepEqual(refreshes, ['full-rebuild']);
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
    async runFetchCurrentRepository() {},
    postHostMessage() {},
    postCurrentState() {},
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
      async resetWorkspace() {},
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
      async abortMerge() {}
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
      showCurrentBranchDescendants: false
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
      fsPath: repositoryPath
    }
  } as Repository;
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import {
  RevisionGraphCurrentHeadWorkflow,
  RevisionGraphCurrentHeadWorkflowHost
} from '../src/revisionGraph/currentHeadWorkflow';

test('RevisionGraphCurrentHeadWorkflow runs current HEAD actions with the current repository', async () => {
  const repository = createRepository('/repo');
  const calls: string[] = [];
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({ repository }),
    {
      async syncCurrentHeadWithUpstream(currentRepository) {
        calls.push(currentRepository.rootUri.fsPath);
        return true;
      }
    }
  );

  await workflow.syncCurrentHead();

  assert.deepEqual(calls, ['/repo']);
});

test('RevisionGraphCurrentHeadWorkflow posts current state when an action does not schedule refresh', async () => {
  let postCurrentStateCount = 0;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pullCurrentBranchFromUpstream() {
        return false;
      }
    }
  );

  await workflow.pullCurrentHead();

  assert.equal(postCurrentStateCount, 1);
});

test('RevisionGraphCurrentHeadWorkflow posts current state before awaiting a modal error', async () => {
  const events: string[] = [];
  let closeErrorMessage: (() => void) | undefined;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      actionServices: createActionServices({
        async showErrorMessage(_message, options) {
          events.push(options?.modal ? 'show-modal-error' : 'show-error');
          await new Promise<void>((resolve) => {
            closeErrorMessage = resolve;
          });
        }
      }),
      postCurrentState() {
        events.push('post-current-state');
      }
    }),
    {
      async syncCurrentHeadWithUpstream(_repository, services) {
        await services.ui.showErrorMessage('Could not synchronize.', { modal: true });
        return false;
      }
    }
  );

  const syncPromise = workflow.syncCurrentHead();
  const resultBeforeDismissal = await Promise.race([
    syncPromise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(events, ['post-current-state', 'show-modal-error']);

  closeErrorMessage?.();
  await syncPromise;
});

test('RevisionGraphCurrentHeadWorkflow does not post current state before awaiting a non-modal error', async () => {
  const events: string[] = [];
  let closeErrorMessage: (() => void) | undefined;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      actionServices: createActionServices({
        async showErrorMessage() {
          events.push('show-error');
          await new Promise<void>((resolve) => {
            closeErrorMessage = resolve;
          });
        }
      }),
      postCurrentState() {
        events.push('post-current-state');
      }
    }),
    {
      async syncCurrentHeadWithUpstream(_repository, services) {
        await services.ui.showErrorMessage('Could not synchronize.');
        return false;
      }
    }
  );

  const syncPromise = workflow.syncCurrentHead();
  const resultBeforeDismissal = await Promise.race([
    syncPromise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(events, ['show-error']);

  closeErrorMessage?.();
  await syncPromise;
  assert.deepEqual(events, ['show-error', 'post-current-state']);
});

test('RevisionGraphCurrentHeadWorkflow does not post current state when an action schedules refresh', async () => {
  let postCurrentStateCount = 0;
  let requestedMode: string | undefined;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pushCurrentBranchToUpstream(_repository, _services, mode) {
        requestedMode = mode;
        return true;
      }
    }
  );

  await workflow.pushCurrentHead('force-with-lease');

  assert.equal(postCurrentStateCount, 0);
  assert.equal(requestedMode, 'force-with-lease');
});

test('RevisionGraphCurrentHeadWorkflow posts current state when no repository is selected', async () => {
  let pushCount = 0;
  let postCurrentStateCount = 0;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pushCurrentBranchToUpstream() {
        pushCount += 1;
        return true;
      }
    }
  );

  await workflow.pushCurrentHead();

  assert.equal(pushCount, 0);
  assert.equal(postCurrentStateCount, 1);
});

function createHost(options: {
  readonly repository?: Repository;
  readonly actionServices?: RefActionServices;
  postCurrentState?(): void;
} = {}): RevisionGraphCurrentHeadWorkflowHost {
  return {
    actionServices: options.actionServices ?? createActionServices(),
    getCurrentRepository() {
      return options.repository;
    },
    postCurrentState() {
      options.postCurrentState?.();
    }
  };
}

function createActionServices(
  uiOverrides: Partial<RefActionServices['ui']> = {}
): RefActionServices {
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
      showInformationMessage() {},
      showWarningMessage() {},
      async showErrorMessage() {},
      async showSourceControl() {},
      ...uiOverrides
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
        return false;
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

function createRepository(repositoryPath: string): Repository {
  return {
    rootUri: {
      fsPath: repositoryPath
    }
  } as Repository;
}

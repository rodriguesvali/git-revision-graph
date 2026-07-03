import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import {
  RevisionGraphRefActionWorkflow,
  RevisionGraphRefActionWorkflowHost
} from '../src/revisionGraph/refActionWorkflow';

test('RevisionGraphRefActionWorkflow runs checkout with the current repository and graph target', async () => {
  const repository = createRepository('/repo');
  const checkouts: Array<{ readonly repositoryPath: string; readonly refName: string; readonly label: string; readonly kind: string | undefined }> = [];
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost({ repository }),
    {
      async checkoutResolvedReference(currentRepository, target) {
        checkouts.push({
          repositoryPath: currentRepository.rootUri.fsPath,
          refName: target.refName,
          label: target.label,
          kind: target.kind
        });
      }
    }
  );

  await workflow.checkout('main', 'head');

  assert.deepEqual(checkouts, [{
    repositoryPath: '/repo',
    refName: 'main',
    label: 'main',
    kind: 'head'
  }]);
});

test('RevisionGraphRefActionWorkflow skips reference actions without a current repository', async () => {
  let checkoutCount = 0;
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost(),
    {
      async checkoutResolvedReference() {
        checkoutCount += 1;
      }
    }
  );

  await workflow.checkout('main', 'head');

  assert.equal(checkoutCount, 0);
});

test('RevisionGraphRefActionWorkflow resets the current branch to a graph commit hash', async () => {
  const repository = createRepository('/repo');
  const resets: Array<{ readonly repositoryPath: string; readonly commitHash: string; readonly commitLabel: string }> = [];
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost({ repository }),
    {
      async resetCurrentBranchToCommit(currentRepository, commitHash, commitLabel) {
        resets.push({
          repositoryPath: currentRepository.rootUri.fsPath,
          commitHash,
          commitLabel
        });
      }
    }
  );

  await workflow.resetToCommit('abc123', 'v1.0.0');

  assert.deepEqual(resets, [{
    repositoryPath: '/repo',
    commitHash: 'abc123',
    commitLabel: 'v1.0.0'
  }]);
});

test('RevisionGraphRefActionWorkflow posts current state before awaiting a modal error', async () => {
  const repository = createRepository('/repo');
  const events: string[] = [];
  let closeErrorMessage: (() => void) | undefined;
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost({
      repository,
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
      async deleteResolvedReference(_repository, _target, services) {
        await services.ui.showErrorMessage('Could not delete.', { modal: true });
      }
    }
  );

  const deletePromise = workflow.deleteReference('origin/protected', 'remote');
  const resultBeforeDismissal = await Promise.race([
    deletePromise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(events, ['post-current-state', 'show-modal-error']);

  closeErrorMessage?.();
  await deletePromise;
});

function createHost(options: {
  readonly repository?: Repository;
  readonly actionServices?: RefActionServices;
  postCurrentState?(): void;
} = {}): RevisionGraphRefActionWorkflowHost {
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

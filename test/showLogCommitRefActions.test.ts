import test from 'node:test';
import assert from 'node:assert/strict';

import type { Repository } from '../src/git';
import type { RefActionServices, RefActionTarget } from '../src/refActions';
import { RepositoryMutationCoordinator } from '../src/repositoryMutationCoordinator';
import {
  getShowLogCommitRefActionTarget,
  runShowLogCommitRefAction,
  type ShowLogCommitRefActionWorkflows
} from '../src/showLog/commitRefActions';
import type { ShowLogState } from '../src/showLogShared';
import { createRepository, createRevisionLogEntry } from './fakes';

test('Show Log commit ref actions resolve a loaded commit target for branch and tag creation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createVisibleState(repository);
  const services = {} as RefActionServices;
  const calls: Array<{
    readonly action: 'create-branch' | 'create-tag';
    readonly repositoryPath: string;
    readonly target: RefActionTarget;
  }> = [];
  const workflows: ShowLogCommitRefActionWorkflows = {
    async createBranch(currentRepository, target) {
      calls.push({
        action: 'create-branch',
        repositoryPath: currentRepository.rootUri.fsPath,
        target
      });
    },
    async createTag(currentRepository, target) {
      calls.push({
        action: 'create-tag',
        repositoryPath: currentRepository.rootUri.fsPath,
        target
      });
    }
  };

  assert.deepEqual(getShowLogCommitRefActionTarget(state, 'abcdef123456'), {
    refName: 'abcdef123456',
    label: 'abc123',
    kind: 'commit'
  });
  assert.equal((await runShowLogCommitRefAction(
    state,
    'abcdef123456',
    'checkout',
    services,
    undefined,
    undefined,
    workflows
  )).status, 'completed');
  assert.equal((await runShowLogCommitRefAction(
    state,
    'abcdef123456',
    'create-tag',
    services,
    undefined,
    undefined,
    workflows
  )).status, 'completed');

  assert.deepEqual(calls, [
    {
      action: 'create-branch',
      repositoryPath: '/workspace/repo',
      target: { refName: 'abcdef123456', label: 'abc123', kind: 'commit' }
    },
    {
      action: 'create-tag',
      repositoryPath: '/workspace/repo',
      target: { refName: 'abcdef123456', label: 'abc123', kind: 'commit' }
    }
  ]);
});

test('Checkout to This suggests an editable branch name and creates it from the loaded commit', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const prompts: Array<{ readonly prompt: string; readonly value: string }> = [];
  const upstreamClears: string[] = [];
  const informationMessages: string[] = [];
  const services = {
    ui: {
      async promptBranchName(options: { readonly prompt: string; readonly value: string }) {
        prompts.push(options);
        return 'feature/from-show-log';
      },
      showInformationMessage(message: string) {
        informationMessages.push(message);
      }
    },
    referenceManager: {
      async unsetBranchUpstream(_repository: Repository, branchName: string) {
        upstreamClears.push(branchName);
      }
    }
  } as RefActionServices;

  const outcome = await runShowLogCommitRefAction(
    createVisibleState(repository),
    'abcdef123456',
    'checkout',
    services
  );

  assert.equal(outcome.status, 'completed');
  assert.deepEqual(prompts, [{
    prompt: 'Create a New Local Branch from abc123',
    value: 'commit-abcdef12'
  }]);
  assert.deepEqual(repository.calls.createBranch, [{
    name: 'feature/from-show-log',
    checkout: true,
    ref: 'abcdef123456'
  }]);
  assert.deepEqual(upstreamClears, ['feature/from-show-log']);
  assert.deepEqual(informationMessages, [
    'Branch feature/from-show-log was created and checked out from abc123.'
  ]);
});

test('Show Log commit ref actions ignore commits outside the current loaded state', async () => {
  const calls: string[] = [];
  const result = await runShowLogCommitRefAction(
    createVisibleState(createRepository({ root: '/workspace/repo' })),
    'missing',
    'checkout',
    {} as RefActionServices,
    undefined,
    undefined,
    {
      async createBranch() { calls.push('create-branch'); },
      async createTag() { calls.push('create-tag'); }
    }
  );

  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, []);
});

test('Show Log commit ref actions report unavailable Git services', async () => {
  const errors: string[] = [];
  const state = createVisibleState(createRepository({ root: '/workspace/repo' }));

  await runShowLogCommitRefAction(state, 'abcdef123456', 'checkout', undefined, undefined, {
    async showErrorMessage(message) { errors.push(message); }
  });
  await runShowLogCommitRefAction(state, 'abcdef123456', 'create-tag', undefined, undefined, {
    async showErrorMessage(message) { errors.push(message); }
  });

  assert.deepEqual(errors, [
    'Could not create the branch because Git actions are not ready yet.',
    'Could not create the tag because Git actions are not ready yet.'
  ]);
});

test('Show Log commit ref actions reject overlapping repository mutations', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createVisibleState(repository);
  const coordinator = new RepositoryMutationCoordinator();
  let releaseCheckout: (() => void) | undefined;
  const checkoutBlocked = new Promise<void>((resolve) => {
    releaseCheckout = resolve;
  });
  const workflows: ShowLogCommitRefActionWorkflows = {
    async createBranch() { await checkoutBlocked; },
    async createTag() {}
  };

  const checkout = runShowLogCommitRefAction(
    state,
    'abcdef123456',
    'checkout',
    createGuardableServices(),
    coordinator,
    undefined,
    workflows
  );
  await Promise.resolve();
  const tag = await runShowLogCommitRefAction(
    state,
    'abcdef123456',
    'create-tag',
    createGuardableServices(),
    coordinator,
    undefined,
    workflows
  );
  releaseCheckout?.();

  assert.equal(tag.status, 'rejected');
  assert.equal((await checkout).status, 'completed');
  coordinator.dispose();
});

function createVisibleState(repository: Repository): ShowLogState {
  return {
    kind: 'visible',
    sourceToken: '1',
    repository,
    source: { kind: 'target', revision: 'main', label: 'main' },
    showAllBranches: false,
    filterText: '',
    entries: [createRevisionLogEntry({
      hash: 'abcdef123456',
      shortHash: 'abc123'
    })],
    hasMore: false,
    searchTruncated: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: undefined,
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {}
  };
}

function createGuardableServices(): RefActionServices {
  return {
    ui: {},
    diffPresenter: {},
    compareResultsPresenter: {},
    refreshController: {},
    referenceManager: {},
    ancestryInspector: {},
    formatPath: (value) => value
  } as RefActionServices;
}

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

test('Show Log commit ref actions resolve a loaded commit target for checkout and tag creation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createVisibleState(repository);
  const services = {} as RefActionServices;
  const calls: Array<{
    readonly action: 'checkout' | 'create-tag';
    readonly repository: Repository;
    readonly target: RefActionTarget;
    readonly services: RefActionServices;
  }> = [];
  const workflows: ShowLogCommitRefActionWorkflows = {
    async checkout(currentRepository, target, currentServices) {
      calls.push({ action: 'checkout', repository: currentRepository, target, services: currentServices });
    },
    async createTag(currentRepository, target, currentServices) {
      calls.push({ action: 'create-tag', repository: currentRepository, target, services: currentServices });
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
      action: 'checkout',
      repository,
      target: { refName: 'abcdef123456', label: 'abc123', kind: 'commit' },
      services
    },
    {
      action: 'create-tag',
      repository,
      target: { refName: 'abcdef123456', label: 'abc123', kind: 'commit' },
      services
    }
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
      async checkout() { calls.push('checkout'); },
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
    'Could not check out the commit because Git actions are not ready yet.',
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
    async checkout() { await checkoutBlocked; },
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

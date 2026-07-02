import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import { prepareFlowEqualizationBranch } from '../src/revisionGraph/flow';
import { createRepository } from './fakes';

test('Flow Governance prepares a local equalization branch without pushing', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const confirmations: string[] = [];
  const informationMessages: string[] = [];
  const refreshes: unknown[] = [];
  const services = {
    ui: {
      async promptBranchName() { return 'sync/2.0.0'; },
      async confirm(options: { readonly message: string }) {
        confirmations.push(options.message);
        return true;
      },
      showInformationMessage(message: string) { informationMessages.push(message); },
      showWarningMessage() {},
      async showErrorMessage() {},
      async showSourceControl() {}
    },
    refreshController: {
      prepare() { return { cancel() {} }; },
      refresh(request: unknown) { refreshes.push(request); }
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    productionBranch: 'main',
    releaseBranch: 'release/2.0.0'
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'sync/2.0.0',
    checkout: true,
    ref: 'release/2.0.0'
  }]);
  assert.deepEqual(repository.calls.merge, ['main']);
  assert.deepEqual(repository.calls.push, []);
  assert.match(confirmations[0] ?? '', /will not push or merge into release\/2\.0\.0/i);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /created locally/);
});

test('Flow Governance equalization requires a sync helper branch', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = {
    ui: {
      async promptBranchName() { return 'feature/not-a-sync'; },
      async showErrorMessage(message: string) { errors.push(message); },
      showWarningMessage() {},
      async showSourceControl() {}
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    productionBranch: 'main',
    releaseBranch: 'release/2.0.0'
  }, services);

  assert.match(errors[0] ?? '', /sync\/\*/);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
});

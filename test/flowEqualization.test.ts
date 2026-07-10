import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import { prepareFlowEqualizationBranch } from '../src/revisionGraph/flow';
import { createRepository } from './fakes';

test('Flow Governance prepares a local equalization branch without pushing', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const descriptions: Array<{ branchName: string; description: string }> = [];
  const refreshes: unknown[] = [];
  const services = {
    ui: {
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
    originBranch: 'release/1.9.0',
    targetBranch: 'release/2.0.0',
    description: 'Bring the stable payment fix into the 2.0 release'
  }, services, {
    async setDescription(_repositoryPath, branchName, description) {
      descriptions.push({ branchName, description });
    }
  });

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'sync/2.0.0',
    checkout: true,
    ref: 'release/2.0.0'
  }]);
  assert.deepEqual(repository.calls.merge, ['release/1.9.0']);
  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(descriptions, [{
    branchName: 'sync/2.0.0',
    description: 'Bring the stable payment fix into the 2.0 release'
  }]);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /equalized with release\/1\.9\.0/);
});

test('Flow Governance prepares a local feature equalization branch', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const descriptions: string[] = [];
  const services = {
    ui: {
      showInformationMessage() {},
      showWarningMessage() {},
      async showErrorMessage() {},
      async showSourceControl() {}
    },
    refreshController: {
      prepare() { return { cancel() {} }; },
      refresh() {}
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'feature/payment-summary',
    description: 'Bring the stable platform baseline into the feature'
  }, services, {
    async setDescription(_repositoryPath, _branchName, description) {
      descriptions.push(description);
    }
  });

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'sync/payment-summary',
    checkout: true,
    ref: 'feature/payment-summary'
  }]);
  assert.deepEqual(repository.calls.merge, ['main']);
  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(descriptions, ['Bring the stable platform baseline into the feature']);
});

test('Flow Governance equalization requires a description', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = {
    ui: {
      async showErrorMessage(message: string) { errors.push(message); },
      showWarningMessage() {},
      async showSourceControl() {}
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'release/2.0.0',
    description: '   '
  }, services);

  assert.match(errors[0] ?? '', /Description is required/);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
});

test('Flow Governance equalization rejects the target release as its own origin', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = {
    ui: {
      async showErrorMessage(message: string) { errors.push(message); },
      showWarningMessage() {},
      async showSourceControl() {}
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'release/2.0.0',
    targetBranch: 'release/2.0.0',
    description: 'No self equalization'
  }, services);

  assert.match(errors[0] ?? '', /must differ/);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
});

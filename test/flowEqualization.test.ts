import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import { prepareFlowEqualizationBranch } from '../src/revisionGraph/flow';
import { createRepository } from './fakes';

test('Flow Governance prepares a local equalization branch without pushing', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const descriptions: Array<{ branchName: string; description: string }> = [];
  const targets: Array<{ branchName: string; targetRefName: string }> = [];
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
    async setTarget(_repositoryPath, branchName, targetRefName) {
      targets.push({ branchName, targetRefName });
    },
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
  assert.deepEqual(targets, [{
    branchName: 'sync/2.0.0',
    targetRefName: 'release/2.0.0'
  }]);
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
  const targets: string[] = [];
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
    async setTarget(_repositoryPath, _branchName, targetRefName) {
      targets.push(targetRefName);
    },
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
  assert.deepEqual(targets, ['feature/payment-summary']);
  assert.deepEqual(descriptions, ['Bring the stable platform baseline into the feature']);
});

test('Flow Governance creates equalization branches from the selected feature target before merging the origin', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
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
    originBranch: 'release/1.9.0',
    targetBranch: 'feature/payment-summary',
    description: 'Bring the release fix into the feature branch'
  }, services, {
    async setTarget() {}
  });

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'sync/payment-summary',
    checkout: true,
    ref: 'feature/payment-summary'
  }]);
  assert.deepEqual(repository.calls.merge, ['release/1.9.0']);
});

test('Flow Governance shows description persistence warnings modally and continues equalization', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const warningRequests: Array<{ readonly message: string; readonly modal: boolean | undefined }> = [];
  const services = {
    ui: {
      showInformationMessage() {},
      showWarningMessage(message: string, options?: { readonly modal?: boolean }) {
        warningRequests.push({ message, modal: options?.modal });
      },
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
    targetBranch: 'release/2.0.0',
    description: 'Bring production fixes into the release'
  }, services, {
    async setTarget() {},
    async setDescription() {
      throw new Error('description persistence failed');
    }
  });

  assert.equal(warningRequests.length, 1);
  assert.match(warningRequests[0].message, /description could not be saved/);
  assert.equal(warningRequests[0].modal, true);
  assert.deepEqual(repository.calls.merge, ['main']);
});

test('Flow Governance stops before merge when the equalization target cannot be persisted', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = {
    ui: {
      showInformationMessage() {},
      showWarningMessage() {},
      async showErrorMessage(message: string) { errors.push(message); },
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
    description: 'Bring production into the feature'
  }, services, {
    async setTarget() {
      throw new Error('target persistence failed');
    }
  });

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'sync/payment-summary',
    checkout: true,
    ref: 'feature/payment-summary'
  }]);
  assert.deepEqual(repository.calls.merge, []);
  assert.match(errors[0] ?? '', /equalization did not complete/);
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

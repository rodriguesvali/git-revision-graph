import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import {
  DEFAULT_FLOW_CONFIG,
  resolveFlowBranchName,
  resolveFlowReleaseBranchName,
  startFlowBranch,
  startFlowReleaseBranch
} from '../src/revisionGraph/flow';
import { RefType } from '../src/git';
import { createBranch, createRepository } from './fakes';

test('Flow Governance release branch names follow the configured release pattern', () => {
  assert.deepEqual(
    resolveFlowReleaseBranchName('2.0.0', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'release/2.0.0' }
  );
  assert.deepEqual(
    resolveFlowReleaseBranchName('release/2.0.0', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'release/2.0.0' }
  );
  assert.deepEqual(
    resolveFlowReleaseBranchName('2026.07', {
      patterns: {
        ...DEFAULT_FLOW_CONFIG.patterns,
        release: '^releases/.+'
      }
    }),
    { ok: true, branchName: 'releases/2026.07' }
  );
  assert.equal(
    resolveFlowReleaseBranchName('bad release name', DEFAULT_FLOW_CONFIG).ok,
    false
  );
});

test('Flow Governance feature branch names follow the configured feature pattern', () => {
  assert.deepEqual(
    resolveFlowBranchName('feature', 'checkout-redesign', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'feature/checkout-redesign' }
  );
  assert.deepEqual(
    resolveFlowBranchName('feature', 'feature/checkout-redesign', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'feature/checkout-redesign' }
  );
  assert.equal(
    resolveFlowBranchName('feature', 'bad feature name', DEFAULT_FLOW_CONFIG).ok,
    false
  );
});

test('Flow Governance task branch names combine the Dev Task number and short name', () => {
  assert.deepEqual(
    resolveFlowBranchName('task', '4312-adjust-timeout', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'task/4312-adjust-timeout' }
  );
  assert.equal(
    resolveFlowBranchName('task', '4312 adjust timeout', DEFAULT_FLOW_CONFIG).ok,
    false
  );
});

test('Flow Governance hotfix branch names combine the Hotfix ID and short name', () => {
  assert.deepEqual(
    resolveFlowBranchName('hotfix', 'INC-482-login-timeout', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'hotfix/INC-482-login-timeout' }
  );
  assert.equal(
    resolveFlowBranchName('hotfix', 'INC 482 login timeout', DEFAULT_FLOW_CONFIG).ok,
    false
  );
});

test('Flow Governance starts a local release branch from main', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'release/2.0.0',
    checkout: true,
    ref: 'main'
  }]);
  assert.deepEqual(upstreamClears, ['release/2.0.0']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Release branch release\/2\.0\.0 was created/);
});

test('Flow Governance starts a local feature branch from main', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowBranch(repository, {
    kind: 'feature',
    sourceBranch: 'main',
    name: 'checkout-redesign',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'feature/checkout-redesign',
    checkout: true,
    ref: 'main'
  }]);
  assert.deepEqual(upstreamClears, ['feature/checkout-redesign']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Feature branch feature\/checkout-redesign was created/);
});

test('Flow Governance starts a local task branch from its feature', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowBranch(repository, {
    kind: 'task',
    sourceBranch: 'feature/checkout-redesign',
    name: '4312-adjust-timeout',
    description: 'Keep checkout requests bounded',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'task/4312-adjust-timeout',
    checkout: true,
    ref: 'feature/checkout-redesign'
  }]);
  assert.deepEqual(upstreamClears, ['task/4312-adjust-timeout']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Task branch task\/4312-adjust-timeout was created/);
});

test('Flow Governance starts a local hotfix branch from main with a required description', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowBranch(repository, {
    kind: 'hotfix',
    sourceBranch: 'main',
    name: 'INC-482-login-timeout',
    description: 'Restore login availability while the permanent fix is prepared',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'hotfix/INC-482-login-timeout',
    checkout: true,
    ref: 'main'
  }]);
  assert.deepEqual(upstreamClears, ['hotfix/INC-482-login-timeout']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Hotfix branch hotfix\/INC-482-login-timeout was created/);
});

test('Flow Governance refuses a hotfix without a description before mutation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = createReleaseServices({ errors });

  await startFlowBranch(repository, {
    kind: 'hotfix',
    sourceBranch: 'main',
    name: 'INC-482-login-timeout',
    description: '   ',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, []);
  assert.match(errors[0] ?? '', /Description is required/);
});

test('Flow Governance refuses an existing release branch before mutation', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createBranch({ type: RefType.Head, name: 'release/2.0.0' })
    ]
  });
  const errors: string[] = [];
  const services = createReleaseServices({ errors });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, []);
  assert.match(errors[0] ?? '', /already exists/);
});

function createReleaseServices(options: {
  readonly errors?: string[];
  readonly informationMessages?: string[];
  readonly upstreamClears?: string[];
  readonly refreshes?: unknown[];
} = {}): RefActionServices {
  return {
    ui: {
      async pickChange() { return undefined; },
      async pickRemoteName() { return undefined; },
      async promptBranchName() { return undefined; },
      async promptTagName() { return undefined; },
      async promptRemoteBranchCheckout() { return undefined; },
      async pickCurrentBranchPushMode() { return undefined; },
      async confirm() { return false; },
      showInformationMessage(message) { options.informationMessages?.push(message); },
      showWarningMessage() {},
      async showErrorMessage(message) { options.errors?.push(message); },
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
        return { cancel() {} };
      },
      refresh(request) {
        options.refreshes?.push(request);
      }
    },
    referenceManager: {
      async createTag() {},
      async resetBranch() {},
      async resetCurrentBranch() {},
      async getRemoteNames() { return []; },
      async pushCurrentBranch() { return true; },
      async pushTag() {},
      async deleteRemoteTag() {},
      async deleteRemoteBranch() {},
      async unsetBranchUpstream(_repository, branchName) {
        options.upstreamClears?.push(branchName);
      },
      async abortMerge() {},
      async stashSave() {},
      async stashApply() {},
      async stashPop() {},
      async stashDrop() {}
    },
    ancestryInspector: {
      async isRefAncestorOfHead() { return false; }
    },
    formatPath(fsPath) {
      return fsPath;
    }
  };
}

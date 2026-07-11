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

test('Flow Governance bug branch names combine the Bug ID and short name', () => {
  assert.deepEqual(
    resolveFlowBranchName('bug', 'BUG-731-payment-rounding', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'bug/BUG-731-payment-rounding' }
  );
  assert.equal(
    resolveFlowBranchName('bug', 'BUG 731 payment rounding', DEFAULT_FLOW_CONFIG).ok,
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

test('Flow Governance offers to publish a newly created branch and sets upstream', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const informationMessages: string[] = [];
  const services = createReleaseServices({
    confirmations,
    confirmResult: true,
    remoteNames: ['origin'],
    informationMessages
  });

  await startFlowBranch(repository, {
    kind: 'feature',
    sourceBranch: 'main',
    name: 'checkout-redesign',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.match(confirmations[0]?.message ?? '', /created and checked out.*Publish it to a remote now/);
  assert.equal(confirmations[0]?.confirmLabel, 'Publish Branch');
  assert.deepEqual(repository.calls.push, [{
    remoteName: 'origin',
    branchName: 'feature/checkout-redesign',
    setUpstream: true
  }]);
  assert.match(informationMessages[0] ?? '', /published to origin\/feature\/checkout-redesign/);
});

test('Flow Governance lets the user choose the publication remote', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const remotePicks: Array<{ readonly names: readonly string[]; readonly placeHolder: string }> = [];
  const services = createReleaseServices({
    confirmResult: true,
    remoteNames: ['origin', 'fork'],
    pickedRemoteName: 'fork',
    remotePicks
  });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(remotePicks, [{
    names: ['origin', 'fork'],
    placeHolder: 'Choose a remote for release/2.0.0'
  }]);
  assert.equal(repository.calls.push[0]?.remoteName, 'fork');
  assert.equal(repository.calls.push[0]?.setUpstream, true);
});

test('Flow Governance keeps a newly created branch local when publication is declined', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const services = createReleaseServices({ confirmResult: false, remoteNames: ['origin'] });

  await startFlowBranch(repository, {
    kind: 'task',
    sourceBranch: 'feature/checkout-redesign',
    name: '4312-adjust-timeout',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.equal(repository.calls.createBranch.length, 1);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance keeps a newly created branch local when no remote is configured', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const services = createReleaseServices({
    confirmResult: true,
    remoteNames: [],
    informationMessages
  });

  await startFlowBranch(repository, {
    kind: 'feature',
    sourceBranch: 'main',
    name: 'checkout-redesign',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.push, []);
  assert.match(informationMessages[0] ?? '', /created locally, but no Git remote is configured/);
});

test('Flow Governance preserves the local branch when publication fails', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  repository.push = async () => {
    throw new Error('remote unavailable');
  };
  const errors: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({
    confirmResult: true,
    remoteNames: ['origin'],
    errors,
    refreshes
  });

  await startFlowBranch(repository, {
    kind: 'feature',
    sourceBranch: 'main',
    name: 'checkout-redesign',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.equal(repository.calls.createBranch.length, 1);
  assert.equal(refreshes.length, 1);
  assert.match(errors[0] ?? '', /was created locally, but could not be published.*remote unavailable/);
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

test('Flow Governance starts a local bug branch from release with a required description', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowBranch(repository, {
    kind: 'bug',
    sourceBranch: 'release/2.0.0',
    name: 'BUG-731-payment-rounding',
    description: 'Correct rounding in the release payment summary',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'bug/BUG-731-payment-rounding',
    checkout: true,
    ref: 'release/2.0.0'
  }]);
  assert.deepEqual(upstreamClears, ['bug/BUG-731-payment-rounding']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Bug branch bug\/BUG-731-payment-rounding was created/);
});

test('Flow Governance refuses a bug without a description before mutation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = createReleaseServices({ errors });

  await startFlowBranch(repository, {
    kind: 'bug',
    sourceBranch: 'feature/payment-summary',
    name: 'BUG-731-payment-rounding',
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
  readonly confirmations?: Array<{ readonly message: string; readonly confirmLabel: string }>;
  readonly confirmResult?: boolean;
  readonly remoteNames?: readonly string[];
  readonly pickedRemoteName?: string;
  readonly remotePicks?: Array<{ readonly names: readonly string[]; readonly placeHolder: string }>;
} = {}): RefActionServices {
  return {
    ui: {
      async pickChange() { return undefined; },
      async pickRemoteName(names, placeHolder) {
        options.remotePicks?.push({ names: [...names], placeHolder });
        return options.pickedRemoteName;
      },
      async promptBranchName() { return undefined; },
      async promptTagName() { return undefined; },
      async promptRemoteBranchCheckout() { return undefined; },
      async pickCurrentBranchPushMode() { return undefined; },
      async confirm(confirmation) {
        options.confirmations?.push(confirmation);
        return options.confirmResult ?? false;
      },
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
      async getRemoteNames() { return options.remoteNames ?? []; },
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

import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import {
  DEFAULT_FLOW_CONFIG,
  getFlowBranchStartSyncPolicy,
  prepareFlowBranchStart,
  resolveFlowBranchName,
  resolveFlowReleaseBranchName,
  startFlowBranch,
  startFlowReleaseBranch
} from '../src/revisionGraph/flow';
import { RefType } from '../src/git';
import { createBranch, createHead, createRepository } from './fakes';

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

test('Flow Governance selects synchronization policy from the governed branch source model', () => {
  assert.equal(getFlowBranchStartSyncPolicy('release'), 'exact-sync');
  assert.equal(getFlowBranchStartSyncPolicy('feature'), 'exact-sync');
  assert.equal(getFlowBranchStartSyncPolicy('hotfix'), 'exact-sync');
  assert.equal(getFlowBranchStartSyncPolicy('task'), 'not-behind');
  assert.equal(getFlowBranchStartSyncPolicy('bug'), 'not-behind');
});

test('Flow Governance opens the release form preflight immediately when main is synchronized', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' })
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmations }));

  assert.equal(ready, true);
  assert.deepEqual(confirmations, []);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance synchronizes a behind main after confirmation before opening the release form', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 2, { remote: 'origin', name: 'main' })
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const refreshes: unknown[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmations, confirmResult: true, refreshes }));

  assert.equal(ready, true);
  assert.match(confirmations[0]?.message ?? '', /main is not synchronized with origin\/main \(2 behind\)/);
  assert.equal(confirmations[0]?.confirmLabel, 'Synchronize and Continue');
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.deepEqual(repository.calls.pull, [true]);
  assert.deepEqual(repository.calls.push, []);
  assert.equal(refreshes.length, 1);
});

test('Flow Governance keeps the release form closed when synchronization is declined', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 1, { remote: 'origin', name: 'main' })
  });

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmResult: false }));

  assert.equal(ready, false);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance keeps the release form closed when synchronization fails', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 1, { remote: 'origin', name: 'main' })
  });
  repository.pull = async () => {
    throw new Error('remote unavailable');
  };
  const errors: string[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmResult: true, errors }));

  assert.equal(ready, false);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.match(errors[0] ?? '', /Could not synchronize the current branch.*remote unavailable/);
});

test('Flow Governance fetches before checking whether main is behind for a new feature', async () => {
  const head = createHead('main', 0, 0, { remote: 'origin', name: 'main' });
  const repository = createRepository({ root: '/workspace/repo', head });
  const originalFetch = repository.fetch.bind(repository);
  const loadingEvents: string[] = [];
  repository.fetch = async (options) => {
    loadingEvents.push('fetch');
    await originalFetch(options);
    (head as { behind: number | undefined }).behind = 2;
  };
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'feature',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmations, confirmResult: true }), {
    async runWithRemoteFetchLoading(operation) {
      loadingEvents.push('show:Fetching remotes...');
      try {
        return await operation();
      } finally {
        loadingEvents.push('hide');
      }
    }
  });

  assert.equal(ready, true);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.match(confirmations[0]?.message ?? '', /2 behind.*before starting a new feature/);
  assert.deepEqual(repository.calls.pull, [true]);
  assert.deepEqual(loadingEvents, ['show:Fetching remotes...', 'fetch', 'hide']);
});

test('Flow Governance keeps the branch form closed when upstream fetch fails', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 1, { remote: 'origin', name: 'main' })
  });
  repository.fetch = async () => {
    throw new Error('fetch unavailable');
  };
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const errors: string[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'feature',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmations, errors }));

  assert.equal(ready, false);
  assert.deepEqual(confirmations, []);
  assert.match(errors[0] ?? '', /Could not fetch origin\/main before checking main synchronization.*fetch unavailable/);
});

test('Flow Governance allows a task from an ahead-only feature after fetching', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo', 2, 0, { remote: 'origin', name: 'feature/demo' })
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'task',
    sourceBranch: 'feature/demo'
  }, createReleaseServices({ confirmations }));

  assert.equal(ready, true);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/feature/demo:refs/remotes/origin/feature/demo'
  }]);
  assert.deepEqual(confirmations, []);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance synchronizes a behind-only feature before starting a task', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo', 0, 1, { remote: 'origin', name: 'feature/demo' })
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'task',
    sourceBranch: 'feature/demo'
  }, createReleaseServices({ confirmations, confirmResult: true }));

  assert.equal(ready, true);
  assert.match(confirmations[0]?.message ?? '', /1 behind.*before starting a new task/);
  assert.deepEqual(repository.calls.pull, [true]);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance blocks a task when its feature has diverged from upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo', 2, 1, { remote: 'origin', name: 'feature/demo' })
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const warnings: string[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'task',
    sourceBranch: 'feature/demo'
  }, createReleaseServices({ confirmations, warnings }));

  assert.equal(ready, false);
  assert.deepEqual(confirmations, []);
  assert.match(warnings[0] ?? '', /has diverged from origin\/feature\/demo.*Reconcile the branch manually/);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance fast-forwards a behind non-current release base without switching branches', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/active'),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'main',
        behind: 1,
        upstream: { remote: 'origin', name: 'main' }
      })
    ]
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const refreshes: unknown[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmations, confirmResult: true, refreshes }));

  assert.equal(ready, true);
  assert.equal(confirmations[0]?.confirmLabel, 'Synchronize and Continue');
  assert.deepEqual(repository.calls.checkout, []);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.fetch, [
    { remote: 'origin', ref: 'refs/heads/main:refs/remotes/origin/main' },
    { remote: 'origin', ref: 'refs/heads/main:refs/heads/main' }
  ]);
  assert.equal(refreshes.length, 1);
});

test('Flow Governance blocks divergent non-current release bases after confirmation', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/active'),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'main',
        ahead: 1,
        behind: 1,
        upstream: { remote: 'origin', name: 'main' }
      })
    ]
  });
  const warnings: string[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmResult: true, warnings }));

  assert.equal(ready, false);
  assert.match(warnings[0] ?? '', /cannot be synchronized safely while another branch is checked out/);
  assert.deepEqual(repository.calls.fetch, [{
    remote: 'origin',
    ref: 'refs/heads/main:refs/remotes/origin/main'
  }]);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance keeps the release form closed when non-current fast-forward fails', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/active'),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'main',
        behind: 1,
        upstream: { remote: 'origin', name: 'main' }
      })
    ]
  });
  const originalFetch = repository.fetch.bind(repository);
  repository.fetch = async (options) => {
    if (options?.ref?.includes(':refs/heads/')) {
      throw new Error('fetch failed');
    }
    await originalFetch(options);
  };
  const errors: string[] = [];

  const ready = await prepareFlowBranchStart(repository, {
    kind: 'release',
    sourceBranch: 'main'
  }, createReleaseServices({ confirmResult: true, errors }));

  assert.equal(ready, false);
  assert.match(errors[0] ?? '', /Could not synchronize main with origin\/main.*fetch failed/);
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
    description: 'Prepare the 2.0.0 release train',
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
    description: 'Redesign the checkout experience',
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

test('Flow Governance shows description persistence warnings modally and continues branch creation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const warningRequests: Array<{ readonly message: string; readonly modal: boolean | undefined }> = [];
  const services = createReleaseServices({ warningRequests });

  await startFlowBranch(repository, {
    kind: 'feature',
    sourceBranch: 'main',
    name: 'checkout-redesign',
    description: 'Redesign the checkout experience',
    config: DEFAULT_FLOW_CONFIG
  }, services, {
    async setDescription() {
      throw new Error('description persistence failed');
    }
  });

  assert.equal(warningRequests.length, 1);
  assert.match(warningRequests[0].message, /description could not be saved/);
  assert.equal(warningRequests[0].modal, true);
  assert.deepEqual(repository.calls.createBranch, [{
    name: 'feature/checkout-redesign',
    checkout: true,
    ref: 'main'
  }]);
});

test('Flow Governance refuses any flow branch without a description before mutation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const services = createReleaseServices({ errors });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    description: '   ',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, []);
  assert.match(errors[0] ?? '', /Description is required/);
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
    description: 'Redesign the checkout experience',
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
    description: 'Prepare the 2.0.0 release train',
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
    description: 'Keep checkout requests bounded',
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
    description: 'Redesign the checkout experience',
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
    description: 'Redesign the checkout experience',
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
    description: 'Prepare the 2.0.0 release train',
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
  readonly warnings?: string[];
  readonly warningRequests?: Array<{
    readonly message: string;
    readonly modal: boolean | undefined;
  }>;
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
      showWarningMessage(message, messageOptions) {
        options.warnings?.push(message);
        options.warningRequests?.push({ message, modal: messageOptions?.modal });
      },
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

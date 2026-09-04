import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import {
  DEFAULT_FLOW_CONFIG,
  prepareFlowEqualizationBranch,
  prepareFlowEqualizationSources
} from '../src/revisionGraph/flow';
import { RefType } from '../src/git';
import { createBranch, createHead, createRepository } from './fakes';

const allowSourcePreflight = async () => true;

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
    prepareSources: allowSourcePreflight,
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

test('Flow Governance starts blocking equalization feedback only after preflight', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const events: string[] = [];
  const originalCreateBranch = repository.createBranch.bind(repository);
  const originalMerge = repository.merge.bind(repository);
  repository.createBranch = async (name, checkout, ref) => {
    events.push(`create:${name}`);
    return originalCreateBranch(name, checkout, ref);
  };
  repository.merge = async (ref) => {
    events.push(`merge:${ref}`);
    return originalMerge(ref);
  };

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'release/2.0.0',
    description: 'Bring production fixes into the release'
  }, createEqualizationServices({ progressEvents: events }), {
    async prepareSources() {
      events.push('preflight');
      return true;
    },
    async setDescription() {
      events.push('description');
    }
  });

  assert.deepEqual(events, [
    'preflight',
    'progress:start:blocking:Preparing equalization...',
    'create:sync/2.0.0',
    'description',
    'merge:main',
    'progress:stop'
  ]);
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
    prepareSources: allowSourcePreflight,
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

test('Flow Governance creates the configured canonical sync branch', async () => {
  const repository = createRepository({ root: '/workspace/repo' });

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'Latam/Release/2.0.0',
    description: 'Equalize the configured release',
    config: {
      patterns: {
        ...DEFAULT_FLOW_CONFIG.patterns,
        release: '^Latam/[rR]elease/.+$',
        feature: '^Latam/[fF]eature/.+$',
        sync: '^Latam/[sS]ync/.+$'
      }
    }
  }, createEqualizationServices(), {
    prepareSources: allowSourcePreflight,
  });

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'Latam/sync/2.0.0',
    checkout: true,
    ref: 'Latam/Release/2.0.0'
  }]);
});

test('Flow Governance blocks case-only remote sync collisions before mutation', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createBranch({
        type: RefType.RemoteHead,
        remote: 'origin',
        name: 'origin/Latam/Sync/2.0.0'
      })
    ]
  });
  const errors: string[] = [];

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'Latam/Release/2.0.0',
    description: 'Equalize the configured release',
    config: {
      patterns: {
        ...DEFAULT_FLOW_CONFIG.patterns,
        release: '^Latam/[rR]elease/.+$',
        feature: '^Latam/[fF]eature/.+$',
        sync: '^Latam/[sS]ync/.+$'
      }
    }
  }, createEqualizationServices({ errors }), {
    prepareSources: allowSourcePreflight
  });

  assert.deepEqual(repository.calls.createBranch, []);
  assert.match(
    errors[0] ?? '',
    /Latam\/sync\/2\.0\.0.*origin\/Latam\/Sync\/2\.0\.0.*letter case/
  );
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
    prepareSources: allowSourcePreflight,
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
  const events: string[] = [];
  const services = {
    ui: {
      showInformationMessage() {},
      showWarningMessage(message: string, options?: { readonly modal?: boolean }) {
        events.push('warning');
        warningRequests.push({ message, modal: options?.modal });
      },
      async showErrorMessage() {},
      async showSourceControl() {}
    },
    refreshController: {
      prepare() { return { cancel() {} }; },
      refresh() {}
    },
    progress: {
      async run(_label: string, _mode: string, operation: () => Promise<unknown>) {
        events.push('progress:start');
        try {
          return await operation();
        } finally {
          events.push('progress:stop');
        }
      }
    }
  } as unknown as RefActionServices;

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'release/2.0.0',
    description: 'Bring production fixes into the release'
  }, services, {
    prepareSources: allowSourcePreflight,
    async setDescription() {
      throw new Error('description persistence failed');
    }
  });

  assert.equal(warningRequests.length, 1);
  assert.match(warningRequests[0].message, /description could not be saved/);
  assert.equal(warningRequests[0].modal, true);
  assert.deepEqual(repository.calls.merge, ['main']);
  assert.deepEqual(events, ['progress:start', 'progress:stop', 'warning']);
});

test('Flow Governance equalization requires a description', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const errors: string[] = [];
  const progressEvents: string[] = [];
  const services = createEqualizationServices({ errors, progressEvents });

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'main',
    targetBranch: 'release/2.0.0',
    description: '   '
  }, services);

  assert.match(errors[0] ?? '', /Description is required/);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
  assert.deepEqual(progressEvents, []);
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

test('Flow Governance fetches target and origin before creating an equalization branch', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/payment-summary', 2, 0, {
      remote: 'origin',
      name: 'feature/payment-summary'
    }),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'release/2.0.0',
        ahead: 0,
        behind: 0,
        upstream: { remote: 'origin', name: 'release/2.0.0' }
      })
    ]
  });
  const events: string[] = [];
  const originalFetch = repository.fetch.bind(repository);
  const originalCreateBranch = repository.createBranch.bind(repository);
  repository.fetch = async (options) => {
    events.push(`fetch:${options?.ref}`);
    return originalFetch(options);
  };
  repository.createBranch = async (name, checkout, ref) => {
    events.push(`create:${name}`);
    return originalCreateBranch(name, checkout, ref);
  };

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'release/2.0.0',
    targetBranch: 'feature/payment-summary',
    description: 'Bring the release changes into the feature'
  }, createEqualizationServices(), {
    sourcePreflight: {
      async runWithRemoteFetchLoading(operation) {
        events.push('loading:show');
        try {
          return await operation();
        } finally {
          events.push('loading:hide');
        }
      }
    }
  });

  assert.deepEqual(events, [
    'loading:show',
    'fetch:refs/heads/feature/payment-summary:refs/remotes/origin/feature/payment-summary',
    'loading:hide',
    'loading:show',
    'fetch:refs/heads/release/2.0.0:refs/remotes/origin/release/2.0.0',
    'loading:hide',
    'create:sync/payment-summary'
  ]);
  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(repository.calls.merge, ['release/2.0.0']);
});

test('Flow Governance safely fast-forwards a behind non-current equalization source after confirmation', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/payment-summary', 0, 0, {
      remote: 'origin',
      name: 'feature/payment-summary'
    }),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'release/2.0.0',
        ahead: 0,
        behind: 2,
        upstream: { remote: 'origin', name: 'release/2.0.0' }
      })
    ]
  });
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];

  const ready = await prepareFlowEqualizationSources(repository, {
    targetBranch: 'feature/payment-summary',
    originBranch: 'release/2.0.0'
  }, createEqualizationServices({ confirmations, confirmResult: true }));

  assert.equal(ready, true);
  assert.match(confirmations[0]?.message ?? '', /release\/2\.0\.0.*2 behind.*preparing equalization/);
  assert.deepEqual(repository.calls.fetch, [
    {
      remote: 'origin',
      ref: 'refs/heads/feature/payment-summary:refs/remotes/origin/feature/payment-summary'
    },
    {
      remote: 'origin',
      ref: 'refs/heads/release/2.0.0:refs/remotes/origin/release/2.0.0'
    },
    {
      remote: 'origin',
      ref: 'refs/heads/release/2.0.0:refs/heads/release/2.0.0'
    }
  ]);
  assert.deepEqual(repository.calls.checkout, []);
  assert.deepEqual(repository.calls.push, []);
});

test('Flow Governance blocks equalization when a source diverged from its upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/payment-summary', 1, 1, {
      remote: 'origin',
      name: 'feature/payment-summary'
    }),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'release/2.0.0',
        ahead: 0,
        behind: 0,
        upstream: { remote: 'origin', name: 'release/2.0.0' }
      })
    ]
  });
  const warningRequests: Array<{ readonly message: string; readonly modal: boolean | undefined }> = [];

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'release/2.0.0',
    targetBranch: 'feature/payment-summary',
    description: 'Bring the release changes into the feature'
  }, createEqualizationServices({ warningRequests }));

  assert.equal(repository.calls.fetch.length, 1);
  assert.match(warningRequests[0]?.message ?? '', /has diverged.*before preparing equalization/);
  assert.equal(warningRequests[0]?.modal, true);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
});

test('Flow Governance blocks equalization when a source upstream cannot be fetched', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/payment-summary', 0, 0, {
      remote: 'origin',
      name: 'feature/payment-summary'
    }),
    refs: [
      createBranch({
        type: RefType.Head,
        name: 'release/2.0.0',
        ahead: 0,
        behind: 0,
        upstream: { remote: 'origin', name: 'release/2.0.0' }
      })
    ]
  });
  repository.fetch = async () => {
    throw new Error('remote unavailable');
  };
  const errors: string[] = [];

  await prepareFlowEqualizationBranch(repository, {
    originBranch: 'release/2.0.0',
    targetBranch: 'feature/payment-summary',
    description: 'Bring the release changes into the feature'
  }, createEqualizationServices({ errors }));

  assert.match(errors[0] ?? '', /Could not fetch origin\/feature\/payment-summary.*remote unavailable/);
  assert.deepEqual(repository.calls.createBranch, []);
  assert.deepEqual(repository.calls.merge, []);
});

function createEqualizationServices(options: {
  readonly errors?: string[];
  readonly confirmations?: Array<{ readonly message: string; readonly confirmLabel: string }>;
  readonly confirmResult?: boolean;
  readonly warningRequests?: Array<{ readonly message: string; readonly modal: boolean | undefined }>;
  readonly progressEvents?: string[];
} = {}): RefActionServices {
  return {
    ui: {
      async pickRemoteName() { return undefined; },
      async confirm(confirmation: { readonly message: string; readonly confirmLabel: string }) {
        options.confirmations?.push(confirmation);
        return options.confirmResult ?? false;
      },
      showInformationMessage() {},
      showWarningMessage(message: string, messageOptions?: { readonly modal?: boolean }) {
        options.warningRequests?.push({ message, modal: messageOptions?.modal });
      },
      async showErrorMessage(message: string) { options.errors?.push(message); },
      async showSourceControl() {}
    },
    referenceManager: {
      async getRemoteNames() { return []; }
    },
    refreshController: {
      prepare() { return { cancel() {} }; },
      refresh() {}
    },
    progress: options.progressEvents ? {
      async run<T>(label: string, mode: 'blocking' | 'subtle', operation: () => Promise<T>): Promise<T> {
        options.progressEvents?.push(`progress:start:${mode}:${label}`);
        try {
          return await operation();
        } finally {
          options.progressEvents?.push('progress:stop');
        }
      }
    } : undefined
  } as unknown as RefActionServices;
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { createApi, createRepository } from './fakes';
import { CONCURRENT_REPOSITORY_MUTATION_MESSAGE } from '../src/repositoryMutationWarning';
import { RepositoryMutationCoordinator } from '../src/repositoryMutationCoordinator';

test('Compare Results reuses, disposes, and recreates its editor panel', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(harness.extensionUri, {} as never);
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showBetweenRefs(repository, { refName: 'main', label: 'main' }, { refName: 'feature', label: 'feature' }, []);
  await provider.showBetweenRefs(repository, { refName: 'main', label: 'main' }, { refName: 'next', label: 'next' }, []);

  assert.equal(harness.panels.length, 1);
  assert.equal(harness.panels[0].revealCount, 1);
  harness.panels[0].dispose();
  await provider.showBetweenRefs(repository, { refName: 'main', label: 'main' }, { refName: 'feature', label: 'feature' }, []);
  assert.equal(harness.panels.length, 2);

  provider.handleRepositoryClosed(repository);
  assert.equal(harness.panels[1].disposed, true);
  provider.dispose();
});

test('Show Log reuses, disposes, and recreates its editor panel', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  const backend = {
    async loadRevisionLog() { return { entries: [], hasMore: false }; }
  } as never;
  const provider = new ShowLogViewProvider(harness.extensionUri, backend, {} as never);
  const repository = createRepository({ root: '/workspace/repo' });
  const source = { kind: 'target' as const, revision: 'main', label: 'main' };

  await provider.showSource(repository, source);
  await provider.showSource(repository, source);

  assert.equal(harness.panels.length, 1);
  assert.equal(harness.panels[0].revealCount, 1);
  harness.panels[0].dispose();
  await provider.showSource(repository, source);
  assert.equal(harness.panels.length, 2);

  provider.handleRepositoryClosed(repository);
  assert.equal(harness.panels[1].disposed, true);
  provider.dispose();
});

test('RevisionGraphController loads empty state and releases Git event subscriptions', async (t) => {
  const harness = installVscodePanelMock(t);
  const { RevisionGraphController } = loadFresh('../src/revisionGraph/controller') as typeof import('../src/revisionGraph/controller');
  const api = createApi([]);
  let openSubscriptionsDisposed = 0;
  let closeSubscriptionsDisposed = 0;
  const git = {
    ...api,
    onDidOpenRepository() { return { dispose() { openSubscriptionsDisposed += 1; } }; },
    onDidCloseRepository() { return { dispose() { closeSubscriptionsDisposed += 1; } }; }
  };
  const controller = new RevisionGraphController(
    harness.extensionUri,
    git,
    {} as never,
    {} as never,
    {} as never
  );
  const panel = harness.createPanel();

  await controller.resolveWebviewPanel(panel as never);
  await controller.refresh();

  assert.ok(panel.postedMessages.some((message) =>
    (message as { readonly type?: string }).type === 'update-state'
  ));
  panel.dispose();
  controller.dispose();
  assert.equal(openSubscriptionsDisposed, 1);
  assert.equal(closeSubscriptionsDisposed, 1);
});

test('Flow Pull Request workflow owns context clipboard orchestration', async (t) => {
  const harness = installVscodePanelMock(t);
  const { RevisionGraphFlowPullRequestWorkflow } = loadFresh(
    '../src/revisionGraph/flow/pullRequestWorkflow'
  ) as typeof import('../src/revisionGraph/flow/pullRequestWorkflow');
  const workflow = new RevisionGraphFlowPullRequestWorkflow({
    actionServices: {} as never,
    mutationCoordinator: {} as never,
    getCurrentRepository: () => undefined,
    getCurrentState: () => ({}) as never,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => assert.fail('No message should be posted without a repository.')
  });

  await workflow.copyContextField('feature/demo', 'main', 'title');
  await workflow.copyContext('feature/demo', 'main');

  assert.deepEqual(harness.clipboardWrites, ['Merge feature/demo into main']);
});

test('Feature Pull Request preflight verifies the remote release before checking commits ahead', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowPullRequestWorkflow } = loadFresh(
    '../src/revisionGraph/flow/pullRequestWorkflow'
  ) as typeof import('../src/revisionGraph/flow/pullRequestWorkflow');
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://github.com/example/repository.git',
      pushUrl: 'https://github.com/example/repository.git',
      isReadOnly: false
    }]
  });
  const calls: string[] = [];
  const hostMessages: unknown[] = [];
  const workflow = new RevisionGraphFlowPullRequestWorkflow({
    actionServices: createFlowPullRequestTestServices({
      showWarningMessage: () => assert.fail('No warning expected.'),
      showInformationMessage: () => undefined
    }),
    mutationCoordinator: new RepositoryMutationCoordinator(),
    getCurrentRepository: () => repository,
    getCurrentState: () => ({
      flowGovernance: {
        references: [
          { refName: 'feature/payment', kind: 'feature' },
          { refName: 'release/2.0.0', kind: 'release' }
        ]
      }
    }) as never,
    postActionLoading: (label) => calls.push(`loading:${label}`),
    postCurrentState: () => calls.push('loading:done'),
    postHostMessage: (message) => hostMessages.push(message)
  }, {
    async loadRemoteBranchCommit(_repository, remoteName, branchName) {
      calls.push(`remote:${remoteName}/${branchName}`);
      return { status: 'found', commit: 'remote-release-commit' };
    },
    async checkTarget(_path, sourceRefName, targetRefName, options) {
      calls.push(`target:${targetRefName}..${sourceRefName}`);
      assert.deepEqual(options, {
        requireTargetAncestor: false,
        requireTargetSynchronized: true,
        targetCommitish: 'remote-release-commit'
      });
      return { sourceRefName, targetRefName, status: 'ahead' };
    },
    async checkSourcePublication(_repository, remoteName, sourceRefName) {
      calls.push(`source:${remoteName}/${sourceRefName}`);
      return { status: 'ready', remoteName, sourceRefName, localAhead: 0, remoteAhead: 0 };
    }
  });

  await workflow.copyContext('feature/payment', 'release/2.0.0');

  assert.deepEqual(calls, [
    'loading:Fetching remotes...',
    'remote:origin/release/2.0.0',
    'loading:done',
    'target:release/2.0.0..feature/payment',
    'loading:Fetching remotes...',
    'source:origin/feature/payment',
    'loading:done'
  ]);
  assert.equal(hostMessages.length, 1);
});

test('Feature Pull Request preflight blocks behind, ahead, and divergent local releases', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowPullRequestWorkflow } = loadFresh(
    '../src/revisionGraph/flow/pullRequestWorkflow'
  ) as typeof import('../src/revisionGraph/flow/pullRequestWorkflow');
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://github.com/example/repository.git',
      pushUrl: 'https://github.com/example/repository.git',
      isReadOnly: false
    }]
  });
  const cases = [
    { localAhead: 0, remoteAhead: 2, expected: 'is behind origin/release/2.0.0 by 2 commit(s)' },
    { localAhead: 3, remoteAhead: 0, expected: 'is ahead of origin/release/2.0.0 by 3 commit(s)' },
    { localAhead: 1, remoteAhead: 1, expected: 'has diverged from origin/release/2.0.0' }
  ];

  for (const scenario of cases) {
    const warnings: Array<{ message: string; options?: { readonly modal?: boolean } }> = [];
    let sourceChecked = false;
    const workflow = new RevisionGraphFlowPullRequestWorkflow({
      actionServices: createFlowPullRequestTestServices({
        showWarningMessage(message: string, options?: { readonly modal?: boolean }) {
          warnings.push({ message, options });
        }
      }),
      mutationCoordinator: new RepositoryMutationCoordinator(),
      getCurrentRepository: () => repository,
      getCurrentState: () => ({
        flowGovernance: {
          references: [
            { refName: 'feature/payment', kind: 'feature' },
            { refName: 'release/2.0.0', kind: 'release' }
          ]
        }
      }) as never,
      postActionLoading: () => undefined,
      postCurrentState: () => undefined,
      postHostMessage: () => assert.fail('The context form must remain unpopulated.')
    }, {
      async loadRemoteBranchCommit() {
        return { status: 'found', commit: 'remote-release-commit' };
      },
      async checkTarget(_path, sourceRefName, targetRefName) {
        return {
          sourceRefName,
          targetRefName,
          status: 'production-out-of-sync',
          targetLocalAhead: scenario.localAhead,
          targetRemoteAhead: scenario.remoteAhead
        };
      },
      async checkSourcePublication(_repository, remoteName, sourceRefName) {
        sourceChecked = true;
        return { status: 'ready', remoteName, sourceRefName };
      }
    });

    await workflow.copyContext('feature/payment', 'release/2.0.0');

    assert.equal(sourceChecked, false);
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].message.includes(scenario.expected));
    assert.deepEqual(warnings[0].options, { modal: true });
  }
});

test('Flow Governance awaits the shared modal warning when a repository mutation is rejected', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowGovernanceWorkflow } = loadFresh(
    '../src/revisionGraph/flow/governanceWorkflow'
  ) as typeof import('../src/revisionGraph/flow/governanceWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  const warning = createBlockingWarningHarness();
  const workflow = new RevisionGraphFlowGovernanceWorkflow({
    actionServices: { ui: warning.ui } as never,
    mutationCoordinator: createRejectedMutationCoordinator(),
    getCurrentRepository: () => repository,
    getCurrentState: () => ({}) as never,
    setCurrentState: () => undefined,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => undefined
  });

  const operation = workflow.prepareEqualization('release/2.0.0', 'main', 'Equalize release');

  assert.equal(await getPromiseState(operation), 'pending');
  assert.deepEqual(warning.requests, [{
    message: CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
    options: { modal: true }
  }]);

  warning.dismiss();
  await operation;
});

test('Flow Pull Request preflight awaits the shared modal warning when a repository mutation is rejected', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowPullRequestWorkflow } = loadFresh(
    '../src/revisionGraph/flow/pullRequestWorkflow'
  ) as typeof import('../src/revisionGraph/flow/pullRequestWorkflow');
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://github.com/example/repository.git',
      pushUrl: 'https://github.com/example/repository.git',
      isReadOnly: false
    }]
  });
  const warning = createBlockingWarningHarness();
  const workflow = new RevisionGraphFlowPullRequestWorkflow({
    actionServices: { ui: warning.ui } as never,
    mutationCoordinator: createRejectedMutationCoordinator(),
    getCurrentRepository: () => repository,
    getCurrentState: () => ({
      flowGovernance: {
        references: [
          { refName: 'release/2.0.0', kind: 'release' },
          { refName: 'main', kind: 'main' }
        ]
      }
    }) as never,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => assert.fail('No Pull Request context should be posted.')
  });

  const operation = workflow.copyContext('release/2.0.0', 'main');

  assert.equal(await getPromiseState(operation), 'pending');
  assert.deepEqual(warning.requests, [{
    message: CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
    options: { modal: true }
  }]);

  warning.dismiss();
  await operation;
});

function createRejectedMutationCoordinator(): never {
  return {
    async run() {
      return { status: 'rejected' as const };
    }
  } as never;
}

function createFlowPullRequestTestServices(ui: object): never {
  return {
    ui,
    diffPresenter: {},
    compareResultsPresenter: {},
    refreshController: { refresh: () => undefined },
    referenceManager: {},
    ancestryInspector: {},
    formatPath: (value: string) => value
  } as never;
}

function createBlockingWarningHarness(): {
  readonly ui: {
    showWarningMessage(message: string, options?: { readonly modal?: boolean }): Promise<void>;
  };
  readonly requests: Array<{
    readonly message: string;
    readonly options: { readonly modal?: boolean } | undefined;
  }>;
  dismiss(): void;
} {
  const requests: Array<{
    readonly message: string;
    readonly options: { readonly modal?: boolean } | undefined;
  }> = [];
  let dismissWarning: (() => void) | undefined;
  return {
    ui: {
      async showWarningMessage(message, options) {
        requests.push({ message, options });
        await new Promise<void>((resolve) => {
          dismissWarning = resolve;
        });
      }
    },
    requests,
    dismiss() {
      dismissWarning?.();
    }
  };
}

async function getPromiseState(promise: Promise<unknown>): Promise<'completed' | 'pending'> {
  return Promise.race([
    promise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);
}

interface TestPanel {
  readonly webview: Record<string, unknown>;
  readonly postedMessages: unknown[];
  title: string;
  revealCount: number;
  disposed: boolean;
  iconPath?: unknown;
  reveal(): void;
  dispose(): void;
  onDidDispose(listener: () => void): { dispose(): void };
}

function installVscodePanelMock(t: test.TestContext): {
  readonly extensionUri: never;
  readonly panels: TestPanel[];
  readonly clipboardWrites: string[];
  createPanel(): TestPanel;
} {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  const panels: TestPanel[] = [];
  const clipboardWrites: string[] = [];
  const createPanel = (): TestPanel => {
    const disposeListeners = new Set<() => void>();
    const messageListeners = new Set<(message: unknown) => void>();
    const postedMessages: unknown[] = [];
    const panel: TestPanel = {
      title: '',
      revealCount: 0,
      disposed: false,
      postedMessages,
      webview: {
        html: '',
        options: {},
        cspSource: 'vscode-webview-resource:',
        asWebviewUri: (uri: unknown) => ({ toString: () => String((uri as { path?: string }).path ?? uri) }),
        postMessage: async (message: unknown) => { postedMessages.push(message); return true; },
        onDidReceiveMessage(listener: (message: unknown) => void) {
          messageListeners.add(listener);
          return { dispose: () => messageListeners.delete(listener) };
        }
      },
      reveal() { panel.revealCount += 1; },
      dispose() {
        if (panel.disposed) return;
        panel.disposed = true;
        for (const listener of [...disposeListeners]) listener();
      },
      onDidDispose(listener: () => void) {
        disposeListeners.add(listener);
        return { dispose: () => disposeListeners.delete(listener) };
      }
    };
    panels.push(panel);
    return panel;
  };
  const extensionUri = { path: '/extension', fsPath: '/extension', toString: () => '/extension' };
  const vscodeMock = {
    Disposable: {
      from: (...disposables: Array<{ dispose(): void }>) => ({
        dispose: () => disposables.forEach((disposable) => disposable.dispose())
      })
    },
    Uri: {
      joinPath: (base: { path?: string }, ...parts: string[]) => ({
        path: [base.path ?? '', ...parts].join('/'),
        fsPath: [base.path ?? '', ...parts].join('/'),
        toString() { return this.path; }
      })
    },
    ViewColumn: { One: 1 },
    ThemeIcon: class {},
    window: {
      createWebviewPanel: () => createPanel(),
      showInformationMessage: async () => undefined,
      showWarningMessage: async () => undefined,
      showErrorMessage: async () => undefined,
      showQuickPick: async () => undefined,
      createOutputChannel: () => ({ appendLine() {}, dispose() {} })
    },
    workspace: {
      asRelativePath: (value: { fsPath?: string } | string) => typeof value === 'string' ? value : value.fsPath ?? '',
      getConfiguration: () => ({ get: <T>(_key: string, fallback?: T) => fallback })
    },
    commands: { executeCommand: async () => undefined },
    env: {
      clipboard: { writeText: async (value: string) => { clipboardWrites.push(value); } },
      openExternal: async () => true
    }
  };

  moduleLoader._load = function loadWithVscodeMock(request, parent, isMain): unknown {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  t.after(() => { moduleLoader._load = originalLoad; });
  return { extensionUri: extensionUri as never, panels, clipboardWrites, createPanel };
}

function loadFresh(moduleId: string): unknown {
  const modulePath = require.resolve(moduleId);
  delete require.cache[modulePath];
  return require(moduleId) as unknown;
}

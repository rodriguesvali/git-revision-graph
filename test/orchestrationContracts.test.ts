import test from 'node:test';
import assert from 'node:assert/strict';

import { createApi, createRepository } from './fakes';

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
    postHostMessage: () => assert.fail('No message should be posted without a repository.')
  });

  await workflow.copyContextField('feature/demo', 'main', 'title');
  await workflow.copyContext('feature/demo', 'main');

  assert.deepEqual(harness.clipboardWrites, ['Merge feature/demo into main']);
});

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

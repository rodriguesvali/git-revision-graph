import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  createApi,
  createChange,
  createRepository,
  createRevisionLogEntry
} from './fakes';
import type { Change } from '../src/git';
import { compareResolvedRefs } from '../src/refActions/compare';
import { compareLoadedShowLogCommits } from '../src/showLog/commitCompare';
import { CONCURRENT_REPOSITORY_MUTATION_MESSAGE } from '../src/repositoryMutationWarning';

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

test('Compare Results keeps the latest same-repository comparison when requests finish out of order', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(harness.extensionUri, {} as never);
  const first = createDeferred<Change[]>();
  const second = createDeferred<Change[]>();
  const repository = createRepository({ root: '/workspace/repo' });
  repository.diffBetween = async (_left, right) =>
    right === 'feature/first' ? first.promise : second.promise;
  const messages: string[] = [];
  const services = createCompareActionServices(provider, messages);

  const firstOperation = compareResolvedRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature/first', label: 'feature/first' },
    services
  );
  const secondOperation = compareResolvedRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature/latest', label: 'feature/latest' },
    services
  );

  second.resolve([createChange({ uriPath: '/workspace/repo/src/latest.ts' })]);
  await secondOperation;
  first.resolve([createChange({ uriPath: '/workspace/repo/src/stale.ts' })]);
  await firstOperation;

  const resultStates = getCompareResultsStates(harness.panels[0])
    .filter((state) => state.kind === 'results');
  assert.deepEqual(
    resultStates.map((state) => ({
      sourceLabel: state.sourceLabel,
      targetLabel: state.targetLabel,
      paths: state.items.map((item) => item.path)
    })),
    [{
      sourceLabel: 'main',
      targetLabel: 'feature/latest',
      paths: ['src/latest.ts']
    }]
  );
  assert.deepEqual(messages, []);
  provider.dispose();
});

test('Compare Results ignores stale errors after a newer repository owns the panel', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(harness.extensionUri, {} as never);
  const stale = createDeferred<Change[]>();
  const latest = createDeferred<Change[]>();
  const staleRepository = createRepository({ root: '/workspace/stale-repo' });
  const latestRepository = createRepository({ root: '/workspace/latest-repo' });
  staleRepository.diffBetween = async () => stale.promise;
  latestRepository.diffBetween = async () => latest.promise;
  const messages: string[] = [];
  const services = createCompareActionServices(provider, messages);

  const staleOperation = compareResolvedRefs(
    staleRepository,
    { refName: 'main', label: 'stale-main' },
    { refName: 'feature', label: 'stale-feature' },
    services
  );
  const latestOperation = compareResolvedRefs(
    latestRepository,
    { refName: 'main', label: 'latest-main' },
    { refName: 'release', label: 'latest-release' },
    services
  );

  latest.resolve([createChange({ uriPath: '/workspace/latest-repo/src/latest.ts' })]);
  await latestOperation;
  stale.reject(new Error('stale repository failed'));
  await staleOperation;

  const resultStates = getCompareResultsStates(harness.panels[0])
    .filter((state) => state.kind === 'results');
  assert.deepEqual(
    resultStates.map((state) => ({
      sourceLabel: state.sourceLabel,
      targetLabel: state.targetLabel,
      paths: state.items.map((item) => item.path)
    })),
    [{
      sourceLabel: 'latest-main',
      targetLabel: 'latest-release',
      paths: ['src/latest.ts']
    }]
  );
  assert.deepEqual(messages, []);
  provider.dispose();
});

test('Compare Results keeps newer loading visible when an older empty comparison completes', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(harness.extensionUri, {} as never);
  const stale = createDeferred<Change[]>();
  const latest = createDeferred<Change[]>();
  const repository = createRepository({ root: '/workspace/repo' });
  repository.diffBetween = async (_left, right) =>
    right === 'feature/stale' ? stale.promise : latest.promise;
  const messages: string[] = [];
  const services = createCompareActionServices(provider, messages);

  const staleOperation = compareResolvedRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature/stale', label: 'feature/stale' },
    services
  );
  const latestOperation = compareResolvedRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature/latest', label: 'feature/latest' },
    services
  );

  stale.resolve([]);
  await staleOperation;

  const stateAfterStaleCompletion = getCompareResultsStates(harness.panels[0]).at(-1);
  assert.equal(stateAfterStaleCompletion?.kind, 'loading');
  assert.equal(stateAfterStaleCompletion?.targetLabel, 'feature/latest');
  assert.deepEqual(messages, []);

  latest.resolve([createChange({ uriPath: '/workspace/repo/src/latest.ts' })]);
  await latestOperation;
  provider.dispose();
});

test('Compare Results does not recreate a request after its repository closes', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(harness.extensionUri, {} as never);
  const visibleRepository = createRepository({ root: '/workspace/visible-repo' });
  const closingRepository = createRepository({ root: '/workspace/closing-repo' });
  const stale = createDeferred<Change[]>();
  closingRepository.diffBetween = async () => stale.promise;
  await provider.showBetweenRefs(
    visibleRepository,
    { refName: 'main', label: 'visible-main' },
    { refName: 'release', label: 'visible-release' },
    [createChange({ uriPath: '/workspace/visible-repo/src/visible.ts' })]
  );

  const operation = compareLoadedShowLogCommits(
    closingRepository,
    [
      createRevisionLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' }),
      createRevisionLogEntry({ hash: 'b'.repeat(40), shortHash: 'bbbbbbb' })
    ],
    'a'.repeat(40),
    'b'.repeat(40),
    provider
  );
  provider.handleRepositoryClosed(closingRepository);
  stale.resolve([createChange({ uriPath: '/workspace/closing-repo/src/stale.ts' })]);
  await operation;

  assert.equal(harness.panels.length, 1);
  assert.equal(harness.panels[0].disposed, true);
  provider.dispose();
});

test('Compare Results cancels and ignores an AI briefing when the comparison changes', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  let resolveGeneration: ((value: { readonly status: 'ready'; readonly content: string }) => void) | undefined;
  let generationToken: { readonly isCancellationRequested: boolean } | undefined;
  const provider = new CompareResultsViewProvider(
    harness.extensionUri,
    {
      async loadUnifiedDiff() {
        return 'diff --git a/src/app.ts b/src/app.ts\n+change\n';
      }
    } as never,
    undefined,
    {
      async generate(_input, token) {
        generationToken = token;
        return new Promise((resolve) => { resolveGeneration = resolve; });
      }
    }
  );
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showBetweenRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature', label: 'feature' },
    [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  );
  harness.panels[0].receiveMessage({ type: 'generateBriefing' });
  await waitForAsyncHandlers();
  assert.ok(harness.panels[0].postedMessages.some((message) =>
    (message as { readonly state?: { readonly briefing?: { readonly kind?: string } } })
      .state?.briefing?.kind === 'loading'
  ));

  await provider.showBetweenRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'next', label: 'next' },
    [createChange({ uriPath: '/workspace/repo/src/next.ts' })]
  );
  assert.equal(generationToken?.isCancellationRequested, true);
  resolveGeneration?.({ status: 'ready', content: 'stale briefing' });
  await waitForAsyncHandlers();

  const states = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: unknown }).state)
    .filter((state): state is { readonly briefing?: { readonly content?: string } } => !!state);
  assert.equal(states.some((state) => state.briefing?.content === 'stale briefing'), false);
  assert.deepEqual(states.at(-1)?.briefing, { kind: 'idle' });
  provider.dispose();
});

test('Compare Results lets the user cancel AI regeneration and restores the ready briefing', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  let generationCount = 0;
  let resolveRegeneration: ((value: { readonly status: 'ready'; readonly content: string }) => void) | undefined;
  let regenerationToken: { readonly isCancellationRequested: boolean } | undefined;
  const provider = new CompareResultsViewProvider(
    harness.extensionUri,
    {
      async loadUnifiedDiff() {
        return 'diff --git a/src/app.ts b/src/app.ts\n+change\n';
      }
    } as never,
    undefined,
    {
      async generate(_input, token) {
        generationCount++;
        if (generationCount === 1) {
          return { status: 'ready', content: 'Original briefing' };
        }
        regenerationToken = token;
        return new Promise((resolve) => { resolveRegeneration = resolve; });
      }
    }
  );
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showBetweenRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature', label: 'feature' },
    [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  );
  harness.panels[0].receiveMessage({ type: 'generateBriefing' });
  await waitForAsyncHandlers();
  harness.panels[0].receiveMessage({ type: 'generateBriefing' });
  await waitForAsyncHandlers();
  harness.panels[0].receiveMessage({ type: 'cancelBriefing' });
  await waitForAsyncHandlers();

  assert.equal(regenerationToken?.isCancellationRequested, true);
  const statesAfterCancel = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: unknown }).state)
    .filter((state): state is { readonly briefing?: { readonly content?: string } } => !!state);
  assert.deepEqual(statesAfterCancel.at(-1)?.briefing, {
    kind: 'ready',
    content: 'Original briefing'
  });

  resolveRegeneration?.({ status: 'ready', content: 'Stale regenerated briefing' });
  await waitForAsyncHandlers();
  const finalStates = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: unknown }).state)
    .filter((state): state is { readonly briefing?: { readonly content?: string } } => !!state);
  assert.equal(finalStates.some((state) =>
    state.briefing?.content === 'Stale regenerated briefing'
  ), false);
  provider.dispose();
});

test('Compare Results copies only the current generated AI briefing', async (t) => {
  const harness = installVscodePanelMock(t);
  const { CompareResultsViewProvider } = loadFresh('../src/compareResultsView') as typeof import('../src/compareResultsView');
  const provider = new CompareResultsViewProvider(
    harness.extensionUri,
    {
      async loadUnifiedDiff() {
        return 'diff --git a/src/app.ts b/src/app.ts\n+change\n';
      }
    } as never,
    undefined,
    {
      async generate() {
        return { status: 'ready', content: 'Summary\nReview src/app.ts.' };
      }
    }
  );
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showBetweenRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'feature', label: 'feature' },
    [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  );
  harness.panels[0].receiveMessage({ type: 'copyBriefing' });
  await waitForAsyncHandlers();
  assert.deepEqual(harness.clipboardWrites, []);

  harness.panels[0].receiveMessage({ type: 'generateBriefing' });
  await waitForAsyncHandlers();
  harness.panels[0].receiveMessage({ type: 'copyBriefing' });
  await waitForAsyncHandlers();

  assert.deepEqual(harness.clipboardWrites, ['Summary\nReview src/app.ts.']);
  provider.dispose();
});

test('Show Log reuses, disposes, and recreates its editor panel', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  const backend = {
    async loadRevisionLog() { return { entries: [], hasMore: false, searchTruncated: false }; }
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

test('Show Log scopes target sources until all branches is explicitly enabled', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  const showAllBranchesValues: boolean[] = [];
  const loadedSources: unknown[] = [];
  const backend = {
    async loadRevisionLog(
      _repository: unknown,
      source: unknown,
      _limit: number,
      _skip: number,
      showAllBranches: boolean
    ) {
      loadedSources.push(source);
      showAllBranchesValues.push(showAllBranches);
      return { entries: [], hasMore: false, searchTruncated: false };
    }
  } as never;
  const provider = new ShowLogViewProvider(harness.extensionUri, backend, {} as never);

  await provider.showSource(
    createRepository({ root: '/workspace/repo' }),
    { kind: 'target', revision: 'feature/demo', label: 'feature/demo' }
  );

  let visibleState = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: { readonly showAllBranches?: boolean } }).state)
    .filter((state) => !!state)
    .at(-1);

  assert.deepEqual(loadedSources, [
    { kind: 'target', revision: 'feature/demo', label: 'feature/demo' }
  ]);
  assert.deepEqual(showAllBranchesValues, [false]);
  assert.equal(visibleState?.showAllBranches, false);

  harness.panels[0].receiveMessage({ type: 'toggleShowAllBranches', value: true });
  await waitForAsyncHandlers();

  visibleState = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: { readonly showAllBranches?: boolean } }).state)
    .filter((state) => !!state)
    .at(-1);
  assert.deepEqual(showAllBranchesValues, [false, true]);
  assert.equal(visibleState?.showAllBranches, true);
  provider.dispose();
});

test('Show Log reloads the current commit references after creating a tag', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  let loadCount = 0;
  const backend = {
    async loadRevisionLog() {
      loadCount += 1;
      return {
        entries: [createRevisionLogEntry({
          hash: 'abcdef123456',
          shortHash: 'abcdef12',
          references: loadCount > 1 ? [{ name: 'test-01', kind: 'tag' }] : []
        })],
        hasMore: false,
        searchTruncated: false
      };
    }
  } as never;
  const createdTags: Array<{ readonly tagName: string; readonly refName: string }> = [];
  const services = {
    ui: {
      async promptTagName() { return 'test-01'; },
      showInformationMessage() {}
    },
    refreshController: {
      prepare() { return undefined; },
      refresh() {}
    },
    referenceManager: {
      async createTag(_repository: unknown, tagName: string, refName: string) {
        createdTags.push({ tagName, refName });
      }
    }
  } as never;
  const provider = new ShowLogViewProvider(
    harness.extensionUri,
    backend,
    {} as never,
    () => services
  );
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showSource(
    repository,
    { kind: 'target', revision: 'main', label: 'main' }
  );
  harness.panels[0].receiveMessage({
    type: 'createTagFromCommit',
    commitHash: 'abcdef123456'
  });
  await waitForAsyncHandlers();

  const finalState = harness.panels[0].postedMessages
    .map((message) => (message as {
      readonly state?: {
        readonly commits?: ReadonlyArray<{
          readonly refs: ReadonlyArray<{ readonly name: string; readonly kind: string }>;
        }>;
      };
    }).state)
    .filter((state) => !!state)
    .at(-1);
  assert.equal(loadCount, 2);
  assert.deepEqual(createdTags, [{ tagName: 'test-01', refName: 'abcdef123456' }]);
  assert.deepEqual(finalState?.commits?.[0]?.refs.map(({ name, kind }) => ({ name, kind })), [
    { name: 'test-01', kind: 'tag' }
  ]);
  provider.dispose();
});

test('Show Log reloads the current commit references after Checkout to this creates a branch', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  let loadCount = 0;
  const backend = {
    async loadRevisionLog() {
      loadCount += 1;
      return {
        entries: [createRevisionLogEntry({
          hash: 'abcdef123456',
          shortHash: 'abcdef12',
          references: loadCount > 1 ? [{ name: 'feature/from-show-log', kind: 'head' }] : []
        })],
        hasMore: false,
        searchTruncated: false
      };
    }
  } as never;
  const services = {
    ui: {
      async promptBranchName() { return 'feature/from-show-log'; },
      showInformationMessage() {}
    },
    referenceManager: {
      async unsetBranchUpstream() {}
    },
    refreshController: {
      prepare() { return undefined; },
      refresh() {}
    }
  } as never;
  const provider = new ShowLogViewProvider(
    harness.extensionUri,
    backend,
    {} as never,
    () => services
  );
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showSource(
    repository,
    { kind: 'target', revision: 'main', label: 'main' }
  );
  harness.panels[0].receiveMessage({
    type: 'checkoutCommit',
    commitHash: 'abcdef123456'
  });
  await waitForAsyncHandlers();

  const finalState = harness.panels[0].postedMessages
    .map((message) => (message as {
      readonly state?: {
        readonly commits?: ReadonlyArray<{
          readonly refs: ReadonlyArray<{ readonly name: string; readonly kind: string }>;
        }>;
      };
    }).state)
    .filter((state) => !!state)
    .at(-1);
  assert.equal(loadCount, 2);
  assert.deepEqual(repository.calls.createBranch, [{
    name: 'feature/from-show-log',
    checkout: true,
    ref: 'abcdef123456'
  }]);
  assert.deepEqual(finalState?.commits?.[0]?.refs.map(({ name, kind }) => ({ name, kind })), [
    { name: 'feature/from-show-log', kind: 'head' }
  ]);
  provider.dispose();
});

test('Show Log publishes truthful filtered search truncation state', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  const backend = {
    async loadRevisionLog(
      _repository: unknown,
      _source: unknown,
      _limit: number,
      _skip: number,
      _showAllBranches: boolean,
      filterText: string
    ) {
      return {
        entries: [],
        hasMore: false,
        searchTruncated: filterText === 'needle'
      };
    }
  } as never;
  const provider = new ShowLogViewProvider(harness.extensionUri, backend, {} as never);
  const repository = createRepository({ root: '/workspace/repo' });

  await provider.showSource(
    repository,
    { kind: 'target', revision: 'main', label: 'main' }
  );
  const initialState = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: { readonly sourceToken?: string } }).state)
    .filter((state) => !!state)
    .at(-1);
  harness.panels[0].receiveMessage({
    type: 'setFilterText',
    value: 'needle',
    sourceToken: initialState?.sourceToken
  });
  await waitForAsyncHandlers();

  const finalState = harness.panels[0].postedMessages
    .map((message) => (message as {
      readonly state?: {
        readonly emptyMessage?: string;
        readonly searchNotice?: string;
      };
    }).state)
    .filter((state) => !!state)
    .at(-1);
  assert.equal(
    finalState?.emptyMessage,
    'No commits found matching "needle" in the first 2,000 commits. Older history was not searched.'
  );
  assert.equal(finalState?.searchNotice, undefined);

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

test('Flow AI workflow improves Bug branch descriptions without Pull Request context', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowAiTextWorkflow } = loadFresh(
    '../src/revisionGraph/flow/aiTextWorkflow'
  ) as typeof import('../src/revisionGraph/flow/aiTextWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  const messages: unknown[] = [];
  let improvementInput: unknown;
  const workflow = new RevisionGraphFlowAiTextWorkflow({
    getCurrentRepository: () => repository,
    getCurrentState: () => ({}) as never,
    postHostMessage: (message) => messages.push(message)
  }, {
    async improve(input) {
      improvementInput = input;
      return { status: 'ready', content: 'Payment totals are rounded incorrectly.' };
    }
  });
  const input = {
    surface: 'bug' as const,
    field: 'description' as const,
    sourceRefName: 'release/2.0.0',
    branchName: 'BUG-42-payment-rounding',
    text: 'Payment total wrong'
  };

  await workflow.improve(15, input);

  assert.deepEqual(improvementInput, input);
  assert.deepEqual(messages, [{
    type: 'set-flow-ai-text-result',
    requestId: 15,
    surface: 'bug',
    field: 'description',
    status: 'ready',
    content: 'Payment totals are rounded incorrectly.'
  }]);
  workflow.dispose();
});

test('Flow Governance awaits the shared modal warning when a repository mutation is rejected', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowGovernanceWorkflow } = loadFresh(
    '../src/revisionGraph/flow/governanceWorkflow'
  ) as typeof import('../src/revisionGraph/flow/governanceWorkflow');
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-orchestration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({
    schemaVersion: 1,
    enabled: true
  }));
  const repository = createRepository({ root });
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

  await warning.waitForRequest();
  assert.equal(await getPromiseState(operation), 'pending');
  assert.deepEqual(warning.requests, [{
    message: CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
    options: { modal: true }
  }]);

  warning.dismiss();
  await operation;
});

test('Flow Governance opens a configuration created by enabling the file-backed toggle', async (t) => {
  const harness = installVscodePanelMock(t);
  const { RevisionGraphFlowGovernanceWorkflow } = loadFresh(
    '../src/revisionGraph/flow/governanceWorkflow'
  ) as typeof import('../src/revisionGraph/flow/governanceWorkflow');
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-orchestration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = createRepository({ root });
  let state = {
    viewMode: 'ready',
    flowGovernance: {
      enabled: false,
      configSource: 'defaults',
      diagnostics: [],
      branchKinds: [],
      references: []
    }
  } as never;
  const workflow = new RevisionGraphFlowGovernanceWorkflow({
    actionServices: {} as never,
    mutationCoordinator: {} as never,
    getCurrentRepository: () => repository,
    getCurrentState: () => state,
    setCurrentState: (nextState) => { state = nextState as never; },
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => undefined
  });

  await workflow.updateOptions({ enabled: true });

  const configPath = path.join(root, '.git-revision-graph-flow.json');
  assert.deepEqual(harness.openedTextDocuments, [configPath]);
  assert.deepEqual(harness.shownTextDocuments, [{ fsPath: configPath }]);
});

function createRejectedMutationCoordinator(): never {
  return {
    async run() {
      return { status: 'rejected' as const };
    }
  } as never;
}

function createCompareActionServices(
  compareResultsPresenter: import('../src/refActions').CompareResultsPresenter,
  messages: string[]
): never {
  return {
    compareResultsPresenter,
    ui: {
      showInformationMessage(message: string) {
        messages.push(message);
      },
      async showErrorMessage(message: string) {
        messages.push(message);
      }
    }
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
  waitForRequest(): Promise<void>;
  dismiss(): void;
} {
  const requests: Array<{
    readonly message: string;
    readonly options: { readonly modal?: boolean } | undefined;
  }> = [];
  let dismissWarning: (() => void) | undefined;
  let resolveRequest: (() => void) | undefined;
  const requestReceived = new Promise<void>((resolve) => {
    resolveRequest = resolve;
  });
  return {
    ui: {
      async showWarningMessage(message, options) {
        requests.push({ message, options });
        resolveRequest?.();
        await new Promise<void>((resolve) => {
          dismissWarning = resolve;
        });
      }
    },
    requests,
    waitForRequest() {
      return requestReceived;
    },
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

interface CompareResultsPostedState {
  readonly kind: 'empty' | 'loading' | 'results';
  readonly sourceLabel?: string;
  readonly targetLabel?: string;
  readonly items: ReadonlyArray<{ readonly path: string }>;
}

function getCompareResultsStates(panel: TestPanel): CompareResultsPostedState[] {
  return panel.postedMessages
    .map((message) => (message as { readonly state?: CompareResultsPostedState }).state)
    .filter((state): state is CompareResultsPostedState => !!state);
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
} {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: unknown) => void;
  return {
    promise: new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    resolve(value) {
      resolvePromise(value);
    },
    reject(error) {
      rejectPromise(error);
    }
  };
}

interface TestPanel {
  readonly webview: Record<string, unknown>;
  readonly postedMessages: unknown[];
  title: string;
  revealCount: number;
  disposed: boolean;
  iconPath?: unknown;
  reveal(): void;
  receiveMessage(message: unknown): void;
  dispose(): void;
  onDidDispose(listener: () => void): { dispose(): void };
}

function installVscodePanelMock(
  t: test.TestContext,
  options: {
    readonly openExternalResult?: boolean;
  } = {}
): {
  readonly extensionUri: never;
  readonly panels: TestPanel[];
  readonly clipboardWrites: string[];
  readonly openedExternalUris: string[];
  readonly openedTextDocuments: string[];
  readonly shownTextDocuments: unknown[];
  createPanel(): TestPanel;
} {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  const panels: TestPanel[] = [];
  const clipboardWrites: string[] = [];
  const openedExternalUris: string[] = [];
  const openedTextDocuments: string[] = [];
  const shownTextDocuments: unknown[] = [];
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
      receiveMessage(message: unknown) {
        for (const listener of [...messageListeners]) listener(message);
      },
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
      file: (fsPath: string) => ({ fsPath }),
      parse: (value: string) => ({ toString: () => value }),
      joinPath: (base: { path?: string }, ...parts: string[]) => ({
        path: [base.path ?? '', ...parts].join('/'),
        fsPath: [base.path ?? '', ...parts].join('/'),
        toString() { return this.path; }
      })
    },
    ViewColumn: { One: 1 },
    ThemeIcon: class {},
    CancellationTokenSource: class {
      private cancelled = false;
      private readonly listeners = new Set<() => void>();
      readonly token: {
        readonly isCancellationRequested: boolean;
        onCancellationRequested(listener: () => void): { dispose(): void };
      };
      constructor() {
        const tokenSource = this;
        this.token = {
          get isCancellationRequested() { return tokenSource.cancelled; },
          onCancellationRequested(listener: () => void) {
            tokenSource.listeners.add(listener);
            return { dispose: () => tokenSource.listeners.delete(listener) };
          }
        };
      }
      cancel() {
        if (this.cancelled) return;
        this.cancelled = true;
        for (const listener of [...this.listeners]) listener();
      }
      dispose() {
        this.listeners.clear();
      }
    },
    window: {
      createWebviewPanel: () => createPanel(),
      showInformationMessage: async () => undefined,
      showWarningMessage: async () => undefined,
      showErrorMessage: async () => undefined,
      showQuickPick: async () => undefined,
      showTextDocument: async (document: unknown) => { shownTextDocuments.push(document); },
      createOutputChannel: () => ({ appendLine() {}, dispose() {} })
    },
    workspace: {
      openTextDocument: async (uri: { fsPath: string }) => {
        openedTextDocuments.push(uri.fsPath);
        return uri;
      },
      asRelativePath: (value: { fsPath?: string } | string) => typeof value === 'string' ? value : value.fsPath ?? '',
      getConfiguration: () => ({
        get: <T>(_key: string, fallback?: T) => fallback
      })
    },
    commands: { executeCommand: async () => undefined },
    env: {
      clipboard: { writeText: async (value: string) => { clipboardWrites.push(value); } },
      openExternal: async (uri: { toString(): string }) => {
        openedExternalUris.push(uri.toString());
        return options.openExternalResult ?? true;
      }
    }
  };

  moduleLoader._load = function loadWithVscodeMock(request, parent, isMain): unknown {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  t.after(() => { moduleLoader._load = originalLoad; });
  return {
    extensionUri: extensionUri as never,
    panels,
    clipboardWrites,
    openedExternalUris,
    openedTextDocuments,
    shownTextDocuments,
    createPanel
  };
}

async function waitForAsyncHandlers(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function loadFresh(moduleId: string): unknown {
  const modulePath = require.resolve(moduleId);
  delete require.cache[modulePath];
  return require(moduleId) as unknown;
}

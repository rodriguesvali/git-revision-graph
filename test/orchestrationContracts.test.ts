import test from 'node:test';
import assert from 'node:assert/strict';

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

test('Show Log enables all branches by default for target sources', async (t) => {
  const harness = installVscodePanelMock(t);
  const { ShowLogViewProvider } = loadFresh('../src/showLogView') as typeof import('../src/showLogView');
  const showAllBranchesValues: boolean[] = [];
  const backend = {
    async loadRevisionLog(
      _repository: unknown,
      _source: unknown,
      _limit: number,
      _skip: number,
      showAllBranches: boolean
    ) {
      showAllBranchesValues.push(showAllBranches);
      return { entries: [], hasMore: false, searchTruncated: false };
    }
  } as never;
  const provider = new ShowLogViewProvider(harness.extensionUri, backend, {} as never);

  await provider.showSource(
    createRepository({ root: '/workspace/repo' }),
    { kind: 'target', revision: 'main', label: 'main' }
  );

  const visibleState = harness.panels[0].postedMessages
    .map((message) => (message as { readonly state?: { readonly showAllBranches?: boolean } }).state)
    .filter((state) => !!state)
    .at(-1);
  assert.deepEqual(showAllBranchesValues, [true]);
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

test('Flow Pull Request workflow reports when VS Code cannot open the browser', async (t) => {
  const harness = installVscodePanelMock(t, { openExternalResult: false });
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
  const informationMessages: string[] = [];
  const workflow = new RevisionGraphFlowPullRequestWorkflow({
    actionServices: createFlowPullRequestTestServices({
      async showInformationMessage(message: string) {
        informationMessages.push(message);
      },
      showWarningMessage: () => assert.fail('No warning expected.'),
      showErrorMessage: () => assert.fail('No error expected.')
    }),
    mutationCoordinator: new RepositoryMutationCoordinator(),
    getCurrentRepository: () => repository,
    getCurrentState: () => ({}) as never,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => undefined
  }, {
    async checkTarget(_path, sourceRefName, targetRefName) {
      return { sourceRefName, targetRefName, status: 'ahead' };
    },
    async checkSourcePublication(_repository, remoteName, sourceRefName) {
      return { status: 'ready', remoteName, sourceRefName, localAhead: 0, remoteAhead: 0 };
    },
    async loadRemoteBranchCommit() {
      return { status: 'missing' };
    },
    isMergeInProgress: () => false
  });

  await workflow.openUrl('feature/demo', 'main');

  assert.deepEqual(harness.openedExternalUris, [
    'https://github.com/example/repository/compare/main...feature%2Fdemo?' +
      'quick_pull=1&title=Merge+feature%2Fdemo+into+main&body=Source%3A+feature%2Fdemo%0A' +
      'Target%3A+main%0A%0AFlow+Governance+requires+final+integration+through+a+Pull+Request.'
  ]);
  assert.deepEqual(informationMessages, [
    'Could not open the Pull Request in your browser. Try again or open the repository remote manually.'
  ]);
});

test('Flow AI workflow keeps improved Pull Request text in host-owned transient context', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowAiTextWorkflow } = loadFresh(
    '../src/revisionGraph/flow/aiTextWorkflow'
  ) as typeof import('../src/revisionGraph/flow/aiTextWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  const messages: unknown[] = [];
  const workflow = new RevisionGraphFlowAiTextWorkflow({
    getCurrentRepository: () => repository,
    getCurrentState: () => createFlowAiTestState('release/2.0.0', 'release', 'main', 'main'),
    postHostMessage: (message) => messages.push(message)
  }, {
    async improve() {
      return { status: 'ready', content: 'Ship release 2.0.0' };
    }
  });
  workflow.setPullRequestContext({
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Old title',
    body: 'Existing description',
    text: 'Title: Old title\n\nExisting description'
  });

  await workflow.improve(11, {
    surface: 'pull-request',
    field: 'title',
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Old title',
    description: 'Existing description'
  });

  assert.deepEqual(workflow.getPullRequestContext('release/2.0.0', 'main'), {
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Ship release 2.0.0',
    body: 'Existing description',
    text: 'Title: Ship release 2.0.0\n\nExisting description'
  });
  assert.deepEqual(messages, [{
    type: 'set-flow-ai-text-result',
    requestId: 11,
    surface: 'pull-request',
    field: 'title',
    status: 'ready',
    content: 'Ship release 2.0.0'
  }]);
  workflow.dispose();
});

test('Flow AI workflow supplies project-document context when improving a Pull Request description', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowAiTextWorkflow } = loadFresh(
    '../src/revisionGraph/flow/aiTextWorkflow'
  ) as typeof import('../src/revisionGraph/flow/aiTextWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  let improvementInput: unknown;
  const workflow = new RevisionGraphFlowAiTextWorkflow({
    getCurrentRepository: () => repository,
    getCurrentState: () => createFlowAiTestState(
      'release/2.0.0',
      'release',
      'main',
      'main',
      'Prepare the documented 2.0.0 delivery'
    ),
    postHostMessage: () => undefined
  }, {
    async improve(input) {
      improvementInput = input;
      return { status: 'ready', content: 'Documented delivery summary' };
    }
  }, {
    async load() {
      return 'diff --git a/README.md b/README.md\n+AI-assisted Pull Request descriptions';
    }
  });
  workflow.setPullRequestContext({
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Promote release 2.0.0',
    body: 'Promotion context',
    text: 'Title: Promote release 2.0.0\n\nPromotion context'
  });

  await workflow.improve(13, {
    surface: 'pull-request',
    field: 'description',
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Promote release 2.0.0',
    description: 'Promotion context'
  });

  assert.deepEqual(improvementInput, {
    surface: 'pull-request',
    field: 'description',
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Promote release 2.0.0',
    description: 'Promotion context',
    promptContext: {
      transition: 'release-to-main',
      sourceKind: 'release',
      targetKind: 'main',
      promptKind: 'release',
      contextSource: 'project-document-diff',
      sourceDescription: 'Prepare the documented 2.0.0 delivery',
      content: 'diff --git a/README.md b/README.md\n+AI-assisted Pull Request descriptions'
    }
  });
  assert.equal(
    workflow.getPullRequestContext('release/2.0.0', 'main')?.body,
    'Documented delivery summary'
  );
  workflow.dispose();
});

test('Flow AI workflow derives defect prompts and code context from host-owned branch kinds', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowAiTextWorkflow } = loadFresh(
    '../src/revisionGraph/flow/aiTextWorkflow'
  ) as typeof import('../src/revisionGraph/flow/aiTextWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  let contextInput: unknown;
  let improvementInput: unknown;
  const workflow = new RevisionGraphFlowAiTextWorkflow({
    getCurrentRepository: () => repository,
    getCurrentState: () => createFlowAiTestState(
      'bug/BUG-731-payment-rounding',
      'bug',
      'release/2.0.0',
      'release',
      'Correct rounding in the release payment summary'
    ),
    postHostMessage: () => undefined
  }, {
    async improve(input) {
      improvementInput = input;
      return { status: 'ready', content: 'Grounded defect summary' };
    }
  }, {
    async load(_repository, input) {
      contextInput = input;
      return 'diff --git a/src/payment.ts b/src/payment.ts\n+roundCorrectly();';
    }
  });
  workflow.setPullRequestContext({
    sourceRefName: 'bug/BUG-731-payment-rounding',
    targetRefName: 'release/2.0.0',
    title: 'Correct payment rounding',
    body: 'Promotion context',
    text: 'Title: Correct payment rounding\n\nPromotion context'
  });

  await workflow.improve(14, {
    surface: 'pull-request',
    field: 'description',
    sourceRefName: 'bug/BUG-731-payment-rounding',
    targetRefName: 'release/2.0.0',
    title: 'Correct payment rounding',
    description: 'Promotion context'
  });

  assert.deepEqual(
    (contextInput as { readonly promptContext?: unknown }).promptContext,
    {
      transition: 'bug-to-release',
      sourceKind: 'bug',
      targetKind: 'release',
      promptKind: 'defect',
      contextSource: 'code-diff',
      sourceDescription: 'Correct rounding in the release payment summary'
    }
  );
  assert.deepEqual(
    (improvementInput as { readonly promptContext?: unknown }).promptContext,
    {
      transition: 'bug-to-release',
      sourceKind: 'bug',
      targetKind: 'release',
      promptKind: 'defect',
      contextSource: 'code-diff',
      sourceDescription: 'Correct rounding in the release payment summary',
      content: 'diff --git a/src/payment.ts b/src/payment.ts\n+roundCorrectly();'
    }
  );
  workflow.dispose();
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

test('Flow AI workflow cancels and ignores a result after the Pull Request target changes', async (t) => {
  installVscodePanelMock(t);
  const { RevisionGraphFlowAiTextWorkflow } = loadFresh(
    '../src/revisionGraph/flow/aiTextWorkflow'
  ) as typeof import('../src/revisionGraph/flow/aiTextWorkflow');
  const repository = createRepository({ root: '/workspace/repo' });
  const messages: unknown[] = [];
  let resolveImprovement: ((value: { readonly status: 'ready'; readonly content: string }) => void) | undefined;
  let token: { readonly isCancellationRequested: boolean } | undefined;
  const workflow = new RevisionGraphFlowAiTextWorkflow({
    getCurrentRepository: () => repository,
    getCurrentState: () => createFlowAiTestState(
      'feature/demo',
      'feature',
      'release/2.0.0',
      'release'
    ),
    postHostMessage: (message) => messages.push(message)
  }, {
    async improve(_input, cancellationToken) {
      token = cancellationToken;
      return new Promise((resolve) => { resolveImprovement = resolve; });
    }
  });
  workflow.setPullRequestContext({
    sourceRefName: 'feature/demo',
    targetRefName: 'release/2.0.0',
    title: 'Demo',
    body: 'Demo body',
    text: 'Title: Demo\n\nDemo body'
  });

  const operation = workflow.improve(12, {
    surface: 'pull-request',
    field: 'description',
    sourceRefName: 'feature/demo',
    targetRefName: 'release/2.0.0',
    title: 'Demo',
    description: 'Demo body'
  });
  await waitForAsyncHandlers();
  workflow.setPullRequestContext({
    sourceRefName: 'feature/demo',
    targetRefName: 'release/3.0.0',
    title: 'Demo',
    body: 'New target',
    text: 'Title: Demo\n\nNew target'
  });
  assert.equal(token?.isCancellationRequested, true);
  resolveImprovement?.({ status: 'ready', content: 'Stale result' });
  await operation;

  assert.deepEqual(messages, []);
  assert.equal(workflow.getPullRequestContext('feature/demo', 'release/3.0.0')?.body, 'New target');
  workflow.dispose();
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
    },
    isMergeInProgress: () => false
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

test('Bug Pull Request preflight verifies its persisted release target before opening context', async (t) => {
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
          { refName: 'bug/BUG-731-payment-rounding', kind: 'bug' },
          { refName: 'release/2.0.0', kind: 'release' }
        ]
      }
    }) as never,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: () => undefined
  }, {
    async loadRemoteBranchCommit(_repository, remoteName, branchName) {
      calls.push(`remote:${remoteName}/${branchName}`);
      return { status: 'found', commit: 'remote-release-commit' };
    },
    async checkTarget(_path, sourceRefName, targetRefName, options) {
      calls.push(`target:${targetRefName}..${sourceRefName}`);
      assert.ok(options);
      assert.equal(options.requireTargetSynchronized, true);
      assert.equal(options.targetCommitish, 'remote-release-commit');
      return { sourceRefName, targetRefName, status: 'ahead' };
    },
    async checkSourcePublication(_repository, remoteName, sourceRefName) {
      calls.push(`source:${remoteName}/${sourceRefName}`);
      return { status: 'ready', remoteName, sourceRefName, localAhead: 0, remoteAhead: 0 };
    },
    isMergeInProgress: () => false
  });

  await workflow.copyContext('bug/BUG-731-payment-rounding', 'release/2.0.0');

  assert.deepEqual(calls, [
    'remote:origin/release/2.0.0',
    'target:release/2.0.0..bug/BUG-731-payment-rounding',
    'source:origin/bug/BUG-731-payment-rounding'
  ]);
});

test('Task Pull Request preflight verifies its mapped feature and pushes committed work after confirmation', async (t) => {
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
  const confirmations: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const hostMessages: unknown[] = [];
  let sourceChecks = 0;
  const workflow = new RevisionGraphFlowPullRequestWorkflow({
    actionServices: createFlowPullRequestTestServices({
      async confirm(confirmation: { readonly message: string; readonly confirmLabel: string }) {
        confirmations.push(confirmation);
        return true;
      },
      showWarningMessage: () => assert.fail('No warning expected.'),
      showInformationMessage: () => undefined
    }),
    mutationCoordinator: new RepositoryMutationCoordinator(),
    getCurrentRepository: () => repository,
    getCurrentState: () => ({
      flowGovernance: {
        references: [
          { refName: 'task/4312-adjust-timeout', kind: 'task' },
          { refName: 'feature/payment', kind: 'feature' }
        ]
      }
    }) as never,
    postActionLoading: (label) => calls.push(`loading:${label}`),
    postCurrentState: () => calls.push('loading:done'),
    postHostMessage: (message) => hostMessages.push(message)
  }, {
    async loadRemoteBranchCommit(_repository, remoteName, branchName) {
      calls.push(`remote:${remoteName}/${branchName}`);
      return { status: 'found', commit: 'remote-feature-commit' };
    },
    async checkTarget(_path, sourceRefName, targetRefName, options) {
      calls.push(`target:${targetRefName}..${sourceRefName}`);
      assert.deepEqual(options, {
        requireTargetAncestor: false,
        requireTargetSynchronized: true,
        targetCommitish: 'remote-feature-commit'
      });
      return { sourceRefName, targetRefName, status: 'ahead' };
    },
    async checkSourcePublication(_repository, remoteName, sourceRefName) {
      sourceChecks += 1;
      calls.push(`source:${remoteName}/${sourceRefName}:${sourceChecks}`);
      return sourceChecks === 1
        ? { status: 'unpushed', remoteName, sourceRefName, localAhead: 1, remoteAhead: 0 }
        : { status: 'ready', remoteName, sourceRefName, localAhead: 0, remoteAhead: 0 };
    },
    isMergeInProgress: () => false
  });

  await workflow.copyContext('task/4312-adjust-timeout', 'feature/payment');

  assert.deepEqual(confirmations, [{
    message: 'task/4312-adjust-timeout has commits that are not available on origin. Push them before creating the Pull Request?',
    confirmLabel: 'Push and Continue'
  }]);
  assert.deepEqual(repository.calls.push, [{
    remoteName: 'origin',
    branchName: 'task/4312-adjust-timeout',
    setUpstream: false
  }]);
  assert.deepEqual(calls, [
    'loading:Fetching remotes...',
    'remote:origin/feature/payment',
    'loading:done',
    'target:feature/payment..task/4312-adjust-timeout',
    'loading:Fetching remotes...',
    'source:origin/task/4312-adjust-timeout:1',
    'loading:done',
    'loading:Fetching remotes...',
    'source:origin/task/4312-adjust-timeout:2',
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
      },
      isMergeInProgress: () => false
    });

    await workflow.copyContext('feature/payment', 'release/2.0.0');

    assert.equal(sourceChecked, false);
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].message.includes(scenario.expected));
    assert.deepEqual(warnings[0].options, { modal: true });
  }
});

test('Sync Pull Request context remains blocked until the equalization merge is completed', async (t) => {
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
  const warnings: Array<{ message: string; options?: { readonly modal?: boolean } }> = [];
  const calls: string[] = [];
  const hostMessages: unknown[] = [];
  let mergeInProgress = true;
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
          { refName: 'sync/payment', kind: 'sync' },
          { refName: 'feature/payment', kind: 'feature' }
        ]
      }
    }) as never,
    postActionLoading: () => undefined,
    postCurrentState: () => undefined,
    postHostMessage: (message) => hostMessages.push(message)
  }, {
    async loadRemoteBranchCommit(_repository, remoteName, branchName) {
      calls.push(`target-remote:${remoteName}/${branchName}`);
      return { status: 'found', commit: 'remote-feature-commit' };
    },
    async checkTarget(_path, sourceRefName, targetRefName, options) {
      calls.push(`target:${targetRefName}..${sourceRefName}`);
      assert.equal(options?.requireTargetSynchronized, true);
      return { sourceRefName, targetRefName, status: 'ahead' };
    },
    async checkSourcePublication(_repository, remoteName, sourceRefName) {
      calls.push(`source:${remoteName}/${sourceRefName}`);
      return { status: 'ready', remoteName, sourceRefName };
    },
    isMergeInProgress: () => mergeInProgress
  });

  await workflow.copyContext('sync/payment', 'feature/payment');

  assert.deepEqual(calls, []);
  assert.deepEqual(warnings, [{
    message: 'Complete or abort the merge on sync/payment before opening Pull Request context.',
    options: { modal: true }
  }]);
  assert.deepEqual(hostMessages, []);

  mergeInProgress = false;
  await workflow.copyContext('sync/payment', 'feature/payment');

  assert.deepEqual(calls, [
    'target-remote:origin/feature/payment',
    'target:feature/payment..sync/payment',
    'source:origin/sync/payment'
  ]);
  assert.equal(hostMessages.length, 1);
});

test('Flow Governance awaits the shared modal warning when a repository mutation is rejected', async (t) => {
  installVscodePanelMock(t, { flowGovernanceEnabled: true });
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

  await warning.waitForRequest();
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

  await warning.waitForRequest();
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
    readonly flowGovernanceEnabled?: boolean;
    readonly openExternalResult?: boolean;
  } = {}
): {
  readonly extensionUri: never;
  readonly panels: TestPanel[];
  readonly clipboardWrites: string[];
  readonly openedExternalUris: string[];
  createPanel(): TestPanel;
} {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  const panels: TestPanel[] = [];
  const clipboardWrites: string[] = [];
  const openedExternalUris: string[] = [];
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
      createOutputChannel: () => ({ appendLine() {}, dispose() {} })
    },
    workspace: {
      asRelativePath: (value: { fsPath?: string } | string) => typeof value === 'string' ? value : value.fsPath ?? '',
      getConfiguration: () => ({
        get: <T>(key: string, fallback?: T) =>
          key === 'enabled' && options.flowGovernanceEnabled !== undefined
            ? options.flowGovernanceEnabled as T
            : fallback
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
  return { extensionUri: extensionUri as never, panels, clipboardWrites, openedExternalUris, createPanel };
}

function createFlowAiTestState(
  sourceRefName: string,
  sourceKind: 'release' | 'feature' | 'bug',
  targetRefName: string,
  targetKind: 'main' | 'release',
  sourceDescription?: string
): never {
  return {
    references: [
      { name: sourceRefName, description: sourceDescription },
      { name: targetRefName }
    ],
    flowGovernance: {
      references: [
        { refName: sourceRefName, kind: sourceKind },
        { refName: targetRefName, kind: targetKind }
      ]
    }
  } as never;
}

async function waitForAsyncHandlers(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function loadFresh(moduleId: string): unknown {
  const modulePath = require.resolve(moduleId);
  delete require.cache[modulePath];
  return require(moduleId) as unknown;
}

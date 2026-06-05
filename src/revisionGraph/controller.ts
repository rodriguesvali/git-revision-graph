import * as vscode from 'vscode';

import { API, Repository } from '../git';
import { toErrorDetail } from '../errorDetail';
import {
  isSameRepositoryPath,
  reconcileCurrentRepository,
  shouldRefreshGraphForRepositorySetChange,
  shouldPromptForGraphRepositoryOnOpen
} from '../repositorySelection';
import {
  abortCurrentMerge,
  createBranchFromResolvedReference,
  createTagFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteRemoteTagResolvedReference,
  deleteResolvedReference,
  mergeResolvedReference,
  pullCurrentBranchFromUpstream,
  publishLocalBranchResolvedReference,
  pushCurrentBranchToUpstream,
  pushTagResolvedReference,
  CompareResultsPresenter,
  RefActionKind,
  resetCurrentBranchWorkspace,
  syncCurrentHeadWithUpstream
} from '../refActions';
import { createWorkbenchRefActionServices } from '../workbenchRefActionServices';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from './backend';
import { openUnifiedDiffDocument } from './repository/log';
import { pickRevisionGraphRepository } from './repository/picker';
import {
  buildEmptyRevisionGraphViewState,
  buildReadyRevisionGraphViewStateBundle
} from './panel/state';
import { RevisionGraphRenderCoordinator } from './renderCoordinator';
import { getRepositoryRemoteNames } from '../refActions/shared';
import {
  createDefaultRevisionGraphProjectionOptions,
  normalizeRevisionGraphProjectionOptionsForScope,
  RemoteTagPublicationState,
  RevisionGraphMessage,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { REVISION_GRAPH_VIEW_ID } from '../revisionGraphTypes';
import { GRAPH_LIMIT_POLICY } from './panel/shared';
import { renderRevisionGraphShellHtml } from '../revisionGraphWebview';
import { getRevisionGraphViewTitle } from './viewTitle';
import { ShowLogPresenter } from '../showLogView';
import {
  RemoteTagPublicationRequestContext,
  isRemoteTagPublicationStateResponseCurrent,
  resolveRemoteTagPublicationState
} from './remoteTagState';
import { runRevisionGraphFetchWorkflow } from './fetchWorkflow';
import { RevisionGraphLoadTraceService } from './loadTraceService';
import { RevisionGraphMessageDispatcher } from './messageDispatcher';
import {
  cancelPendingFollowUpRefresh,
  consumePendingFollowUpRefresh,
  createRepositoryRefreshRequest,
  getRefreshLoadingLabel,
  getRefreshLoadingMode,
  normalizeRefreshRequest,
  PendingRevisionGraphFollowUpRefresh,
  RevisionGraphRefreshRequest,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequestLike,
  RevisionGraphRepositoryEventKind,
  registerPendingFollowUpRefresh
} from '../revisionGraphRefresh';

const MIN_GRAPH_COMMAND_TIMEOUT_MS = 5000;
const MAX_GRAPH_COMMAND_TIMEOUT_MS = 300000;

interface RevisionGraphWebviewSurface {
  readonly webview: vscode.Webview;
  onDidDispose(listener: () => void): vscode.Disposable;
  setTitle(title: string): void;
}

interface RevisionGraphRenderRequestContext {
  readonly requestId: number;
  readonly intent: RevisionGraphRefreshIntent;
}

function createWebviewViewSurface(view: vscode.WebviewView): RevisionGraphWebviewSurface {
  return {
    webview: view.webview,
    onDidDispose: (listener) => view.onDidDispose(listener),
    setTitle: (title) => {
      view.title = title;
    }
  };
}

function createWebviewPanelSurface(panel: vscode.WebviewPanel): RevisionGraphWebviewSurface {
  return {
    webview: panel.webview,
    onDidDispose: (listener) => panel.onDidDispose(listener),
    setTitle: (title) => {
      panel.title = title;
    }
  };
}

async function resolveTagPublicationStateForRepository(
  repository: Repository,
  tagName: string
): Promise<RemoteTagPublicationState> {
  try {
    const remoteNames = await getRepositoryRemoteNames(repository);
    return resolveRemoteTagPublicationState({
      repositoryPath: repository.rootUri.fsPath,
      remoteNames,
      tagName
    });
  } catch {
    return 'unknown';
  }
}

function resolveGraphCommandTimeoutMs(configuredValue: unknown, fallback: number): number {
  if (typeof configuredValue !== 'number' || !Number.isFinite(configuredValue)) {
    return fallback;
  }

  return Math.min(
    MAX_GRAPH_COMMAND_TIMEOUT_MS,
    Math.max(MIN_GRAPH_COMMAND_TIMEOUT_MS, Math.trunc(configuredValue))
  );
}

export class RevisionGraphController implements vscode.Disposable {
  private view: RevisionGraphWebviewSurface | undefined;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private currentRepository: Repository | undefined;
  private projectionOptions = createDefaultRevisionGraphProjectionOptions();
  private currentLoadingLabel: string | undefined;
  private currentLoadingMode: 'blocking' | 'subtle' | undefined;
  private currentErrorMessage: string | undefined;
  private readonly pendingFollowUpRefreshes = new Map<string, PendingRevisionGraphFollowUpRefresh[]>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly actionServices: ReturnType<typeof createWorkbenchRefActionServices>;
  private readonly messageDispatcher = new RevisionGraphMessageDispatcher();
  private readonly renderCoordinator = new RevisionGraphRenderCoordinator<RevisionGraphViewState>(
    (label) => {
      const nextLoadingMode = getRefreshLoadingMode(this.latestRefreshIntent);
      const shouldPostLoading =
        !this.currentState.loading
        || this.currentLoadingLabel !== label
        || this.currentLoadingMode !== nextLoadingMode;
      this.currentLoadingLabel = label;
      this.currentLoadingMode = nextLoadingMode;
      this.currentErrorMessage = undefined;
      this.currentState = {
        ...this.currentState,
        loading: true,
        loadingLabel: label,
        errorMessage: undefined
      };
      if (shouldPostLoading) {
        this.postHostMessage({
          type: 'set-loading',
          label,
          mode: this.currentLoadingMode
        });
      }
    },
    (state) => {
      this.currentLoadingLabel = undefined;
      this.currentLoadingMode = undefined;
      this.currentErrorMessage = undefined;
      this.currentState = state;
      this.postHostMessage({
        type: 'update-state',
        state
      });
    },
    (error) => {
      this.currentLoadingLabel = undefined;
      this.currentLoadingMode = undefined;
      this.currentErrorMessage = toErrorDetail(error);
      this.currentState = {
        ...this.currentState,
        loading: false,
        loadingLabel: undefined,
        errorMessage: this.currentErrorMessage
      };
      this.postHostMessage({
        type: 'set-error',
        message: this.currentErrorMessage
      });
    }
  );
  private readonly loadTrace = new RevisionGraphLoadTraceService(() => this.renderCoordinator.getCurrentRequestId());
  private currentState: RevisionGraphViewState;
  private latestRefreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';

  constructor(
    private readonly git: API,
    private readonly backend: RevisionGraphBackend,
    compareResultsPresenter: CompareResultsPresenter,
    private readonly showLogPresenter: ShowLogPresenter,
    private readonly viewId: string = REVISION_GRAPH_VIEW_ID,
    private readonly limitPolicy: RevisionGraphLimitPolicy = GRAPH_LIMIT_POLICY
  ) {
    this.actionServices = createWorkbenchRefActionServices(
      (request) => {
        void this.refresh(request);
      },
      (request) => {
        return this.prepareRefresh(request);
      },
      compareResultsPresenter
    );
    this.currentRepository = reconcileCurrentRepository(git.repositories, undefined);
    this.currentState = buildEmptyRevisionGraphViewState(
      git.repositories.length > 0,
      this.projectionOptions
    );
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.handleRepositorySetChanged();
      }),
      git.onDidCloseRepository((repository) => {
        this.detachRepository(repository);
        this.handleRepositorySetChanged();
      })
    );
  }

  dispose(): void {
    this.renderCoordinator.cancel();
    this.disposeViewDisposables();
    this.loadTrace.dispose();

    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    await this.resolveWebviewSurface(createWebviewViewSurface(view));
  }

  async resolveWebviewPanel(panel: vscode.WebviewPanel): Promise<void> {
    await this.resolveWebviewSurface(createWebviewPanelSurface(panel));
  }

  private async resolveWebviewSurface(view: RevisionGraphWebviewSurface): Promise<void> {
    this.disposeViewDisposables();
    this.view = view;
    this.syncViewTitle();
    this.viewDisposables.push(
      view.onDidDispose(() => {
        if (this.view === view) {
          this.renderCoordinator.cancel();
          this.view = undefined;
        }
        this.disposeViewDisposables();
      }),
      view.webview.onDidReceiveMessage(async (message: unknown) => {
        await this.messageDispatcher.dispatch(message, {
          currentState: this.currentState,
          currentRepositoryPath: this.currentRepository?.rootUri.fsPath,
          handleMessage: async (validatedMessage) => {
            await this.handleMessage(validatedMessage);
          }
        });
      })
    );
    view.webview.options = {
      enableScripts: true
    };
    view.webview.html = renderRevisionGraphShellHtml();

    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    void this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
  }

  async open(): Promise<void> {
    const hadResolvedView = !!this.view;
    await vscode.commands.executeCommand(`${this.viewId}.focus`);
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (shouldPromptForGraphRepositoryOnOpen(this.git.repositories, this.currentRepository, hadResolvedView)) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    if (!hadResolvedView && this.view) {
      return;
    }

    await this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
  }

  async chooseRepository(): Promise<void> {
    const pickedRepository = await pickRevisionGraphRepository(this.git, true);
    if (!pickedRepository) {
      return;
    }

    this.setCurrentRepository(pickedRepository);
    await this.open();
  }

  async fetchCurrentRepository(): Promise<void> {
    await this.runFetchCurrentRepository();
  }

  async refresh(requestLike: RevisionGraphRefreshRequestLike = 'full-rebuild'): Promise<void> {
    if (!this.view) {
      return;
    }

    const request = this.resolveRefreshRequest(requestLike);
    this.latestRefreshIntent = request.intent;
    const preparedRefresh = this.prepareRefresh(request);
    const renderIntent = request.intent;

    const outcome = await this.renderCoordinator.schedule(
      getRefreshLoadingLabel(renderIntent),
      async (requestId, signal) => this.buildNextState(
        {
          requestId,
          intent: renderIntent
        },
        signal
      )
    );
    if (outcome !== 'applied') {
      preparedRefresh?.cancel();
    }
  }

  prepareRefresh(requestLike: RevisionGraphRefreshRequestLike) {
    const preparedRefresh = registerPendingFollowUpRefresh(
      this.pendingFollowUpRefreshes,
      this.resolveRefreshRequest(requestLike)
    );
    if (!preparedRefresh) {
      return undefined;
    }

    return {
      cancel: () => {
        cancelPendingFollowUpRefresh(this.pendingFollowUpRefreshes, preparedRefresh);
      }
    };
  }

  private async handleMessage(message: RevisionGraphMessage): Promise<void> {
    switch (message.type) {
      case 'webview-ready':
        this.rehydrateWebview();
        return;
      case 'load-trace':
        this.traceWebviewLoadEvent(message.phase, message.durationMs, message.detail, message.requestId);
        return;
      case 'refresh':
        await this.refresh('full-rebuild');
        return;
      case 'fetch-current-repository':
        await this.runFetchCurrentRepository();
        return;
      case 'abort-merge':
        if (this.currentRepository) {
          await abortCurrentMerge(this.currentRepository, this.actionServices);
        }
        return;
      case 'choose-repository':
        {
          const pickedRepository = await pickRevisionGraphRepository(this.git, true);
          if (!pickedRepository) {
            this.postHostMessage({ type: 'update-state', state: this.currentState });
            return;
          }

          this.setCurrentRepository(pickedRepository);
        }
        await this.refresh('full-rebuild');
        return;
      case 'set-projection-options':
        {
          const nextProjectionOptions = normalizeRevisionGraphProjectionOptionsForScope({
            ...this.projectionOptions,
            ...message.options
          });
          this.projectionOptions = nextProjectionOptions;
        }
        await this.refresh('full-rebuild');
        return;
      case 'compare-selected':
        if (this.currentRepository) {
          await compareResolvedRefs(
            this.currentRepository,
            { refName: message.baseRevision, label: message.baseLabel },
            { refName: message.compareRevision, label: message.compareLabel },
            this.actionServices
          );
        }
        return;
      case 'show-log':
        if (this.currentRepository) {
          await this.showLogPresenter.showSource(this.currentRepository, message.source);
        }
        return;
      case 'open-unified-diff':
        if (this.currentRepository) {
          await openUnifiedDiffDocument(
            this.currentRepository,
            message.baseRevision,
            message.compareRevision,
            this.backend
          );
        }
        return;
      case 'compare-with-worktree':
        if (this.currentRepository) {
          await compareResolvedRefWithWorktree(
            this.currentRepository,
            { refName: message.revision, label: message.label },
            this.actionServices
          );
        }
        return;
      case 'copy-commit-hash':
        await vscode.env.clipboard.writeText(message.commitHash);
        this.actionServices.ui.showInformationMessage(`Copied commit ${message.commitHash.slice(0, 8)}.`);
        return;
      case 'copy-ref-name':
        await vscode.env.clipboard.writeText(message.refName);
        this.actionServices.ui.showInformationMessage(`Copied ref ${message.refName}.`);
        return;
      case 'checkout':
        if (this.currentRepository) {
          await checkoutResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.actionServices
          );
        }
        return;
      case 'create-branch':
        if (this.currentRepository) {
          await createBranchFromResolvedReference(
            this.currentRepository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
        }
        return;
      case 'create-tag':
        if (this.currentRepository) {
          await createTagFromResolvedReference(
            this.currentRepository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
        }
        return;
      case 'resolve-remote-tag-state':
        if (this.currentRepository) {
          const requestContext = this.createRemoteTagPublicationRequestContext(this.currentRepository);
          const state = await resolveTagPublicationStateForRepository(this.currentRepository, message.refName);
          this.postRemoteTagStateIfCurrent(requestContext, message.refName, state);
        }
        return;
      case 'push-tag':
        if (this.currentRepository) {
          const requestContext = this.createRemoteTagPublicationRequestContext(this.currentRepository);
          const pushed = await pushTagResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
          if (pushed) {
            this.postRemoteTagStateIfCurrent(requestContext, message.refName, 'published');
          }
        }
        return;
      case 'delete-remote-tag':
        if (this.currentRepository) {
          const requestContext = this.createRemoteTagPublicationRequestContext(this.currentRepository);
          const deleted = await deleteRemoteTagResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
          if (deleted) {
            this.postRemoteTagStateIfCurrent(requestContext, message.refName, 'unpublished');
          }
        }
        return;
      case 'publish-branch':
        if (this.currentRepository) {
          await publishLocalBranchResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
        }
        return;
      case 'sync-current-head':
        {
          const didScheduleRefresh = this.currentRepository
            ? await syncCurrentHeadWithUpstream(this.currentRepository, this.actionServices)
            : false;
          if (!didScheduleRefresh) {
            this.postCurrentState();
          }
        }
        return;
      case 'pull-current-head':
        {
          const didScheduleRefresh = this.currentRepository
            ? await pullCurrentBranchFromUpstream(this.currentRepository, this.actionServices)
            : false;
          if (!didScheduleRefresh) {
            this.postCurrentState();
          }
        }
        return;
      case 'push-current-head':
        {
          const didScheduleRefresh = this.currentRepository
            ? await pushCurrentBranchToUpstream(this.currentRepository, this.actionServices)
            : false;
          if (!didScheduleRefresh) {
            this.postCurrentState();
          }
        }
        return;
      case 'reset-current-workspace':
        if (this.currentRepository) {
          await resetCurrentBranchWorkspace(
            this.currentRepository,
            message.includeUntracked,
            this.actionServices
          );
        }
        return;
      case 'delete':
        if (this.currentRepository) {
          await deleteResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.actionServices
          );
        }
        return;
      case 'merge':
        if (this.currentRepository) {
          await mergeResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.refName },
            this.actionServices
          );
        }
        return;
    }
  }

  private async buildNextState(
    renderRequest: RevisionGraphRenderRequestContext,
    signal: AbortSignal
  ): Promise<RevisionGraphViewState | undefined> {
    if (!this.view) {
      return undefined;
    }

    if (!this.currentRepository) {
      return buildEmptyRevisionGraphViewState(this.git.repositories.length > 0, this.projectionOptions);
    }

    const repositoryPath = this.currentRepository.rootUri.fsPath;
    const trace = this.loadTrace.createSink(repositoryPath, renderRequest.intent, renderRequest.requestId);
    const bundle = await buildReadyRevisionGraphViewStateBundle(
      this.currentRepository,
      this.projectionOptions,
      this.backend,
      this.resolveLimitPolicy(),
      signal,
      trace
    );

    if (!this.isRenderRequestCurrent(renderRequest)) {
      return undefined;
    }

    return bundle.state;
  }

  private isRenderRequestCurrent(renderRequest: RevisionGraphRenderRequestContext): boolean {
    return renderRequest.requestId === this.renderCoordinator.getCurrentRequestId();
  }

  private resolveLimitPolicy(): RevisionGraphLimitPolicy {
    const configuredTimeoutMs = vscode.workspace
      .getConfiguration('gitRevisionGraph')
      .get<unknown>('graphCommandTimeoutMs', this.limitPolicy.graphCommandTimeoutMs);

    return {
      ...this.limitPolicy,
      graphCommandTimeoutMs: resolveGraphCommandTimeoutMs(
        configuredTimeoutMs,
        this.limitPolicy.graphCommandTimeoutMs
      )
    };
  }

  private async runFetchCurrentRepository(): Promise<void> {
    await runRevisionGraphFetchWorkflow(this.currentRepository, {
      ui: this.actionServices.ui,
      postActionLoading: (label, mode) => {
        this.postActionLoading(label, mode);
      },
      postCurrentState: () => {
        this.postCurrentState();
      },
      refresh: async (request) => {
        await this.refresh(request);
      },
      createCurrentRepositoryRefreshRequest: () => this.createCurrentRepositoryRefreshRequest('full-rebuild'),
      getCurrentRepositoryLabel: () => this.getCurrentRepositoryLabel()
    });
  }

  private getCurrentRepositoryLabel(): string {
    if (!this.currentRepository) {
      return 'the current repository';
    }

    return vscode.workspace.asRelativePath(this.currentRepository.rootUri, false) || this.currentRepository.rootUri.fsPath;
  }

  private attachToRepositories(repositories: readonly Repository[]): void {
    for (const repository of repositories) {
      this.attachRepository(repository);
    }
  }

  private attachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    if (this.repoSubscriptions.has(key)) {
      return;
    }

    this.repoSubscriptions.set(
      key,
      vscode.Disposable.from(
        repository.state.onDidChange(() => {
          void this.handleRepositoryStateChange(repository, 'full-rebuild', 'state');
        }),
        repository.onDidCheckout(() => {
          void this.handleRepositoryStateChange(repository, 'full-rebuild', 'checkout');
        })
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private handleRepositorySetChanged(): void {
    const previousRepository = this.currentRepository;
    const previousHasRepositories = this.currentState.hasRepositories;
    const nextRepository = reconcileCurrentRepository(this.git.repositories, this.currentRepository);
    this.setCurrentRepository(nextRepository);
    if (
      !shouldRefreshGraphForRepositorySetChange(
        previousRepository,
        nextRepository,
        previousHasRepositories,
        this.git.repositories.length > 0
      )
    ) {
      return;
    }

    void this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
  }

  private async handleRepositoryStateChange(
    repository: Repository,
    intent: RevisionGraphRefreshIntent,
    eventKind: RevisionGraphRepositoryEventKind
  ): Promise<void> {
    const previousRepository = this.currentRepository;
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (isSameRepositoryPath(repository, this.currentRepository) || (!previousRepository && this.currentRepository)) {
      if (consumePendingFollowUpRefresh(this.pendingFollowUpRefreshes, repository.rootUri.toString(), eventKind)) {
        return;
      }

      await this.refresh(this.createCurrentRepositoryRefreshRequest(intent));
    }
  }

  private setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      this.projectionOptions = createDefaultRevisionGraphProjectionOptions();
    }

    this.currentRepository = repository;
    this.syncViewTitle();
  }

  private createCurrentRepositoryRefreshRequest(intent: RevisionGraphRefreshIntent) {
    return createRepositoryRefreshRequest(intent, this.currentRepository?.rootUri.toString());
  }

  private resolveRefreshRequest(requestLike: RevisionGraphRefreshRequestLike): RevisionGraphRefreshRequest {
    const request = normalizeRefreshRequest(requestLike);
    if (request.repositoryPath || !this.currentRepository) {
      return request;
    }

    const enrichedRequest = createRepositoryRefreshRequest(
      request.intent,
      this.currentRepository.rootUri.toString()
    );

    return {
      ...enrichedRequest,
      ...request,
      repositoryPath: enrichedRequest.repositoryPath,
      followUpEvents: request.followUpEvents ?? enrichedRequest.followUpEvents
    };
  }

  private createRemoteTagPublicationRequestContext(
    repository: Repository
  ): RemoteTagPublicationRequestContext {
    return {
      repositoryPath: repository.rootUri.fsPath,
      state: this.currentState
    };
  }

  private postRemoteTagStateIfCurrent(
    requestContext: RemoteTagPublicationRequestContext,
    tagName: string,
    state: RemoteTagPublicationState
  ): void {
    if (!isRemoteTagPublicationStateResponseCurrent(
      requestContext,
      this.currentRepository?.rootUri.fsPath,
      this.currentState
    )) {
      return;
    }

    this.postHostMessage({
      type: 'set-remote-tag-state',
      tagName,
      state
    });
  }

  private postHostMessage(message: RevisionGraphViewHostMessage): void {
    void this.view?.webview.postMessage(this.loadTrace.withHostTraceContext(message));
  }

  private postCurrentState(): void {
    this.currentLoadingLabel = undefined;
    this.currentLoadingMode = undefined;
    this.currentErrorMessage = undefined;
    this.currentState = {
      ...this.currentState,
      loading: false,
      loadingLabel: undefined,
      errorMessage: undefined
    };
    this.postHostMessage({ type: 'update-state', state: this.currentState });
  }

  private postActionLoading(label: string, mode: 'blocking' | 'subtle' = 'blocking'): void {
    this.currentLoadingLabel = label;
    this.currentLoadingMode = mode;
    this.currentErrorMessage = undefined;
    this.currentState = {
      ...this.currentState,
      loading: true,
      loadingLabel: label,
      errorMessage: undefined
    };
    this.postHostMessage({ type: 'set-loading', label, mode });
  }

  private rehydrateWebview(): void {
    this.postHostMessage({
      type: 'init-state',
      state: this.currentState
    });

    if (this.currentLoadingLabel) {
      this.postHostMessage({
        type: 'set-loading',
        label: this.currentLoadingLabel,
        mode: this.currentLoadingMode
      });
      return;
    }

    if (this.currentErrorMessage) {
      this.postHostMessage({
        type: 'set-error',
        message: this.currentErrorMessage
      });
    }
  }

  private disposeViewDisposables(): void {
    while (this.viewDisposables.length > 0) {
      this.viewDisposables.pop()?.dispose();
    }
  }

  private syncViewTitle(): void {
    if (!this.view) {
      return;
    }

    this.view.setTitle(getRevisionGraphViewTitle(this.currentRepository));
  }

  private traceWebviewLoadEvent(
    phase: string,
    durationMs: number,
    detail: string | undefined,
    requestId: number | undefined
  ): void {
    this.loadTrace.traceWebviewLoadEvent(phase, durationMs, detail, requestId);
  }
}

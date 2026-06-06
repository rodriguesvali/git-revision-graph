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
  CompareResultsPresenter,
  RefActionServices
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
import {
  createDefaultRevisionGraphProjectionOptions,
  RemoteTagPublicationState,
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
  isRemoteTagPublicationStateResponseCurrent
} from './remoteTagState';
import { runRevisionGraphFetchWorkflow } from './fetchWorkflow';
import { RevisionGraphLoadTraceService } from './loadTraceService';
import { RevisionGraphMessageDispatcher } from './messageDispatcher';
import { RevisionGraphMessageHandler } from './messageHandler';
import {
  createRevisionGraphErrorMessage,
  createRevisionGraphInitStateMessage,
  createRevisionGraphLoadingMessage,
  createRevisionGraphRemoteTagStateMessage,
  createRevisionGraphUpdateStateMessage
} from './hostMessages';
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
import { createScriptOnlyWebviewOptions } from '../webviewOptions';

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
  private readonly actionServices: RefActionServices;
  private readonly messageDispatcher = new RevisionGraphMessageDispatcher();
  private readonly messageHandler: RevisionGraphMessageHandler;
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
        this.postHostMessage(createRevisionGraphLoadingMessage(label, this.currentLoadingMode));
      }
    },
    (state) => {
      this.currentLoadingLabel = undefined;
      this.currentLoadingMode = undefined;
      this.currentErrorMessage = undefined;
      this.currentState = state;
      this.postHostMessage(createRevisionGraphUpdateStateMessage(state));
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
      this.postHostMessage(createRevisionGraphErrorMessage(this.currentErrorMessage));
    }
  );
  private readonly loadTrace = new RevisionGraphLoadTraceService(() => this.renderCoordinator.getCurrentRequestId());
  private currentState: RevisionGraphViewState;
  private latestRefreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';

  constructor(
    private readonly git: API,
    private readonly backend: RevisionGraphBackend,
    compareResultsPresenter: CompareResultsPresenter,
    showLogPresenter: ShowLogPresenter,
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
    this.messageHandler = new RevisionGraphMessageHandler({
      actionServices: this.actionServices,
      showLogPresenter,
      rehydrateWebview: () => {
        this.rehydrateWebview();
      },
      writeClipboard: (text) => vscode.env.clipboard.writeText(text),
      pickRepository: () => pickRevisionGraphRepository(this.git, true),
      openUnifiedDiff: (repository, left, right) =>
        openUnifiedDiffDocument(repository, left, right, this.backend),
      getCurrentRepository: () => this.currentRepository,
      setCurrentRepository: (repository) => {
        this.setCurrentRepository(repository);
      },
      getCurrentState: () => this.currentState,
      getProjectionOptions: () => this.projectionOptions,
      setProjectionOptions: (options) => {
        this.projectionOptions = options;
      },
      refresh: async (request) => {
        await this.refresh(request);
      },
      runFetchCurrentRepository: async () => {
        await this.runFetchCurrentRepository();
      },
      postHostMessage: (message) => {
        this.postHostMessage(message);
      },
      postCurrentState: () => {
        this.postCurrentState();
      },
      traceWebviewLoadEvent: (phase, durationMs, detail, requestId) => {
        this.traceWebviewLoadEvent(phase, durationMs, detail, requestId);
      },
      createRemoteTagPublicationRequestContext: (repository) =>
        this.createRemoteTagPublicationRequestContext(repository),
      postRemoteTagStateIfCurrent: (requestContext, tagName, state) => {
        this.postRemoteTagStateIfCurrent(requestContext, tagName, state);
      }
    });
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
            await this.messageHandler.handleMessage(validatedMessage);
          }
        });
      })
    );
    view.webview.options = createScriptOnlyWebviewOptions();
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

    this.postHostMessage(createRevisionGraphRemoteTagStateMessage(tagName, state));
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
    this.postHostMessage(createRevisionGraphUpdateStateMessage(this.currentState));
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
    this.postHostMessage(createRevisionGraphLoadingMessage(label, mode));
  }

  private rehydrateWebview(): void {
    this.postHostMessage(createRevisionGraphInitStateMessage(this.currentState));

    if (this.currentLoadingLabel) {
      this.postHostMessage(createRevisionGraphLoadingMessage(this.currentLoadingLabel, this.currentLoadingMode));
      return;
    }

    if (this.currentErrorMessage) {
      this.postHostMessage(createRevisionGraphErrorMessage(this.currentErrorMessage));
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

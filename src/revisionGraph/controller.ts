import * as vscode from 'vscode';

import { handleAsyncTaskSafely } from '../asyncTaskBoundary';
import { API, Repository } from '../git';
import { toErrorDetail, toOperationError } from '../errorDetail';
import { handleWebviewMessageSafely } from '../webviewMessageBoundary';
import { shouldPromptForGraphRepositoryOnOpen } from '../repositorySelection';
import {
  CompareResultsPresenter,
  RefActionServices
} from '../refActions';
import { createWorkbenchRefActionServices } from '../workbenchRefActionServices';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from './backend';
import { openUnifiedDiffDocument } from './repository/log';
import { pickRevisionGraphRepository } from './repository/picker';
import { RevisionGraphRepositoryLifecycle } from './repository/lifecycle';
import {
  buildEmptyRevisionGraphViewState,
  buildReadyRevisionGraphViewStateBundle,
  buildReadyRevisionGraphViewStateBundleFromSnapshot
} from './panel/state';
import type { RevisionGraphProjectionOptions } from './model/commitGraphTypes';
import type { RevisionGraphSnapshot } from './source/graphSnapshot';
import { RevisionGraphRenderCoordinator } from './renderCoordinator';
import {
  createDefaultRevisionGraphProjectionOptions,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { REVISION_GRAPH_VIEW_ID } from '../revisionGraphTypes';
import { GRAPH_LIMIT_POLICY } from './panel/shared';
import { renderRevisionGraphShellHtml } from '../revisionGraphWebview';
import { getRevisionGraphViewTitle } from './viewTitle';
import { ShowLogPresenter } from '../showLogView';
import {
  RevisionGraphFetchWorkflowHost,
  runRevisionGraphFetchWorkflow
} from './fetchWorkflow';
import { RevisionGraphLoadTraceService } from './loadTraceService';
import { RevisionGraphMessageDispatcher } from './messageDispatcher';
import { RevisionGraphMessageHandler } from './messageHandler';
import { loadCommitShortStat } from './repository/commitShortStat';
import { openShowLogCommitOnRemote } from '../showLog/remoteCommitAction';
import {
  createRevisionGraphErrorMessage,
  createRevisionGraphInitStateMessage,
  createRevisionGraphLoadingMessage,
  createRevisionGraphUpdateStateMessage
} from './hostMessages';
import {
  getRefreshLoadingLabel,
  getRefreshLoadingMode,
  canReuseSnapshotForProjectionOptions,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequestLike,
  RevisionGraphRepositoryEventKind
} from '../revisionGraphRefresh';
import { createScriptOnlyWebviewOptions } from '../webviewOptions';
import {
  createMutationGuardedRepository,
  RepositoryMutationCoordinator,
  runGuardedRepositoryMutation
} from '../repositoryMutationCoordinator';
import { showConcurrentRepositoryMutationWarning } from '../repositoryMutationWarning';
import { RevisionGraphFlowGovernanceWorkflow } from './flow/governanceWorkflow';
import { RevisionGraphRemoteTagStatePublisher } from './remoteTagStatePublisher';

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

interface RevisionGraphRenderResult {
  readonly state: RevisionGraphViewState;
  readonly repositoryPath?: string;
  readonly snapshot?: RevisionGraphSnapshot;
  readonly snapshotOptions?: RevisionGraphProjectionOptions;
}

interface ReusableRevisionGraphSnapshot {
  readonly repositoryPath: string;
  readonly snapshot: RevisionGraphSnapshot;
  readonly snapshotOptions: RevisionGraphProjectionOptions;
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
  private readonly repositoryLifecycle: RevisionGraphRepositoryLifecycle;
  private projectionOptions = createDefaultRevisionGraphProjectionOptions();
  private currentLoadingLabel: string | undefined;
  private currentLoadingMode: 'blocking' | 'subtle' | undefined;
  private currentErrorMessage: string | undefined;
  private readonly actionServices: RefActionServices;
  private readonly messageDispatcher = new RevisionGraphMessageDispatcher();
  private readonly messageHandler: RevisionGraphMessageHandler;
  private readonly renderCoordinator = new RevisionGraphRenderCoordinator<RevisionGraphRenderResult>(
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
    (result) => {
      this.currentLoadingLabel = undefined;
      this.currentLoadingMode = undefined;
      this.currentErrorMessage = undefined;
      this.currentState = result.state;
      this.reusableGraphSnapshot = result.snapshot && result.repositoryPath && result.snapshotOptions
        ? {
            repositoryPath: result.repositoryPath,
            snapshot: result.snapshot,
            snapshotOptions: result.snapshotOptions
          }
        : undefined;
      this.postHostMessage(createRevisionGraphUpdateStateMessage(result.state));
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
  private reusableGraphSnapshot: ReusableRevisionGraphSnapshot | undefined;
  private commitShortStatAbortController = new AbortController();
  private readonly mutationCoordinator: RepositoryMutationCoordinator;
  private readonly ownsMutationCoordinator: boolean;
  private readonly flowGovernanceWorkflow: RevisionGraphFlowGovernanceWorkflow;
  private readonly remoteTagStatePublisher: RevisionGraphRemoteTagStatePublisher;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly git: API,
    private readonly backend: RevisionGraphBackend,
    compareResultsPresenter: CompareResultsPresenter,
    showLogPresenter: ShowLogPresenter,
    private readonly viewId: string = REVISION_GRAPH_VIEW_ID,
    private readonly limitPolicy: RevisionGraphLimitPolicy = GRAPH_LIMIT_POLICY,
    private readonly clearLayoutCache: () => PromiseLike<void> | void = () => undefined,
    mutationCoordinator?: RepositoryMutationCoordinator
  ) {
    this.mutationCoordinator = mutationCoordinator ?? new RepositoryMutationCoordinator();
    this.ownsMutationCoordinator = !mutationCoordinator;
    this.currentState = buildEmptyRevisionGraphViewState(
      git.repositories.length > 0,
      this.projectionOptions
    );
    this.repositoryLifecycle = new RevisionGraphRepositoryLifecycle(git, {
      onCurrentRepositoryChanging: (repository) => {
        this.mutationCoordinator.invalidate(repository.rootUri.fsPath);
        this.abortCommitShortStatRequests();
      },
      onCurrentRepositoryChanged: (repositoryChanged) => {
        if (repositoryChanged) {
          this.projectionOptions = createDefaultRevisionGraphProjectionOptions();
          this.reusableGraphSnapshot = undefined;
        }
        this.syncViewTitle();
      },
      onRepositoryClosed: (repository) => {
        this.mutationCoordinator.invalidate(repository.rootUri.fsPath);
      },
      onRepositorySetChanged: () => {
        this.handleRepositorySetChanged();
      },
      onRepositoryStateChange: (repository, intent, eventKind) => {
        this.runControllerTask(
          () => this.handleRepositoryStateChange(repository, intent, eventKind),
          'Could not refresh the revision graph after the repository changed.'
        );
      }
    });
    this.actionServices = createWorkbenchRefActionServices(
      (request) => {
        this.runControllerTask(
          () => this.refresh(request),
          'Could not refresh the revision graph after the Git operation.'
        );
      },
      (request) => {
        return this.prepareRefresh(request);
      },
      compareResultsPresenter
    );
    this.flowGovernanceWorkflow = new RevisionGraphFlowGovernanceWorkflow({
      actionServices: this.actionServices,
      mutationCoordinator: this.mutationCoordinator,
      getCurrentRepository: () => this.currentRepository,
      getCurrentState: () => this.currentState,
      setCurrentState: (state) => {
        this.currentState = state;
      },
      postCurrentState: () => this.postCurrentState(),
      postHostMessage: (message) => this.postHostMessage(message)
    });
    this.remoteTagStatePublisher = new RevisionGraphRemoteTagStatePublisher({
      getCurrentRepository: () => this.currentRepository,
      getCurrentState: () => this.currentState,
      postHostMessage: (message) => this.postHostMessage(message)
    });
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
      loadCommitShortStat: (repository, commitHash) =>
        loadCommitShortStat(repository.rootUri.fsPath, commitHash, this.commitShortStatAbortController.signal),
      openCommitOnRemote: (repository, commitHash) =>
        openShowLogCommitOnRemote(repository, commitHash).then(() => undefined),
      getCurrentRepository: () => this.currentRepository,
      setCurrentRepository: (repository) => {
        this.repositoryLifecycle.setCurrentRepository(repository);
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
      updateFlowGovernanceOptions: async (options) => {
        await this.flowGovernanceWorkflow.updateOptions(options);
      },
      startFlowBranch: async (branchKind, sourceRefName, name, description) => {
        await this.flowGovernanceWorkflow.startBranch(branchKind, sourceRefName, name, description);
      },
      prepareFlowEqualization: async (targetRefName, originRefName, description) => {
        await this.flowGovernanceWorkflow.prepareEqualization(targetRefName, originRefName, description);
      },
      copyFlowPullRequestContext: async (sourceRefName, targetRefName) => {
        await this.flowGovernanceWorkflow.copyPullRequestContext(sourceRefName, targetRefName);
      },
      copyFlowPullRequestContextField: async (sourceRefName, targetRefName, field) => {
        await this.flowGovernanceWorkflow.copyPullRequestContextField(sourceRefName, targetRefName, field);
      },
      openFlowPullRequestUrl: async (sourceRefName, targetRefName) => {
        await this.flowGovernanceWorkflow.openPullRequestUrl(sourceRefName, targetRefName);
      },
      clearLayoutCache: () => {
        return this.clearLayoutCache();
      },
      traceWebviewLoadEvent: (phase, durationMs, detail, requestId) => {
        this.traceWebviewLoadEvent(phase, durationMs, detail, requestId);
      },
      createRemoteTagPublicationRequestContext: (repository) =>
        this.remoteTagStatePublisher.createRequestContext(repository),
      postRemoteTagStateIfCurrent: (requestContext, tagName, state) => {
        this.remoteTagStatePublisher.postIfCurrent(requestContext, tagName, state);
      },
      runRepositoryMutation: async (repository, action) => {
        const outcome = await runGuardedRepositoryMutation(
          this.mutationCoordinator,
          repository,
          this.actionServices,
          action
        );
        if (outcome.status === 'rejected') {
          await showConcurrentRepositoryMutationWarning(vscode.window);
          return undefined;
        }

        return outcome.value;
      }
    });
  }

  private get currentRepository(): Repository | undefined {
    return this.repositoryLifecycle.getCurrentRepository();
  }

  dispose(): void {
    if (this.currentRepository) {
      this.mutationCoordinator.invalidate(this.currentRepository.rootUri.fsPath);
    }
    this.abortCommitShortStatRequests();
    if (this.ownsMutationCoordinator) {
      this.mutationCoordinator.dispose();
    }
    this.renderCoordinator.cancel();
    this.disposeViewDisposables();
    this.loadTrace.dispose();

    this.repositoryLifecycle.dispose();
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
          this.abortCommitShortStatRequests();
          this.view = undefined;
        }
        this.disposeViewDisposables();
      }),
      view.webview.onDidReceiveMessage((message: unknown) => {
        void handleWebviewMessageSafely(
          () => this.messageDispatcher.dispatch(message, {
            currentState: this.currentState,
            currentRepositoryPath: this.currentRepository?.rootUri.fsPath,
            handleMessage: async (validatedMessage) => {
              await this.messageHandler.handleMessage(validatedMessage);
            }
          }),
          {
            onUnexpectedError: async (error) => {
              const detail = toOperationError('Could not handle the revision graph action.', error);
              console.error(detail);
              this.currentLoadingLabel = undefined;
              this.currentLoadingMode = undefined;
              this.currentErrorMessage = detail;
              this.currentState = {
                ...this.currentState,
                loading: false,
                loadingLabel: undefined,
                errorMessage: detail
              };
              this.postHostMessage(createRevisionGraphErrorMessage(detail));
              await vscode.window.showErrorMessage(detail);
            },
            reportBoundaryFailure: (error) => {
              console.error('Revision graph error reporting failed.', error);
            }
          }
        );
      })
    );
    const runtimeRoot = vscode.Uri.joinPath(this.extensionUri, 'out', 'webview');
    const runtimeUri = view.webview.asWebviewUri(vscode.Uri.joinPath(runtimeRoot, 'revisionGraph.js'));
    view.webview.options = createScriptOnlyWebviewOptions([runtimeRoot]);
    view.webview.html = renderRevisionGraphShellHtml({
      runtimeUri: runtimeUri.toString(),
      scriptSource: view.webview.cspSource
    });

    this.repositoryLifecycle.reconcileCurrentRepository();
    if (!this.currentRepository) {
      this.repositoryLifecycle.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    this.runControllerTask(
      () => this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild')),
      'Could not load the revision graph.'
    );
  }

  async open(): Promise<void> {
    const hadResolvedView = !!this.view;
    await vscode.commands.executeCommand(`${this.viewId}.focus`);
    this.repositoryLifecycle.reconcileCurrentRepository();
    if (shouldPromptForGraphRepositoryOnOpen(this.git.repositories, this.currentRepository, hadResolvedView)) {
      this.repositoryLifecycle.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    if (!hadResolvedView && this.view) {
      return;
    }

    await this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
  }

  async refresh(requestLike: RevisionGraphRefreshRequestLike = 'full-rebuild'): Promise<void> {
    if (!this.view) {
      return;
    }

    const request = this.repositoryLifecycle.resolveRefreshRequest(requestLike);
    const preparedRefresh = this.prepareRefresh(request);
    if (request.clearSnapshotCache) {
      this.backend.clearGraphSnapshotCache?.();
      this.reusableGraphSnapshot = undefined;
    }
    const renderIntent = this.resolveEffectiveRefreshIntent(request.intent);
    this.latestRefreshIntent = renderIntent;

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
    return this.repositoryLifecycle.prepareRefresh(requestLike);
  }

  private async buildNextState(
    renderRequest: RevisionGraphRenderRequestContext,
    signal: AbortSignal
  ): Promise<RevisionGraphRenderResult | undefined> {
    if (!this.view) {
      return undefined;
    }

    if (!this.currentRepository) {
      return {
        state: buildEmptyRevisionGraphViewState(this.git.repositories.length > 0, this.projectionOptions)
      };
    }

    const repositoryPath = this.currentRepository.rootUri.fsPath;
    const trace = this.loadTrace.createSink(repositoryPath, renderRequest.intent, renderRequest.requestId);
    const reusableSnapshot = this.resolveReusableGraphSnapshot(repositoryPath, renderRequest.intent);
    const flowGovernanceSettings = this.flowGovernanceWorkflow.resolveSettings(this.currentRepository);
    trace?.({
      phase: 'state.snapshotReuse',
      durationMs: 0,
      detail: reusableSnapshot ? 'result=hit' : `result=miss; intent=${renderRequest.intent}`
    });
    const bundle = reusableSnapshot
      ? await buildReadyRevisionGraphViewStateBundleFromSnapshot(
          this.currentRepository,
          this.projectionOptions,
          this.backend,
          reusableSnapshot,
          signal,
          trace,
          { flowGovernanceSettings }
        )
      : await buildReadyRevisionGraphViewStateBundle(
          this.currentRepository,
          this.projectionOptions,
          this.backend,
          this.resolveLimitPolicy(),
          signal,
          trace,
          { flowGovernanceSettings }
        );

    if (!this.isRenderRequestCurrent(renderRequest)) {
      return undefined;
    }

    this.repositoryLifecycle.recordRepositoryStateSignature(this.currentRepository);

    return {
      state: bundle.state,
      repositoryPath,
      snapshot: bundle.snapshot,
      snapshotOptions: this.projectionOptions
    };
  }

  private resolveReusableGraphSnapshot(
    repositoryPath: string,
    intent: RevisionGraphRefreshIntent
  ): RevisionGraphSnapshot | undefined {
    if (intent !== 'projection-only') {
      return undefined;
    }

    const reusableSnapshot = this.reusableGraphSnapshot;
    if (!reusableSnapshot || reusableSnapshot.repositoryPath !== repositoryPath) {
      return undefined;
    }

    return canReuseSnapshotForProjectionOptions(reusableSnapshot.snapshotOptions, this.projectionOptions)
      ? reusableSnapshot.snapshot
      : undefined;
  }

  private resolveEffectiveRefreshIntent(intent: RevisionGraphRefreshIntent): RevisionGraphRefreshIntent {
    if (intent !== 'projection-only' || !this.currentRepository) {
      return intent;
    }

    return this.resolveReusableGraphSnapshot(this.currentRepository.rootUri.fsPath, intent)
      ? 'projection-only'
      : 'full-rebuild';
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
    const repository = this.currentRepository;
    if (!repository) {
      await runRevisionGraphFetchWorkflow(undefined, this.createFetchWorkflowHost());
      return;
    }

    const outcome = await this.mutationCoordinator.run(repository.rootUri.fsPath, (lease) =>
      runRevisionGraphFetchWorkflow(
        createMutationGuardedRepository(repository, lease),
        this.createFetchWorkflowHost(() => lease.assertCurrent(), lease.signal)
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(vscode.window);
    }
  }

  private createFetchWorkflowHost(
    assertMutationCurrent?: () => void,
    signal?: AbortSignal
  ): RevisionGraphFetchWorkflowHost {
    return {
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
      getCurrentRepositoryLabel: () => this.getCurrentRepositoryLabel(),
      assertMutationCurrent,
      signal
    };
  }

  private getCurrentRepositoryLabel(): string {
    if (!this.currentRepository) {
      return 'the current repository';
    }

    return vscode.workspace.asRelativePath(this.currentRepository.rootUri, false) || this.currentRepository.rootUri.fsPath;
  }

  private handleRepositorySetChanged(): void {
    if (!this.repositoryLifecycle.shouldRefreshForRepositorySetChange(this.currentState.hasRepositories)) {
      return;
    }

    this.runControllerTask(
      () => this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild')),
      'Could not refresh the revision graph after the repository list changed.'
    );
  }

  private runControllerTask(task: () => PromiseLike<void> | void, failureMessage: string): void {
    void handleAsyncTaskSafely(task, {
      onUnexpectedError: async (error) => {
        const detail = toOperationError(failureMessage, error);
        console.error(detail);
        this.currentLoadingLabel = undefined;
        this.currentLoadingMode = undefined;
        this.currentErrorMessage = detail;
        this.currentState = {
          ...this.currentState,
          loading: false,
          loadingLabel: undefined,
          errorMessage: detail
        };
        this.postHostMessage(createRevisionGraphErrorMessage(detail));
        await vscode.window.showErrorMessage(detail);
      },
      reportBoundaryFailure: (error) => {
        console.error('Revision graph task error reporting failed.', error);
      }
    });
  }

  private async handleRepositoryStateChange(
    repository: Repository,
    intent: RevisionGraphRefreshIntent,
    eventKind: RevisionGraphRepositoryEventKind
  ): Promise<void> {
    const previousRepository = this.currentRepository;
    this.repositoryLifecycle.reconcileCurrentRepository();

    if (this.repositoryLifecycle.isRepositoryCurrentOrFirstResolution(repository, previousRepository)) {
      if (this.repositoryLifecycle.consumePendingFollowUpRefresh(repository, eventKind)) {
        return;
      }

      if (eventKind === 'state' && this.tryPostRepositoryStatusUpdate(repository)) {
        return;
      }

      await this.refresh(this.createCurrentRepositoryRefreshRequest(intent));
    }
  }

  private tryPostRepositoryStatusUpdate(repository: Repository): boolean {
    const result = this.repositoryLifecycle.tryApplyRepositoryStatusUpdate(repository, this.currentState);
    if (!result.handled) {
      return false;
    }

    if (result.state) {
      this.currentLoadingLabel = undefined;
      this.currentLoadingMode = undefined;
      this.currentErrorMessage = undefined;
      this.currentState = result.state;
      this.postHostMessage(createRevisionGraphUpdateStateMessage(this.currentState));
    }
    return true;
  }

  private createCurrentRepositoryRefreshRequest(intent: RevisionGraphRefreshIntent) {
    return this.repositoryLifecycle.createCurrentRepositoryRefreshRequest(intent);
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

  private abortCommitShortStatRequests(): void {
    this.commitShortStatAbortController.abort();
    this.commitShortStatAbortController = new AbortController();
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

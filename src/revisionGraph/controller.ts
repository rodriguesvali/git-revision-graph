import * as vscode from 'vscode';

import { API, Remote, Repository } from '../git';
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
import {
  RevisionGraphFetchWorkflowHost,
  runRevisionGraphFetchWorkflow
} from './fetchWorkflow';
import { RevisionGraphLoadTraceService } from './loadTraceService';
import { RevisionGraphMessageDispatcher } from './messageDispatcher';
import { RevisionGraphMessageHandler } from './messageHandler';
import { loadCommitShortStat } from './repository/commitShortStat';
import { openShowLogCommitOnGitHub } from '../showLog/remoteCommitAction';
import {
  createRevisionGraphErrorMessage,
  createRevisionGraphFlowPullRequestContextMessage,
  createRevisionGraphInitStateMessage,
  createRevisionGraphLoadingMessage,
  createRevisionGraphRemoteTagStateMessage,
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
import type { FlowConfigSource, FlowGovernanceSettings, FlowStartBranchKind } from './flow';
import {
  applyFlowGovernanceOptionsUpdate,
  buildGitHubPullRequestUrl,
  checkFlowPullRequestSourcePublication,
  checkFlowPullRequestTarget,
  createFlowPullRequestContext,
  FlowGovernanceOptionsUpdate,
  loadFlowPullRequestRemoteBranchCommit,
  prepareFlowEqualizationBranch,
  resolveGitHubPullRequestRemote,
  resolveFlowConfigForRepository,
  startFlowBranch,
  updateRepositoryFlowConfigOptions
} from './flow';

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

  constructor(
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
        void this.handleRepositoryStateChange(repository, intent, eventKind);
      }
    });
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
      loadCommitShortStat: (repository, commitHash) =>
        loadCommitShortStat(repository.rootUri.fsPath, commitHash, this.commitShortStatAbortController.signal),
      openCommitOnGitHub: (repository, commitHash) =>
        openShowLogCommitOnGitHub(repository, commitHash).then(() => undefined),
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
      updateFlowGovernanceOptions: (options) => {
        void this.updateFlowGovernanceOptions(options);
      },
      startFlowBranch: async (branchKind, sourceRefName, name, description) => {
        await this.startFlowBranch(branchKind, sourceRefName, name, description);
      },
      prepareFlowEqualization: async (targetRefName, originRefName, description) => {
        await this.prepareFlowEqualization(targetRefName, originRefName, description);
      },
      copyFlowPullRequestContext: async (sourceRefName, targetRefName) => {
        await this.copyFlowPullRequestContext(sourceRefName, targetRefName);
      },
      copyFlowPullRequestContextField: async (sourceRefName, targetRefName, field) => {
        await this.copyFlowPullRequestContextField(sourceRefName, targetRefName, field);
      },
      openFlowPullRequestUrl: async (sourceRefName, targetRefName) => {
        await this.openFlowPullRequestUrl(sourceRefName, targetRefName);
      },
      clearLayoutCache: () => {
        return this.clearLayoutCache();
      },
      traceWebviewLoadEvent: (phase, durationMs, detail, requestId) => {
        this.traceWebviewLoadEvent(phase, durationMs, detail, requestId);
      },
      createRemoteTagPublicationRequestContext: (repository) =>
        this.createRemoteTagPublicationRequestContext(repository),
      postRemoteTagStateIfCurrent: (requestContext, tagName, state) => {
        this.postRemoteTagStateIfCurrent(requestContext, tagName, state);
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
    view.webview.options = createScriptOnlyWebviewOptions();
    view.webview.html = renderRevisionGraphShellHtml();

    this.repositoryLifecycle.reconcileCurrentRepository();
    if (!this.currentRepository) {
      this.repositoryLifecycle.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    void this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
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
    const flowGovernanceSettings = this.resolveFlowGovernanceSettings(this.currentRepository);
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

  private resolveFlowGovernanceSettings(repository: Repository): FlowGovernanceSettings {
    const config = vscode.workspace.getConfiguration('gitRevisionGraph.flowGovernance', repository.rootUri);
    return {
      enabled: config.get<boolean>('enabled'),
      configPath: config.get<string>('configPath')
    };
  }

  private async updateFlowGovernanceOptions(options: FlowGovernanceOptionsUpdate): Promise<void> {
    const flowGovernance = this.currentState.flowGovernance;
    if (this.currentState.viewMode !== 'ready' || !flowGovernance) {
      return;
    }

    const repository = this.currentRepository;
    const configSource = flowGovernance.configSource;
    const settings = repository ? this.resolveFlowGovernanceSettings(repository) : undefined;
    this.currentState = {
      ...this.currentState,
      flowGovernance: applyFlowGovernanceOptionsUpdate(flowGovernance, options)
    };
    this.postCurrentState();

    await this.persistFlowGovernanceOptions(repository, settings, configSource, options);
  }

  private async persistFlowGovernanceOptions(
    repository: Repository | undefined,
    settings: FlowGovernanceSettings | undefined,
    configSource: FlowConfigSource,
    options: FlowGovernanceOptionsUpdate
  ): Promise<void> {
    if (!repository || configSource !== 'repository' || !hasPersistableFlowGovernanceOptions(options)) {
      return;
    }

    const result = await updateRepositoryFlowConfigOptions(
      repository.rootUri.fsPath,
      settings,
      options
    );
    if (!result.ok) {
      void vscode.window.showWarningMessage(
        `Could not update Flow Governance config: ${result.issue.message}`
      );
    }
  }

  private async startFlowBranch(
    branchKind: FlowStartBranchKind,
    sourceRefName: string,
    name: string,
    description: string | undefined
  ): Promise<void> {
    const repository = this.currentRepository;
    if (!repository) {
      return;
    }

    const settings = this.resolveFlowGovernanceSettings(repository);
    const flowConfig = await resolveFlowConfigForRepository(repository.rootUri.fsPath, settings);
    if (!flowConfig.ok || !flowConfig.config.enabled) {
      this.actionServices.ui.showWarningMessage('Flow Governance is not available for this repository.');
      return;
    }

    const outcome = await runGuardedRepositoryMutation(
      this.mutationCoordinator,
      repository,
      this.actionServices,
      (guardedRepository, services) => startFlowBranch(
        guardedRepository,
        {
          kind: branchKind,
          sourceBranch: sourceRefName,
          name,
          config: flowConfig.config,
          ...(description !== undefined ? { description } : {})
        },
        services
      )
    );
    if (outcome.status === 'rejected') {
      this.actionServices.ui.showWarningMessage('Another Git operation is already running for this repository.');
    }
  }

  private async prepareFlowEqualization(
    targetRefName: string,
    originRefName: string,
    description: string
  ): Promise<void> {
    const repository = this.currentRepository;
    if (!repository) {
      return;
    }

    const outcome = await runGuardedRepositoryMutation(
      this.mutationCoordinator,
      repository,
      this.actionServices,
      (guardedRepository, services) => prepareFlowEqualizationBranch(
          guardedRepository,
          { targetBranch: targetRefName, originBranch: originRefName, description },
          services
        )
    );
    if (outcome.status === 'rejected') {
      this.actionServices.ui.showWarningMessage('Another Git operation is already running for this repository.');
    }
  }

  private async copyFlowPullRequestContext(sourceRefName: string, targetRefName: string): Promise<void> {
    const repository = this.currentRepository;
    if (!repository) {
      return;
    }
    if (!await this.ensureFlowPullRequestTargetEligible(repository, sourceRefName, targetRefName)) {
      return;
    }
    if (!await this.ensureFlowPullRequestSourceReady(repository, sourceRefName)) {
      return;
    }
    const context = createFlowPullRequestContext(sourceRefName, targetRefName);
    this.postHostMessage(createRevisionGraphFlowPullRequestContextMessage(
      context.sourceRefName,
      context.targetRefName,
      context.title,
      context.body
    ));
  }

  private async copyFlowPullRequestContextField(
    sourceRefName: string,
    targetRefName: string,
    field: 'title' | 'description'
  ): Promise<void> {
    const context = createFlowPullRequestContext(sourceRefName, targetRefName);
    await vscode.env.clipboard.writeText(field === 'title' ? context.title : context.body);
  }

  private async openFlowPullRequestUrl(sourceRefName: string, targetRefName: string): Promise<void> {
    const repository = this.currentRepository;
    if (!repository) {
      return;
    }

    if (!resolveGitHubPullRequestRemote(repository)) {
      this.actionServices.ui.showInformationMessage('No GitHub remote is configured for this repository.');
      return;
    }
    if (!await this.ensureFlowPullRequestTargetEligible(repository, sourceRefName, targetRefName)) {
      return;
    }
    if (!await this.ensureFlowPullRequestSourceReady(repository, sourceRefName)) {
      return;
    }

    const url = buildGitHubPullRequestUrl(repository, sourceRefName, targetRefName);
    if (!url) {
      return;
    }

    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private async ensureFlowPullRequestTargetEligible(
    repository: Repository,
    sourceRefName: string,
    targetRefName: string
  ): Promise<boolean> {
    const flowReferences = this.currentState.flowGovernance?.references ?? [];
    const requiresProductionAncestry =
      flowReferences.some((reference) => (
        reference.refName === sourceRefName
        && (reference.kind === 'release' || reference.kind === 'hotfix')
      ))
      && flowReferences.some((reference) => reference.refName === targetRefName && reference.kind === 'main');
    let targetCommitish: string | undefined;
    let productionRemoteName: string | undefined;
    if (requiresProductionAncestry) {
      const remote = this.resolveFlowPullRequestRemote(repository);
      if (!remote) {
        await this.actionServices.ui.showWarningMessage(
          `Production promotion aborted: no remote is available to verify the current ${targetRefName} branch.`,
          { modal: true }
        );
        return false;
      }
      productionRemoteName = remote.name;

      const remoteTargetOutcome = await runGuardedRepositoryMutation(
        this.mutationCoordinator,
        repository,
        this.actionServices,
        (guardedRepository) => loadFlowPullRequestRemoteBranchCommit(
          guardedRepository,
          remote.name,
          targetRefName
        )
      );
      if (remoteTargetOutcome.status === 'rejected') {
        this.actionServices.ui.showWarningMessage('Another Git operation is already running for this repository.');
        return false;
      }
      const remoteTarget = remoteTargetOutcome.value;
      if (remoteTarget.status !== 'found') {
        const detail = remoteTarget.status === 'missing'
          ? `${remote.name}/${targetRefName} does not exist.`
          : remoteTarget.detail;
        await this.actionServices.ui.showWarningMessage(
          `Production promotion aborted: the current production branch could not be verified on ${remote.name}. ${detail}`,
          { modal: true }
        );
        return false;
      }
      targetCommitish = remoteTarget.commit;
    }
    const eligibility = await checkFlowPullRequestTarget(
      repository.rootUri.fsPath,
      sourceRefName,
      targetRefName,
      {
        requireTargetAncestor: requiresProductionAncestry,
        requireTargetSynchronized: requiresProductionAncestry,
        ...(targetCommitish ? { targetCommitish } : {})
      }
    );
    if (eligibility.status === 'ahead') {
      return true;
    }

    let message: string;
    if (eligibility.status === 'production-out-of-sync') {
      const remoteLabel = `${productionRemoteName ?? 'remote'}/${targetRefName}`;
      const localAhead = eligibility.targetLocalAhead ?? 0;
      const remoteAhead = eligibility.targetRemoteAhead ?? 0;
      const relationship = remoteAhead > 0 && localAhead === 0
        ? `${targetRefName} is behind ${remoteLabel} by ${remoteAhead} commit(s)`
        : localAhead > 0 && remoteAhead === 0
          ? `${targetRefName} is ahead of ${remoteLabel} by ${localAhead} commit(s)`
          : `${targetRefName} has diverged from ${remoteLabel}`;
      message = `Production promotion aborted: ${relationship}. ` +
        `Synchronize the local ${targetRefName} branch with ${remoteLabel}, refresh the graph, and retry.`;
    } else if (eligibility.status === 'production-not-ancestor') {
      message = `Production promotion aborted: ${sourceRefName} does not contain every commit from ${targetRefName}. ` +
        'The source may have been created from outdated production and can be incompatible with current production. ' +
        'Synchronize or equalize the source with production, validate it, and then retry the promotion Pull Request.';
    } else if (eligibility.status === 'not-ahead') {
      message = `${sourceRefName} has no commits ahead of ${targetRefName}. Pull Request context was not opened.`;
    } else {
      message = `Could not verify whether ${sourceRefName} is eligible for promotion into ${targetRefName}. ` +
        'Pull Request context was not opened.';
    }
    await this.actionServices.ui.showWarningMessage(message, { modal: true });
    return false;
  }

  private async ensureFlowPullRequestSourceReady(
    repository: Repository,
    sourceRefName: string
  ): Promise<boolean> {
    const remote = this.resolveFlowPullRequestRemote(repository);
    if (!remote) {
      await this.actionServices.ui.showInformationMessage(
        'No Git remote is configured for this repository. Pull Request context was not opened.'
      );
      return false;
    }

    try {
      const outcome = await runGuardedRepositoryMutation(
        this.mutationCoordinator,
        repository,
        this.actionServices,
        async (guardedRepository, services) => {
          let publication = await checkFlowPullRequestSourcePublication(
            guardedRepository,
            remote.name,
            sourceRefName
          );
          if (publication.status === 'ready') {
            return true;
          }

          if (publication.status === 'remote-ahead') {
            await services.ui.showWarningMessage(
              `${remote.name}/${sourceRefName} contains commits that are not present locally. ` +
              'Synchronize and review the branch before creating the Pull Request.',
              { modal: true }
            );
            return false;
          }
          if (publication.status === 'diverged') {
            await services.ui.showWarningMessage(
              `${sourceRefName} has diverged from ${remote.name}/${sourceRefName}. ` +
              'Resolve the divergence before creating the Pull Request. Flow Governance will not force push.',
              { modal: true }
            );
            return false;
          }
          if (publication.status === 'unknown') {
            await services.ui.showWarningMessage(
              `Could not verify ${sourceRefName} on ${remote.name}. Pull Request context was not opened. ` +
              (publication.detail ?? ''),
              { modal: true }
            );
            return false;
          }
          if (remote.isReadOnly) {
            await services.ui.showWarningMessage(
              `${remote.name} is read-only and ${sourceRefName} cannot be synchronized for this Pull Request.`,
              { modal: true }
            );
            return false;
          }

          const isPublish = publication.status === 'unpublished';
          const confirmed = await services.ui.confirm({
            message: isPublish
              ? `${sourceRefName} is not available on ${remote.name}. Publish it before creating the Pull Request?`
              : `${sourceRefName} has commits that are not available on ${remote.name}. Push them before creating the Pull Request?`,
            confirmLabel: isPublish ? 'Publish and Continue' : 'Push and Continue'
          });
          if (!confirmed) {
            return false;
          }

          await guardedRepository.push(remote.name, sourceRefName, isPublish);
          publication = await checkFlowPullRequestSourcePublication(
            guardedRepository,
            remote.name,
            sourceRefName
          );
          if (publication.status !== 'ready') {
            await services.ui.showWarningMessage(
              `The branch was pushed, but ${sourceRefName} could not be confirmed as synchronized with ` +
              `${remote.name}/${sourceRefName}. Pull Request context was not opened.`,
              { modal: true }
            );
            return false;
          }

          services.refreshController.refresh();
          return true;
        }
      );
      if (outcome.status === 'rejected') {
        this.actionServices.ui.showWarningMessage('Another Git operation is already running for this repository.');
        return false;
      }
      return outcome.value;
    } catch (error) {
      await this.actionServices.ui.showErrorMessage(
        toOperationError(`Could not synchronize ${sourceRefName} before creating the Pull Request.`, error),
        { modal: true }
      );
      return false;
    }
  }

  private resolveFlowPullRequestRemote(repository: Repository): Remote | undefined {
    return resolveGitHubPullRequestRemote(repository)
      ?? repository.state.remotes.find((candidate) => candidate.name === 'origin')
      ?? repository.state.remotes[0];
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
        this.createFetchWorkflowHost(() => lease.assertCurrent())
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(vscode.window);
    }
  }

  private createFetchWorkflowHost(
    assertMutationCurrent?: () => void
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
      assertMutationCurrent
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

    void this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
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

function hasPersistableFlowGovernanceOptions(options: FlowGovernanceOptionsUpdate): boolean {
  return options.enabled !== undefined;
}

import * as vscode from 'vscode';

import { API, Repository } from '../git';
import { toErrorDetail } from '../errorDetail';
import { execGitWithResult } from '../gitExec';
import {
  isSameRepositoryPath,
  reconcileCurrentRepository,
  shouldRefreshGraphForRepositorySetChange,
  shouldPromptForGraphRepositoryOnOpen
} from '../repositorySelection';
import {
  createBranchFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  CompareResultsPresenter,
  RefActionKind,
  syncCurrentHeadWithUpstream
} from '../refActions';
import { createWorkbenchRefActionServices } from '../workbenchRefActionServices';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from './backend';
import { openCommitDetails, openUnifiedDiffDocument, showRevisionLogQuickPick } from './repository/log';
import { pickRevisionGraphRepository } from './repository/picker';
import {
  buildMetadataPatchedRevisionGraphViewFingerprint,
  buildEmptyRevisionGraphViewState,
  buildMetadataPatchedRevisionGraphViewState,
  canPreserveRevisionGraphContext,
  buildRevisionGraphViewFingerprint,
  buildReadyRevisionGraphViewStateBundle
} from './panel/state';
import { RevisionGraphRenderCoordinator } from './renderCoordinator';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import {
  createDefaultRevisionGraphProjectionOptions,
  RevisionGraphMessage,
  RevisionGraphViewMetadataPatch,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { REVISION_GRAPH_VIEW_ID } from '../revisionGraphTypes';
import { GRAPH_LIMIT_POLICY } from './panel/shared';
import { renderRevisionGraphShellHtml } from '../revisionGraphWebview';
import { getRevisionGraphViewTitle } from './viewTitle';
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

export class RevisionGraphController implements vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private currentRepository: Repository | undefined;
  private projectionOptions = createDefaultRevisionGraphProjectionOptions();
  private autoArrangeOnNextRender = true;
  private currentLoadingLabel: string | undefined;
  private currentLoadingMode: 'blocking' | 'subtle' | undefined;
  private currentErrorMessage: string | undefined;
  private readonly pendingFollowUpRefreshes = new Map<string, PendingRevisionGraphFollowUpRefresh[]>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly actionServices: ReturnType<typeof createWorkbenchRefActionServices>;
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
      const previousState = this.currentState;
      this.currentState = state;
      if (this.shouldPostMetadataPatch(previousState, state)) {
        this.postHostMessage({
          type: 'patch-metadata',
          patch: this.createMetadataPatch(state)
        });
        return;
      }

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
  private currentState: RevisionGraphViewState;
  private currentSnapshot:
    | {
      readonly repositoryPath: string;
      readonly snapshot: RevisionGraphSnapshot;
    }
    | undefined;
  private latestRefreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';

  constructor(
    private readonly git: API,
    private readonly backend: RevisionGraphBackend,
    compareResultsPresenter: CompareResultsPresenter,
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

    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
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
      view.webview.onDidReceiveMessage(async (message: RevisionGraphMessage) => {
        await this.handleMessage(message);
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
    await vscode.commands.executeCommand(`${REVISION_GRAPH_VIEW_ID}.focus`);
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

    const outcome = await this.renderCoordinator.schedule(
      getRefreshLoadingLabel(request.intent),
      async (requestId, signal) => this.buildNextState(requestId, signal)
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
      case 'refresh':
        await this.refresh('full-rebuild');
        return;
      case 'fetch-current-repository':
        await this.runFetchCurrentRepository();
        return;
      case 'open-source-control':
        await this.actionServices.ui.showSourceControl();
        return;
      case 'choose-repository':
        {
          const pickedRepository = await pickRevisionGraphRepository(this.git, true);
          if (!pickedRepository) {
            return;
          }

          this.setCurrentRepository(pickedRepository);
        }
        await this.refresh('full-rebuild');
        return;
      case 'set-projection-options':
        this.projectionOptions = {
          ...this.projectionOptions,
          ...message.options
        };
        this.autoArrangeOnNextRender = true;
        await this.refresh('projection-rebuild');
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
          const picked = await showRevisionLogQuickPick(
            this.currentRepository,
            message.baseRevision,
            message.compareRevision,
            this.limitPolicy.initialLimit,
            this.backend
          );
          if (picked) {
            await openCommitDetails(this.currentRepository, picked.hash, this.backend);
          }
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
      case 'sync-current-head':
        if (this.currentRepository) {
          await syncCurrentHeadWithUpstream(this.currentRepository, this.actionServices);
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
    requestId: number,
    signal: AbortSignal
  ): Promise<RevisionGraphViewState | undefined> {
    if (!this.view) {
      return undefined;
    }

    if (!this.currentRepository) {
      return buildEmptyRevisionGraphViewState(this.git.repositories.length > 0, this.projectionOptions);
    }

    const currentSnapshot = this.currentSnapshot;
    const canPatchMetadata =
      this.latestRefreshIntent === 'metadata-patch' &&
      this.currentState.viewMode === 'ready' &&
      currentSnapshot?.repositoryPath === this.currentRepository.rootUri.fsPath;

    if (canPatchMetadata) {
      const patchedState = await buildMetadataPatchedRevisionGraphViewState(
        this.currentState,
        this.currentRepository,
        this.backend,
        currentSnapshot.snapshot,
        signal
      );
      if (patchedState) {
        return patchedState;
      }
    }

    const bundle = await buildReadyRevisionGraphViewStateBundle(
      this.currentRepository,
      this.projectionOptions,
      this.autoArrangeOnNextRender,
      this.backend,
      this.limitPolicy,
      signal
    );

    if (requestId === this.renderCoordinator.getCurrentRequestId()) {
      this.autoArrangeOnNextRender = false;
      this.currentSnapshot = {
        repositoryPath: this.currentRepository.rootUri.fsPath,
        snapshot: bundle.snapshot
      };
    }

    return bundle.state;
  }

  private async runFetchCurrentRepository(): Promise<void> {
    if (!this.currentRepository) {
      this.actionServices.ui.showInformationMessage('Choose a repository before fetching from the revision graph.');
      this.postHostMessage({ type: 'update-state', state: this.currentState });
      return;
    }

    try {
      await execGitWithResult(this.currentRepository.rootUri.fsPath, ['fetch', '--prune']);
      this.actionServices.ui.showInformationMessage(`Fetch completed for ${this.getCurrentRepositoryLabel()}.`);
      await this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
    } catch (error) {
      await this.actionServices.ui.showErrorMessage(`Could not fetch the current repository. ${toErrorDetail(error)}`);
      this.postHostMessage({ type: 'update-state', state: this.currentState });
    }
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

      if (await this.isRedundantRepositoryRefresh(repository, intent)) {
        return;
      }

      await this.refresh(this.createCurrentRepositoryRefreshRequest(intent));
    }
  }

  private setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      this.projectionOptions = createDefaultRevisionGraphProjectionOptions();
      this.autoArrangeOnNextRender = true;
      this.currentSnapshot = undefined;
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

  private async isRedundantRepositoryRefresh(
    repository: Repository,
    intent: RevisionGraphRefreshIntent
  ): Promise<boolean> {
    if (
      (intent !== 'full-rebuild' && intent !== 'metadata-patch')
      || this.currentState.viewMode !== 'ready'
      || !isSameRepositoryPath(repository, this.currentRepository)
      || this.currentSnapshot?.repositoryPath !== repository.rootUri.fsPath
    ) {
      return false;
    }

    const fingerprint = await buildMetadataPatchedRevisionGraphViewFingerprint(
      this.currentState,
      repository,
      this.currentSnapshot.snapshot
    );
    if (!fingerprint) {
      return false;
    }

    return fingerprint === buildRevisionGraphViewFingerprint(this.currentState);
  }

  private postHostMessage(message: RevisionGraphViewHostMessage): void {
    void this.view?.webview.postMessage(message);
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

  private shouldPostMetadataPatch(
    previousState: RevisionGraphViewState,
    nextState: RevisionGraphViewState
  ): boolean {
    return canPreserveRevisionGraphContext(previousState, nextState);
  }

  private createMetadataPatch(state: RevisionGraphViewState): RevisionGraphViewMetadataPatch {
    return {
      preserveSelection: true,
      preserveViewport: true,
      currentHeadName: state.currentHeadName,
      currentHeadUpstreamName: state.currentHeadUpstreamName,
      isWorkspaceDirty: state.isWorkspaceDirty,
      projectionOptions: state.projectionOptions,
      mergeBlockedTargets: state.mergeBlockedTargets,
      primaryAncestorPathsByHash: state.primaryAncestorPathsByHash,
      autoArrangeOnInit: state.autoArrangeOnInit,
      scene: state.scene,
      nodeLayouts: state.nodeLayouts,
      references: state.references,
      sceneLayoutKey: state.sceneLayoutKey,
      baseCanvasWidth: state.baseCanvasWidth,
      baseCanvasHeight: state.baseCanvasHeight
    };
  }

  private syncViewTitle(): void {
    if (!this.view) {
      return;
    }

    this.view.title = getRevisionGraphViewTitle(this.currentRepository);
  }
}

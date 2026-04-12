import * as vscode from 'vscode';

import { API, Repository } from '../git';
import { toErrorDetail } from '../errorDetail';
import {
  isSameRepositoryPath,
  reconcileCurrentRepository,
  shouldPromptForGraphRepositoryOnOpen
} from '../repositorySelection';
import {
  createBranchFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  syncCurrentHeadWithUpstream
} from '../refActions';
import { createWorkbenchRefActionServices } from '../workbenchRefActionServices';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from './backend';
import { openCommitDetails, openUnifiedDiffDocument, showRevisionLogQuickPick } from './repository/log';
import { pickRevisionGraphRepository } from './repository/picker';
import {
  buildEmptyRevisionGraphViewState,
  buildMetadataPatchedRevisionGraphViewState,
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
import { RevisionGraphRef } from '../revisionGraphData';
import { REVISION_GRAPH_VIEW_ID } from '../revisionGraphTypes';
import { GRAPH_LIMIT_POLICY } from './panel/shared';
import { renderRevisionGraphShellHtml } from '../revisionGraphWebview';
import {
  consumePendingFollowUpRefresh,
  getRefreshLoadingLabel,
  normalizeRefreshRequest,
  PendingRevisionGraphFollowUpRefresh,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequestLike,
  RevisionGraphRepositoryEventKind,
  registerPendingFollowUpRefresh
} from '../revisionGraphRefresh';

export class RevisionGraphController implements vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private currentRepository: Repository | undefined;
  private projectionOptions = createDefaultRevisionGraphProjectionOptions();
  private autoArrangeOnNextRender = true;
  private readonly pendingFollowUpRefreshes = new Map<string, PendingRevisionGraphFollowUpRefresh>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly actionServices = createWorkbenchRefActionServices((request) => {
    void this.refresh(request);
  });
  private readonly renderCoordinator = new RevisionGraphRenderCoordinator<RevisionGraphViewState>(
    (label) => {
      this.postHostMessage({
        type: 'set-loading',
        label
      });
    },
    (state) => {
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
      this.postHostMessage({
        type: 'set-error',
        message: toErrorDetail(error)
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
    private readonly limitPolicy: RevisionGraphLimitPolicy = GRAPH_LIMIT_POLICY
  ) {
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

    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true
    };
    view.webview.html = renderRevisionGraphShellHtml();

    view.onDidDispose(() => {
      if (this.view === view) {
        this.renderCoordinator.cancel();
        this.view = undefined;
      }
    });

    view.webview.onDidReceiveMessage(async (message: RevisionGraphMessage) => {
      await this.handleMessage(message);
    });

    this.postHostMessage({
      type: 'init-state',
      state: this.currentState
    });

    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    await this.refresh('full-rebuild');
  }

  async open(): Promise<void> {
    const hadResolvedView = !!this.view;
    await vscode.commands.executeCommand(`${REVISION_GRAPH_VIEW_ID}.focus`);
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (shouldPromptForGraphRepositoryOnOpen(this.git.repositories, this.currentRepository, hadResolvedView)) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    await this.refresh('full-rebuild');
  }

  async chooseRepository(): Promise<void> {
    const pickedRepository = await pickRevisionGraphRepository(this.git, true);
    if (!pickedRepository) {
      return;
    }

    this.setCurrentRepository(pickedRepository);
    await this.open();
  }

  async refresh(requestLike: RevisionGraphRefreshRequestLike = 'full-rebuild'): Promise<void> {
    if (!this.view) {
      return;
    }

    const request = normalizeRefreshRequest(requestLike);
    this.latestRefreshIntent = request.intent;
    registerPendingFollowUpRefresh(this.pendingFollowUpRefreshes, request);

    await this.renderCoordinator.schedule(
      getRefreshLoadingLabel(request.intent),
      async (requestId, signal) => this.buildNextState(requestId, signal)
    );
  }

  private async handleMessage(message: RevisionGraphMessage): Promise<void> {
    switch (message.type) {
      case 'refresh':
        await this.refresh('full-rebuild');
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
            { refName: message.baseRefName, label: message.baseRefName },
            { refName: message.compareRefName, label: message.compareRefName },
            this.actionServices
          );
        }
        return;
      case 'show-log':
        if (this.currentRepository) {
          const picked = await showRevisionLogQuickPick(
            this.currentRepository,
            message.baseRefName,
            message.compareRefName,
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
          await openUnifiedDiffDocument(this.currentRepository, message.baseRefName, message.compareRefName, this.backend);
        }
        return;
      case 'compare-with-worktree':
        if (this.currentRepository) {
          await compareResolvedRefWithWorktree(
            this.currentRepository,
            { refName: message.refName, label: message.refName },
            this.actionServices
          );
        }
        return;
      case 'checkout':
        if (this.currentRepository) {
          await checkoutResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RevisionGraphRef['kind'] },
            this.actionServices
          );
        }
        return;
      case 'create-branch':
        if (this.currentRepository) {
          await createBranchFromResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.refName, kind: message.refKind },
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
            { refName: message.refName, label: message.refName, kind: message.refKind },
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
        repository.state.onDidChange(() => this.handleRepositoryStateChange(repository, 'full-rebuild', 'state')),
        repository.onDidCheckout(() => this.handleRepositoryStateChange(repository, 'metadata-patch', 'checkout'))
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private handleRepositorySetChanged(): void {
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    void this.refresh('full-rebuild');
  }

  private handleRepositoryStateChange(
    repository: Repository,
    intent: RevisionGraphRefreshIntent,
    eventKind: RevisionGraphRepositoryEventKind
  ): void {
    const previousRepository = this.currentRepository;
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (isSameRepositoryPath(repository, this.currentRepository) || (!previousRepository && this.currentRepository)) {
      if (consumePendingFollowUpRefresh(this.pendingFollowUpRefreshes, repository.rootUri.toString(), eventKind)) {
        return;
      }

      void this.refresh(intent);
    }
  }

  private setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      this.projectionOptions = createDefaultRevisionGraphProjectionOptions();
      this.autoArrangeOnNextRender = true;
      this.currentSnapshot = undefined;
    }

    this.currentRepository = repository;
  }

  private postHostMessage(message: RevisionGraphViewHostMessage): void {
    void this.view?.webview.postMessage(message);
  }

  private shouldPostMetadataPatch(
    previousState: RevisionGraphViewState,
    nextState: RevisionGraphViewState
  ): boolean {
    return (
      this.latestRefreshIntent === 'metadata-patch' &&
      previousState.viewMode === 'ready' &&
      nextState.viewMode === 'ready' &&
      previousState.sceneLayoutKey === nextState.sceneLayoutKey
    );
  }

  private createMetadataPatch(state: RevisionGraphViewState): RevisionGraphViewMetadataPatch {
    return {
      preserveSelection: true,
      preserveViewport: true,
      currentHeadName: state.currentHeadName,
      currentHeadUpstreamName: state.currentHeadUpstreamName,
      isWorkspaceDirty: state.isWorkspaceDirty,
      mergeBlockedTargets: state.mergeBlockedTargets,
      autoArrangeOnInit: state.autoArrangeOnInit,
      scene: state.scene,
      nodeLayouts: state.nodeLayouts,
      references: state.references,
      sceneLayoutKey: state.sceneLayoutKey,
      baseCanvasWidth: state.baseCanvasWidth,
      baseCanvasHeight: state.baseCanvasHeight
    };
  }
}

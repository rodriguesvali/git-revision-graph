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
  abortCurrentMerge,
  createBranchFromResolvedReference,
  createTagFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteRemoteTagResolvedReference,
  deleteResolvedReference,
  mergeResolvedReference,
  publishLocalBranchResolvedReference,
  pushTagResolvedReference,
  CompareResultsPresenter,
  RefActionKind,
  syncCurrentHeadWithUpstream
} from '../refActions';
import { createWorkbenchRefActionServices } from '../workbenchRefActionServices';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from './backend';
import { openUnifiedDiffDocument } from './repository/log';
import { pickRevisionGraphRepository } from './repository/picker';
import {
  buildMetadataPatchedRevisionGraphViewFingerprint,
  buildEmptyRevisionGraphViewState,
  buildMetadataPatchedRevisionGraphViewState,
  buildReadyRevisionGraphViewStateFromSnapshot,
  canPreserveRevisionGraphContext,
  buildRevisionGraphViewFingerprint,
  buildReadyRevisionGraphViewStateBundle
} from './panel/state';
import { RevisionGraphRenderCoordinator } from './renderCoordinator';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import {
  buildRevisionGraphFetchArgs,
  buildRevisionGraphFetchOptions,
  createRevisionGraphFetchOptionItems,
  formatRevisionGraphFetchSuccessMessage,
  RevisionGraphFetchOption,
  shouldUseGitCliForRevisionGraphFetch
} from './fetchOptions';
import { getRepositoryRemoteNames } from '../refActions/shared';
import {
  createDefaultRevisionGraphProjectionOptions,
  normalizeRevisionGraphProjectionOptionsForScope,
  RevisionGraphViewMetadataPatch,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { REVISION_GRAPH_VIEW_ID } from '../revisionGraphTypes';
import { GRAPH_LIMIT_POLICY } from './panel/shared';
import { renderRevisionGraphShellHtml } from '../revisionGraphWebview';
import { getRevisionGraphViewTitle } from './viewTitle';
import {
  isRevisionGraphMessageAllowedForState,
  validateRevisionGraphMessage
} from './messageValidation';
import { ShowLogPresenter } from '../showLogView';
import { RevisionGraphLoadTraceSink } from './loadTrace';
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
  RevisionGraphSnapshotReloadSemaphore,
  registerPendingFollowUpRefresh,
  shouldReloadSnapshotForProjectionOptionsChange
} from '../revisionGraphRefresh';

const REMOTE_TAG_STATE_MAX_OUTPUT_BYTES = 1024 * 1024;
const REMOTE_TAG_STATE_TIMEOUT_MS = 3000;
const FETCH_WITH_TAGS_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const FETCH_WITH_TAGS_TIMEOUT_MS = 120000;
const MIN_GRAPH_COMMAND_TIMEOUT_MS = 5000;
const MAX_GRAPH_COMMAND_TIMEOUT_MS = 300000;

async function isTagPublishedToAnyRemote(repository: Repository, tagName: string): Promise<boolean> {
  const remoteNames = await getRepositoryRemoteNames(repository);
  for (const remoteName of remoteNames) {
    if (await remoteHasTag(repository, remoteName, tagName)) {
      return true;
    }
  }

  return false;
}

async function remoteHasTag(repository: Repository, remoteName: string, tagName: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_TAG_STATE_TIMEOUT_MS);
  try {
    const { stdout } = await execGitWithResult(
      repository.rootUri.fsPath,
      ['ls-remote', '--tags', '--refs', remoteName, `refs/tags/${tagName}`],
      {
        maxOutputBytes: REMOTE_TAG_STATE_MAX_OUTPUT_BYTES,
        signal: controller.signal
      }
    );
    return parseRemoteTagNames(stdout).has(tagName);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRemoteTagNames(stdout: string): Set<string> {
  const names = new Set<string>();
  for (const line of stdout.split(/\r?\n/)) {
    const [, refName] = line.trim().split(/\s+/);
    if (refName?.startsWith('refs/tags/')) {
      names.add(refName.slice('refs/tags/'.length));
    }
  }

  return names;
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
  private view: vscode.WebviewView | undefined;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private currentRepository: Repository | undefined;
  private projectionOptions = createDefaultRevisionGraphProjectionOptions();
  private autoArrangeOnNextRender = true;
  private currentLoadingLabel: string | undefined;
  private currentLoadingMode: 'blocking' | 'subtle' | undefined;
  private currentErrorMessage: string | undefined;
  private readonly pendingFollowUpRefreshes = new Map<string, PendingRevisionGraphFollowUpRefresh[]>();
  private readonly snapshotReloadSemaphore = new RevisionGraphSnapshotReloadSemaphore();
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
  private traceOutput: vscode.OutputChannel | undefined;

  constructor(
    private readonly git: API,
    private readonly backend: RevisionGraphBackend,
    compareResultsPresenter: CompareResultsPresenter,
    private readonly showLogPresenter: ShowLogPresenter,
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
    this.traceOutput?.dispose();

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
      view.webview.onDidReceiveMessage(async (message: unknown) => {
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
    if (request.intent === 'full-rebuild') {
      this.snapshotReloadSemaphore.markReloadRequired();
    }

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

  private async handleMessage(rawMessage: unknown): Promise<void> {
    const message = validateRevisionGraphMessage(rawMessage);
    if (!message || !isRevisionGraphMessageAllowedForState(message, this.currentState)) {
      return;
    }

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
          if (shouldReloadSnapshotForProjectionOptionsChange(this.projectionOptions, nextProjectionOptions)) {
            this.currentSnapshot = undefined;
            this.snapshotReloadSemaphore.markReloadRequired();
          }
          this.projectionOptions = nextProjectionOptions;
        }
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
        this.postHostMessage({
          type: 'set-remote-tag-state',
          tagName: message.refName,
          isPublished: this.currentRepository
            ? await isTagPublishedToAnyRemote(this.currentRepository, message.refName)
            : false
        });
        return;
      case 'push-tag':
        if (this.currentRepository) {
          const pushed = await pushTagResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
          if (pushed) {
            this.postHostMessage({ type: 'set-remote-tag-state', tagName: message.refName, isPublished: true });
          }
        }
        return;
      case 'delete-remote-tag':
        if (this.currentRepository) {
          const deleted = await deleteRemoteTagResolvedReference(
            this.currentRepository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.actionServices
          );
          if (deleted) {
            this.postHostMessage({ type: 'set-remote-tag-state', tagName: message.refName, isPublished: false });
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

    const repositoryPath = this.currentRepository.rootUri.fsPath;
    const trace = this.createLoadTraceSink(repositoryPath, this.latestRefreshIntent, requestId);
    const currentSnapshot = this.currentSnapshot;
    const canReuseCurrentSnapshot =
      currentSnapshot?.repositoryPath === repositoryPath
      && this.snapshotReloadSemaphore.canReuseSnapshot(repositoryPath);
    const canPatchMetadata =
      this.latestRefreshIntent === 'metadata-patch' &&
      this.currentState.viewMode === 'ready' &&
      canReuseCurrentSnapshot;

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

    if (this.latestRefreshIntent === 'projection-rebuild' && canReuseCurrentSnapshot) {
      const state = await buildReadyRevisionGraphViewStateFromSnapshot(
        this.currentRepository,
        this.projectionOptions,
        this.autoArrangeOnNextRender,
        this.backend,
        currentSnapshot.snapshot,
        signal,
        trace
      );
      if (requestId === this.renderCoordinator.getCurrentRequestId()) {
        this.autoArrangeOnNextRender = false;
      }

      return state;
    }

    this.snapshotReloadSemaphore.markReloadRequired();
    const bundle = await buildReadyRevisionGraphViewStateBundle(
      this.currentRepository,
      this.projectionOptions,
      this.autoArrangeOnNextRender,
      this.backend,
      this.resolveLimitPolicy(),
      signal,
      trace
    );

    if (requestId === this.renderCoordinator.getCurrentRequestId()) {
      this.autoArrangeOnNextRender = false;
      this.currentSnapshot = {
        repositoryPath,
        snapshot: bundle.snapshot
      };
      this.snapshotReloadSemaphore.markReloadComplete(repositoryPath);
    }

    return bundle.state;
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
    if (!this.currentRepository) {
      this.actionServices.ui.showInformationMessage('Choose a repository before fetching from the revision graph.');
      this.postHostMessage({ type: 'update-state', state: this.currentState });
      return;
    }

    const selectedOptions = await this.pickFetchOptions();
    if (!selectedOptions) {
      this.postHostMessage({ type: 'update-state', state: this.currentState });
      return;
    }

    try {
      if (shouldUseGitCliForRevisionGraphFetch(selectedOptions)) {
        await execGitWithResult(
          this.currentRepository.rootUri.fsPath,
          buildRevisionGraphFetchArgs(selectedOptions),
          {
            maxOutputBytes: FETCH_WITH_TAGS_MAX_OUTPUT_BYTES,
            timeoutMs: FETCH_WITH_TAGS_TIMEOUT_MS
          }
        );
      } else {
        await this.currentRepository.fetch(buildRevisionGraphFetchOptions(selectedOptions));
      }
      this.actionServices.ui.showInformationMessage(
        formatRevisionGraphFetchSuccessMessage(this.getCurrentRepositoryLabel(), selectedOptions)
      );
      await this.refresh(this.createCurrentRepositoryRefreshRequest('full-rebuild'));
    } catch (error) {
      await this.actionServices.ui.showErrorMessage(`Could not fetch the current repository. ${toErrorDetail(error)}`);
      this.postHostMessage({ type: 'update-state', state: this.currentState });
    }
  }

  private async pickFetchOptions(): Promise<RevisionGraphFetchOption[] | undefined> {
    const pickedOptions = await vscode.window.showQuickPick(createRevisionGraphFetchOptionItems(), {
      canPickMany: true,
      title: 'Fetch Options',
      placeHolder: 'Choose optional flags for the current repository fetch',
      ignoreFocusOut: true
    });

    return pickedOptions?.map((option) => option.id);
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
          void this.handleRepositoryStateChange(repository, 'metadata-patch', 'state');
        }),
        repository.onDidCheckout(() => {
          void this.handleRepositoryStateChange(repository, 'metadata-patch', 'checkout');
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
      this.snapshotReloadSemaphore.markReloadRequired();
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
      || this.snapshotReloadSemaphore.requiresReload(repository.rootUri.fsPath)
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
      publishedLocalBranchNames: state.publishedLocalBranchNames,
      isWorkspaceDirty: state.isWorkspaceDirty,
      hasMergeConflicts: state.hasMergeConflicts,
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

  private createLoadTraceSink(
    repositoryPath: string,
    intent: RevisionGraphRefreshIntent,
    requestId: number
  ): RevisionGraphLoadTraceSink | undefined {
    if (!vscode.workspace.getConfiguration('gitRevisionGraph').get<boolean>('traceLoading', false)) {
      return undefined;
    }

    const output = this.getTraceOutput();
    const repositoryLabel = vscode.workspace.asRelativePath(repositoryPath, false) || repositoryPath;
    output.appendLine(`[revision-graph-load] request=${requestId} intent=${intent} repository=${repositoryLabel}`);

    return (event) => {
      const detail = event.detail ? ` ${event.detail}` : '';
      output.appendLine(
        `[revision-graph-load] request=${requestId} phase=${event.phase} duration=${event.durationMs}ms${detail}`
      );
    };
  }

  private getTraceOutput(): vscode.OutputChannel {
    if (!this.traceOutput) {
      this.traceOutput = vscode.window.createOutputChannel('Git Revision Graph');
    }

    return this.traceOutput;
  }
}

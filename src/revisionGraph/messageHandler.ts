import { Repository } from '../git';
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
  RefActionKind,
  RefActionServices,
  resetCurrentBranchWorkspace,
  syncCurrentHeadWithUpstream
} from '../refActions';
import {
  normalizeRevisionGraphProjectionOptionsForScope,
  RemoteTagPublicationState,
  RevisionGraphMessage,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { ShowLogPresenter } from '../showLogView';
import { RevisionGraphRefreshRequestLike } from '../revisionGraphRefresh';
import {
  RemoteTagPublicationRequestContext,
  resolveRemoteTagPublicationState
} from './remoteTagState';
import { getRepositoryRemoteNames } from '../refActions/shared';

export interface RevisionGraphMessageHandlerHost {
  readonly actionServices: RefActionServices;
  readonly showLogPresenter: ShowLogPresenter;
  rehydrateWebview(): void;
  writeClipboard(text: string): PromiseLike<void>;
  pickRepository(): Promise<Repository | undefined>;
  openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void>;
  getCurrentRepository(): Repository | undefined;
  setCurrentRepository(repository: Repository | undefined): void;
  getCurrentState(): RevisionGraphViewState;
  getProjectionOptions(): RevisionGraphViewState['projectionOptions'];
  setProjectionOptions(options: RevisionGraphViewState['projectionOptions']): void;
  refresh(request?: RevisionGraphRefreshRequestLike): Promise<void>;
  runFetchCurrentRepository(): Promise<void>;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
  postCurrentState(): void;
  traceWebviewLoadEvent(
    phase: string,
    durationMs: number,
    detail: string | undefined,
    requestId: number | undefined
  ): void;
  createRemoteTagPublicationRequestContext(repository: Repository): RemoteTagPublicationRequestContext;
  postRemoteTagStateIfCurrent(
    requestContext: RemoteTagPublicationRequestContext,
    tagName: string,
    state: RemoteTagPublicationState
  ): void;
}

export class RevisionGraphMessageHandler {
  constructor(private readonly host: RevisionGraphMessageHandlerHost) {}

  async handleMessage(message: RevisionGraphMessage): Promise<void> {
    switch (message.type) {
      case 'webview-ready':
        this.host.rehydrateWebview();
        return;
      case 'load-trace':
        this.host.traceWebviewLoadEvent(message.phase, message.durationMs, message.detail, message.requestId);
        return;
      case 'refresh':
        await this.host.refresh('full-rebuild');
        return;
      case 'fetch-current-repository':
        await this.host.runFetchCurrentRepository();
        return;
      case 'abort-merge':
        if (this.host.getCurrentRepository()) {
          await abortCurrentMerge(this.host.getCurrentRepository() as Repository, this.host.actionServices);
        }
        return;
      case 'choose-repository':
        {
          const pickedRepository = await this.host.pickRepository();
          if (!pickedRepository) {
            this.host.postHostMessage({ type: 'update-state', state: this.host.getCurrentState() });
            return;
          }

          this.host.setCurrentRepository(pickedRepository);
        }
        await this.host.refresh('full-rebuild');
        return;
      case 'set-projection-options':
        {
          const nextProjectionOptions = normalizeRevisionGraphProjectionOptionsForScope({
            ...this.host.getProjectionOptions(),
            ...message.options
          });
          this.host.setProjectionOptions(nextProjectionOptions);
        }
        await this.host.refresh('full-rebuild');
        return;
      case 'compare-selected':
        if (this.host.getCurrentRepository()) {
          await compareResolvedRefs(
            this.host.getCurrentRepository() as Repository,
            { refName: message.baseRevision, label: message.baseLabel },
            { refName: message.compareRevision, label: message.compareLabel },
            this.host.actionServices
          );
        }
        return;
      case 'show-log':
        if (this.host.getCurrentRepository()) {
          await this.host.showLogPresenter.showSource(this.host.getCurrentRepository() as Repository, message.source);
        }
        return;
      case 'open-unified-diff':
        if (this.host.getCurrentRepository()) {
          await this.host.openUnifiedDiff(
            this.host.getCurrentRepository() as Repository,
            message.baseRevision,
            message.compareRevision
          );
        }
        return;
      case 'compare-with-worktree':
        if (this.host.getCurrentRepository()) {
          await compareResolvedRefWithWorktree(
            this.host.getCurrentRepository() as Repository,
            { refName: message.revision, label: message.label },
            this.host.actionServices
          );
        }
        return;
      case 'copy-commit-hash':
        await this.host.writeClipboard(message.commitHash);
        this.host.actionServices.ui.showInformationMessage(`Copied commit ${message.commitHash.slice(0, 8)}.`);
        return;
      case 'copy-ref-name':
        await this.host.writeClipboard(message.refName);
        this.host.actionServices.ui.showInformationMessage(`Copied ref ${message.refName}.`);
        return;
      case 'checkout':
        if (this.host.getCurrentRepository()) {
          await checkoutResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.host.actionServices
          );
        }
        return;
      case 'create-branch':
        if (this.host.getCurrentRepository()) {
          await createBranchFromResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          );
        }
        return;
      case 'create-tag':
        if (this.host.getCurrentRepository()) {
          await createTagFromResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          );
        }
        return;
      case 'resolve-remote-tag-state':
        await this.resolveRemoteTagState(message.refName);
        return;
      case 'push-tag':
        await this.pushTag(message.refName, message.label, message.refKind as RefActionKind);
        return;
      case 'delete-remote-tag':
        await this.deleteRemoteTag(message.refName, message.label, message.refKind as RefActionKind);
        return;
      case 'publish-branch':
        if (this.host.getCurrentRepository()) {
          await publishLocalBranchResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          );
        }
        return;
      case 'sync-current-head':
        await this.runCurrentHeadAction((repository) => syncCurrentHeadWithUpstream(repository, this.host.actionServices));
        return;
      case 'pull-current-head':
        await this.runCurrentHeadAction((repository) => pullCurrentBranchFromUpstream(repository, this.host.actionServices));
        return;
      case 'push-current-head':
        await this.runCurrentHeadAction((repository) => pushCurrentBranchToUpstream(repository, this.host.actionServices));
        return;
      case 'reset-current-workspace':
        if (this.host.getCurrentRepository()) {
          await resetCurrentBranchWorkspace(
            this.host.getCurrentRepository() as Repository,
            message.includeUntracked,
            this.host.actionServices
          );
        }
        return;
      case 'delete':
        if (this.host.getCurrentRepository()) {
          await deleteResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.host.actionServices
          );
        }
        return;
      case 'merge':
        if (this.host.getCurrentRepository()) {
          await mergeResolvedReference(
            this.host.getCurrentRepository() as Repository,
            { refName: message.refName, label: message.refName },
            this.host.actionServices
          );
        }
        return;
    }
  }

  private async runCurrentHeadAction(action: (repository: Repository) => Promise<boolean>): Promise<void> {
    const didScheduleRefresh = this.host.getCurrentRepository()
      ? await action(this.host.getCurrentRepository() as Repository)
      : false;
    if (!didScheduleRefresh) {
      this.host.postCurrentState();
    }
  }

  private async resolveRemoteTagState(refName: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const state = await resolveTagPublicationStateForRepository(repository, refName);
    this.host.postRemoteTagStateIfCurrent(requestContext, refName, state);
  }

  private async pushTag(
    refName: string,
    label: string,
    refKind: RefActionKind
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const pushed = await pushTagResolvedReference(
      repository,
      { refName, label, kind: refKind },
      this.host.actionServices
    );
    if (pushed) {
      this.host.postRemoteTagStateIfCurrent(requestContext, refName, 'published');
    }
  }

  private async deleteRemoteTag(
    refName: string,
    label: string,
    refKind: RefActionKind
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const deleted = await deleteRemoteTagResolvedReference(
      repository,
      { refName, label, kind: refKind },
      this.host.actionServices
    );
    if (deleted) {
      this.host.postRemoteTagStateIfCurrent(requestContext, refName, 'unpublished');
    }
  }
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

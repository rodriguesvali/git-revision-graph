import { Repository } from '../git';
import {
  abortCurrentMerge,
  createBranchFromResolvedReference,
  createTagFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  publishLocalBranchResolvedReference,
  RefActionKind,
  resetCurrentBranchWorkspace,
} from '../refActions';
import {
  normalizeRevisionGraphProjectionOptionsForScope,
  RevisionGraphMessage,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { ShowLogPresenter } from '../showLogView';
import { RevisionGraphRefreshRequestLike } from '../revisionGraphRefresh';
import {
  RevisionGraphRemoteTagWorkflow,
  RevisionGraphRemoteTagWorkflowHost
} from './remoteTagWorkflow';
import {
  RevisionGraphCurrentHeadWorkflow,
  RevisionGraphCurrentHeadWorkflowHost
} from './currentHeadWorkflow';

export interface RevisionGraphMessageHandlerHost
  extends RevisionGraphRemoteTagWorkflowHost, RevisionGraphCurrentHeadWorkflowHost {
  readonly showLogPresenter: ShowLogPresenter;
  rehydrateWebview(): void;
  writeClipboard(text: string): PromiseLike<void>;
  pickRepository(): Promise<Repository | undefined>;
  openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void>;
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
}

export class RevisionGraphMessageHandler {
  private readonly currentHeadWorkflow: RevisionGraphCurrentHeadWorkflow;
  private readonly remoteTagWorkflow: RevisionGraphRemoteTagWorkflow;

  constructor(private readonly host: RevisionGraphMessageHandlerHost) {
    this.currentHeadWorkflow = new RevisionGraphCurrentHeadWorkflow(host);
    this.remoteTagWorkflow = new RevisionGraphRemoteTagWorkflow(host);
  }

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
        await this.runWithCurrentRepository((repository) =>
          abortCurrentMerge(repository, this.host.actionServices)
        );
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
        await this.runWithCurrentRepository((repository) =>
          compareResolvedRefs(
            repository,
            { refName: message.baseRevision, label: message.baseLabel },
            { refName: message.compareRevision, label: message.compareLabel },
            this.host.actionServices
          )
        );
        return;
      case 'show-log':
        await this.runWithCurrentRepository((repository) =>
          this.host.showLogPresenter.showSource(repository, message.source)
        );
        return;
      case 'open-unified-diff':
        await this.runWithCurrentRepository((repository) =>
          this.host.openUnifiedDiff(repository, message.baseRevision, message.compareRevision)
        );
        return;
      case 'compare-with-worktree':
        await this.runWithCurrentRepository((repository) =>
          compareResolvedRefWithWorktree(
            repository,
            { refName: message.revision, label: message.label },
            this.host.actionServices
          )
        );
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
        await this.runWithCurrentRepository((repository) =>
          checkoutResolvedReference(
            repository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.host.actionServices
          )
        );
        return;
      case 'create-branch':
        await this.runWithCurrentRepository((repository) =>
          createBranchFromResolvedReference(
            repository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          )
        );
        return;
      case 'create-tag':
        await this.runWithCurrentRepository((repository) =>
          createTagFromResolvedReference(
            repository,
            { refName: message.revision, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          )
        );
        return;
      case 'resolve-remote-tag-state':
        await this.remoteTagWorkflow.resolveRemoteTagState(message.refName);
        return;
      case 'push-tag':
        await this.remoteTagWorkflow.pushTag(message.refName, message.label, message.refKind as RefActionKind);
        return;
      case 'delete-remote-tag':
        await this.remoteTagWorkflow.deleteRemoteTag(message.refName, message.label, message.refKind as RefActionKind);
        return;
      case 'publish-branch':
        await this.runWithCurrentRepository((repository) =>
          publishLocalBranchResolvedReference(
            repository,
            { refName: message.refName, label: message.label, kind: message.refKind as RefActionKind },
            this.host.actionServices
          )
        );
        return;
      case 'sync-current-head':
        await this.currentHeadWorkflow.syncCurrentHead();
        return;
      case 'pull-current-head':
        await this.currentHeadWorkflow.pullCurrentHead();
        return;
      case 'push-current-head':
        await this.currentHeadWorkflow.pushCurrentHead();
        return;
      case 'reset-current-workspace':
        await this.runWithCurrentRepository((repository) =>
          resetCurrentBranchWorkspace(
            repository,
            message.includeUntracked,
            this.host.actionServices
          )
        );
        return;
      case 'delete':
        await this.runWithCurrentRepository((repository) =>
          deleteResolvedReference(
            repository,
            { refName: message.refName, label: message.refName, kind: message.refKind as RefActionKind },
            this.host.actionServices
          )
        );
        return;
      case 'merge':
        await this.runWithCurrentRepository((repository) =>
          mergeResolvedReference(
            repository,
            { refName: message.refName, label: message.refName },
            this.host.actionServices
          )
        );
        return;
    }
  }

  private async runWithCurrentRepository(
    action: (repository: Repository) => Promise<unknown> | unknown
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    await action(repository);
  }

}

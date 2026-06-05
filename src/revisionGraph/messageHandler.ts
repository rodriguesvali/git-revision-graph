import { Repository } from '../git';
import { RefActionKind } from '../refActions';
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
import {
  RevisionGraphRefActionWorkflow,
  RevisionGraphRefActionWorkflowHost
} from './refActionWorkflow';

export interface RevisionGraphMessageHandlerHost
  extends RevisionGraphRemoteTagWorkflowHost,
    RevisionGraphCurrentHeadWorkflowHost,
    RevisionGraphRefActionWorkflowHost {
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
  private readonly refActionWorkflow: RevisionGraphRefActionWorkflow;
  private readonly remoteTagWorkflow: RevisionGraphRemoteTagWorkflow;

  constructor(private readonly host: RevisionGraphMessageHandlerHost) {
    this.currentHeadWorkflow = new RevisionGraphCurrentHeadWorkflow(host);
    this.refActionWorkflow = new RevisionGraphRefActionWorkflow(host);
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
        await this.refActionWorkflow.abortMerge();
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
        await this.refActionWorkflow.compareSelected(
          message.baseRevision,
          message.baseLabel,
          message.compareRevision,
          message.compareLabel
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
        await this.refActionWorkflow.compareWithWorktree(message.revision, message.label);
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
        await this.refActionWorkflow.checkout(message.refName, message.refKind as RefActionKind);
        return;
      case 'create-branch':
        await this.refActionWorkflow.createBranch(
          message.revision,
          message.label,
          message.refKind as RefActionKind
        );
        return;
      case 'create-tag':
        await this.refActionWorkflow.createTag(
          message.revision,
          message.label,
          message.refKind as RefActionKind
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
        await this.refActionWorkflow.publishBranch(
          message.refName,
          message.label,
          message.refKind as RefActionKind
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
        await this.refActionWorkflow.resetCurrentWorkspace(message.includeUntracked);
        return;
      case 'delete':
        await this.refActionWorkflow.deleteReference(message.refName, message.refKind as RefActionKind);
        return;
      case 'merge':
        await this.refActionWorkflow.merge(message.refName);
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

import { Repository } from '../git';
import { RefActionKind } from '../refActions';
import { RevisionGraphMessage } from '../revisionGraphTypes';
import type { FlowGovernanceOptionsUpdate } from './flow';
import { formatShortCommitHash } from '../commitHash';
import { ShowLogPresenter } from '../showLogView';
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
import {
  RevisionGraphViewStateWorkflow,
  RevisionGraphViewStateWorkflowHost
} from './viewStateWorkflow';

export interface RevisionGraphMessageHandlerHost
  extends RevisionGraphRemoteTagWorkflowHost,
    RevisionGraphCurrentHeadWorkflowHost,
    RevisionGraphRefActionWorkflowHost,
    RevisionGraphViewStateWorkflowHost {
  readonly showLogPresenter: ShowLogPresenter;
  rehydrateWebview(): void;
  writeClipboard(text: string): PromiseLike<void>;
  openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void>;
  runFetchCurrentRepository(): Promise<void>;
  postCurrentState(): void;
  updateFlowGovernanceOptions(options: FlowGovernanceOptionsUpdate): void;
  validateFlowReleasePromotion(refName: string): Promise<void>;
  startFlowRelease(sourceRefName: string, name: string, description: string | undefined): Promise<void>;
  prepareFlowEqualization(releaseRefName: string, productionRefName: string): Promise<void>;
  copyFlowPullRequestContext(sourceRefName: string, targetRefName: string): Promise<void>;
  openFlowPullRequestUrl(sourceRefName: string, targetRefName: string): Promise<void>;
  clearLayoutCache(): PromiseLike<void> | void;
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
  private readonly viewStateWorkflow: RevisionGraphViewStateWorkflow;

  constructor(private readonly host: RevisionGraphMessageHandlerHost) {
    this.currentHeadWorkflow = new RevisionGraphCurrentHeadWorkflow(host);
    this.refActionWorkflow = new RevisionGraphRefActionWorkflow(host);
    this.remoteTagWorkflow = new RevisionGraphRemoteTagWorkflow(host);
    this.viewStateWorkflow = new RevisionGraphViewStateWorkflow(host);
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
      case 'refresh-with-empty-cache':
        await this.host.clearLayoutCache();
        await this.host.refresh({ intent: 'full-rebuild', clearSnapshotCache: true });
        return;
      case 'fetch-current-repository':
        await this.host.runFetchCurrentRepository();
        return;
      case 'abort-merge':
        await this.refActionWorkflow.abortMerge();
        return;
      case 'choose-repository':
        await this.viewStateWorkflow.chooseRepository();
        return;
      case 'set-projection-options':
        await this.viewStateWorkflow.setProjectionOptions(message.options);
        return;
      case 'set-flow-governance-options':
        this.host.updateFlowGovernanceOptions(message.options);
        return;
      case 'validate-release-promotion':
        await this.host.validateFlowReleasePromotion(message.refName);
        return;
      case 'start-flow-release':
        await this.host.startFlowRelease(message.sourceRefName, message.name, message.description);
        return;
      case 'prepare-flow-equalization':
        await this.host.prepareFlowEqualization(message.releaseRefName, message.productionRefName);
        return;
      case 'copy-flow-pr-context':
        await this.host.copyFlowPullRequestContext(message.sourceRefName, message.targetRefName);
        return;
      case 'open-flow-pr-url':
        await this.host.openFlowPullRequestUrl(message.sourceRefName, message.targetRefName);
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
        this.host.actionServices.ui.showInformationMessage(`Copied commit ${formatShortCommitHash(message.commitHash)}.`);
        return;
      case 'copy-ref-name':
        await this.host.writeClipboard(message.refName);
        this.host.actionServices.ui.showInformationMessage(`Copied ref ${message.refName}.`);
        return;
      case 'checkout':
        await this.refActionWorkflow.checkout(message.refName, message.refKind as RefActionKind);
        return;
      case 'reset-to-commit':
        await this.refActionWorkflow.resetToCommit(message.commitHash, message.label);
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
        await this.currentHeadWorkflow.pushCurrentHead(message.mode);
        return;
      case 'stash-save':
        if (!await this.refActionWorkflow.stashSave()) {
          this.host.postCurrentState();
        }
        return;
      case 'stash-apply':
        if (!await this.refActionWorkflow.stashApply(message.refName)) {
          this.host.postCurrentState();
        }
        return;
      case 'stash-pop':
        if (!await this.refActionWorkflow.stashPop(message.refName)) {
          this.host.postCurrentState();
        }
        return;
      case 'stash-drop':
        if (!await this.refActionWorkflow.stashDrop(message.refName)) {
          this.host.postCurrentState();
        }
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

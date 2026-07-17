import { Repository } from '../git';
import { isAbortError } from '../errors';
import { RevisionGraphCommitShortStat, RevisionGraphMessage } from '../revisionGraphTypes';
import type { FlowGovernanceOptionsUpdate } from './flow';
import type { FlowAiTextImprovementInput } from './flow/aiTextAssistant';
import { formatShortCommitHash } from '../commitHash';
import { createRevisionGraphCommitShortStatMessage } from './hostMessages';
import { ShowLogPresenter } from '../showLogView';
import { RevisionGraphRemoteTagWorkflow, RevisionGraphRemoteTagWorkflowHost } from './remoteTagWorkflow';
import { RevisionGraphCurrentHeadWorkflow, RevisionGraphCurrentHeadWorkflowHost } from './currentHeadWorkflow';
import { RevisionGraphRefActionWorkflow, RevisionGraphRefActionWorkflowHost } from './refActionWorkflow';
import { RevisionGraphViewStateWorkflow, RevisionGraphViewStateWorkflowHost } from './viewStateWorkflow';

type RevisionGraphMessageHandlerMap = {
  readonly [Type in RevisionGraphProtocol.MessageType]: (
    message: RevisionGraphProtocol.MessageOf<Type>
  ) => Promise<void>;
};

export interface RevisionGraphMessageHandlerHost
  extends RevisionGraphRemoteTagWorkflowHost,
    RevisionGraphCurrentHeadWorkflowHost,
    RevisionGraphRefActionWorkflowHost,
    RevisionGraphViewStateWorkflowHost {
  readonly showLogPresenter: ShowLogPresenter;
  rehydrateWebview(): void;
  writeClipboard(text: string): PromiseLike<void>;
  openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void>;
  loadCommitShortStat(
    repository: Repository,
    commitHash: string
  ): Promise<RevisionGraphCommitShortStat | undefined>;
  openCommitOnRemote(repository: Repository, commitHash: string): Promise<void>;
  runFetchCurrentRepository(): Promise<void>;
  postCurrentState(): void;
  updateFlowGovernanceOptions(options: FlowGovernanceOptionsUpdate): Promise<void>;
  prepareFlowBranchStart(
    branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix',
    sourceRefName: string
  ): Promise<void>;
  startFlowBranch(
    branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix',
    sourceRefName: string,
    name: string,
    description: string
  ): Promise<void>;
  prepareFlowEqualization(targetRefName: string, originRefName: string, description: string): Promise<void>;
  copyFlowPullRequestContext(sourceRefName: string, targetRefName: string): Promise<void>;
  copyFlowPullRequestContextField(
    sourceRefName: string,
    targetRefName: string,
    field: 'title' | 'description',
    text: string
  ): Promise<void>;
  openFlowPullRequestUrl(
    sourceRefName: string,
    targetRefName: string,
    title: string,
    description: string
  ): Promise<void>;
  improveFlowText(requestId: number, input: FlowAiTextImprovementInput): Promise<void>;
  cancelFlowAiText(
    requestId: number,
    surface: 'pull-request' | 'release',
    field: 'title' | 'description'
  ): void;
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
  private readonly handlers: RevisionGraphMessageHandlerMap;

  constructor(private readonly host: RevisionGraphMessageHandlerHost) {
    this.currentHeadWorkflow = new RevisionGraphCurrentHeadWorkflow(host);
    this.refActionWorkflow = new RevisionGraphRefActionWorkflow(host);
    this.remoteTagWorkflow = new RevisionGraphRemoteTagWorkflow(host);
    this.viewStateWorkflow = new RevisionGraphViewStateWorkflow(host);
    this.handlers = this.createHandlers();
  }

  async handleMessage(message: RevisionGraphMessage): Promise<void> {
    await dispatchRevisionGraphMessage(this.handlers, message);
  }

  private createHandlers(): RevisionGraphMessageHandlerMap {
    return {
      'webview-ready': async () => {
        this.host.rehydrateWebview();
      },
      'load-trace': async (message) => {
        this.host.traceWebviewLoadEvent(message.phase, message.durationMs, message.detail, message.requestId);
      },
      refresh: async () => {
        await this.host.refresh('full-rebuild');
      },
      'refresh-with-empty-cache': async () => {
        await this.host.clearLayoutCache();
        await this.host.refresh({ intent: 'full-rebuild', clearSnapshotCache: true });
      },
      'fetch-current-repository': async () => {
        await this.host.runFetchCurrentRepository();
      },
      'choose-repository': async () => {
        await this.viewStateWorkflow.chooseRepository();
      },
      'abort-merge': async () => {
        await this.refActionWorkflow.abortMerge();
      },
      'set-projection-options': async (message) => {
        await this.viewStateWorkflow.setProjectionOptions(message.options);
      },
      'set-flow-governance-options': async (message) => {
        await this.host.updateFlowGovernanceOptions(message.options);
      },
      'start-flow-branch': async (message) => {
        await handleFlowBranchStartMessage(this.host, message);
      },
      'prepare-flow-equalization': async (message) => {
        await this.host.prepareFlowEqualization(
          message.targetRefName,
          message.originRefName,
          message.description
        );
      },
      'copy-flow-pr-context': async (message) => {
        await this.host.copyFlowPullRequestContext(message.sourceRefName, message.targetRefName);
      },
      'copy-flow-pr-context-field': async (message) => {
        await this.host.copyFlowPullRequestContextField(
          message.sourceRefName,
          message.targetRefName,
          message.field,
          message.text
        );
      },
      'open-flow-pr-url': async (message) => {
        await this.host.openFlowPullRequestUrl(
          message.sourceRefName,
          message.targetRefName,
          message.title,
          message.description
        );
      },
      'improve-flow-pr-text': async (message) => {
        await this.host.improveFlowText(message.requestId, {
          surface: 'pull-request',
          field: message.field,
          sourceRefName: message.sourceRefName,
          targetRefName: message.targetRefName,
          title: message.title,
          description: message.description
        });
      },
      'improve-flow-release-text': async (message) => {
        await this.host.improveFlowText(message.requestId, {
          surface: 'release',
          field: 'description',
          sourceRefName: message.sourceRefName,
          releaseName: message.releaseName,
          text: message.text
        });
      },
      'cancel-flow-ai-text': async (message) => {
        this.host.cancelFlowAiText(message.requestId, message.surface, message.field);
      },
      'compare-selected': async (message) => {
        await this.refActionWorkflow.compareSelected(
          message.baseRevision,
          message.baseLabel,
          message.compareRevision,
          message.compareLabel
        );
      },
      'show-log': async (message) => {
        await this.runWithCurrentRepository((repository) =>
          this.host.showLogPresenter.showSource(repository, message.source)
        );
      },
      'open-unified-diff': async (message) => {
        await this.runWithCurrentRepository((repository) =>
          this.host.openUnifiedDiff(repository, message.baseRevision, message.compareRevision)
        );
      },
      'compare-with-worktree': async (message) => {
        await this.refActionWorkflow.compareWithWorktree(message.revision, message.label);
      },
      'copy-commit-hash': async (message) => {
        await this.host.writeClipboard(message.commitHash);
        this.host.actionServices.ui.showInformationMessage(
          `Copied commit ${formatShortCommitHash(message.commitHash)}.`
        );
      },
      'load-commit-short-stat': async (message) => {
        await this.loadCommitShortStat(message.commitHash);
      },
      'open-commit-on-remote': async (message) => {
        await this.runWithCurrentRepository((repository) =>
          this.host.openCommitOnRemote(repository, message.commitHash)
        );
      },
      'copy-ref-name': async (message) => {
        await this.host.writeClipboard(message.refName);
        this.host.actionServices.ui.showInformationMessage(`Copied ref ${message.refName}.`);
      },
      checkout: async (message) => {
        await this.refActionWorkflow.checkout(message.refName, message.refKind);
      },
      'reset-to-commit': async (message) => {
        await this.refActionWorkflow.resetToCommit(message.commitHash, message.label);
      },
      'create-branch': async (message) => {
        await this.refActionWorkflow.createBranch(message.revision, message.label, message.refKind);
      },
      'create-tag': async (message) => {
        await this.refActionWorkflow.createTag(message.revision, message.label, message.refKind);
      },
      'resolve-remote-tag-state': async (message) => {
        await this.remoteTagWorkflow.resolveRemoteTagState(message.refName);
      },
      'push-tag': async (message) => {
        await this.remoteTagWorkflow.pushTag(message.refName, message.label, message.refKind);
      },
      'delete-remote-tag': async (message) => {
        await this.remoteTagWorkflow.deleteRemoteTag(message.refName, message.label, message.refKind);
      },
      'publish-branch': async (message) => {
        await this.refActionWorkflow.publishBranch(message.refName, message.label, message.refKind);
      },
      'sync-current-head': async () => {
        await this.currentHeadWorkflow.syncCurrentHead();
      },
      'pull-current-head': async () => {
        await this.currentHeadWorkflow.pullCurrentHead();
      },
      'push-current-head': async (message) => {
        await this.currentHeadWorkflow.pushCurrentHead(message.mode);
      },
      'stash-save': async () => {
        await this.runStashAction(() => this.refActionWorkflow.stashSave());
      },
      'stash-apply': async (message) => {
        await this.runStashAction(() => this.refActionWorkflow.stashApply(message.refName));
      },
      'stash-pop': async (message) => {
        await this.runStashAction(() => this.refActionWorkflow.stashPop(message.refName));
      },
      'stash-drop': async (message) => {
        await this.runStashAction(() => this.refActionWorkflow.stashDrop(message.refName));
      },
      delete: async (message) => {
        await this.refActionWorkflow.deleteReference(message.refName, message.refKind);
      },
      merge: async (message) => {
        await this.refActionWorkflow.merge(message.refName, message.refKind);
      }
    };
  }

  private async loadCommitShortStat(commitHash: string): Promise<void> {
    await this.runWithCurrentRepository(async (repository) => {
      let shortStat: RevisionGraphCommitShortStat | undefined;
      try {
        shortStat = await this.host.loadCommitShortStat(repository, commitHash);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (this.host.getCurrentRepository()?.rootUri.fsPath !== repository.rootUri.fsPath) {
        return;
      }
      this.host.postHostMessage(createRevisionGraphCommitShortStatMessage(commitHash, shortStat));
    });
  }

  private async runStashAction(action: () => Promise<boolean>): Promise<void> {
    if (!await action()) {
      this.host.postCurrentState();
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

async function dispatchRevisionGraphMessage<Type extends RevisionGraphProtocol.MessageType>(
  handlers: RevisionGraphMessageHandlerMap,
  message: RevisionGraphProtocol.MessageOf<Type>
): Promise<void> {
  await handlers[message.type](message);
}

async function handleFlowBranchStartMessage(
  host: RevisionGraphMessageHandlerHost,
  message: RevisionGraphProtocol.MessageOf<'start-flow-branch'>
): Promise<void> {
  if ('phase' in message) {
    await host.prepareFlowBranchStart(message.branchKind, message.sourceRefName);
    return;
  }
  await host.startFlowBranch(message.branchKind, message.sourceRefName, message.name, message.description);
}

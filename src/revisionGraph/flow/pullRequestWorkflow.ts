import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import type { Remote, Repository } from '../../git';
import type { RefActionServices } from '../../refActions';
import {
  RepositoryMutationCoordinator,
  runGuardedRepositoryMutation
} from '../../repositoryMutationCoordinator';
import { showConcurrentRepositoryMutationWarning } from '../../repositoryMutationWarning';
import type { RevisionGraphViewState } from '../../revisionGraphTypes';
import { isMergeInProgress } from '../../gitState';
import { createRevisionGraphFlowPullRequestContextMessage } from '../hostMessages';
import type { RevisionGraphViewHostMessage } from '../../revisionGraphTypes';
import {
  buildFlowPullRequestUrlForRemote,
  checkFlowPullRequestSourcePublication,
  checkFlowPullRequestTarget,
  createFlowPullRequestContext,
  loadFlowPullRequestRemoteBranchCommit,
  resolveFlowPullRequestRemote
} from './index';
import {
  FlowRemoteFetchLoadingHost,
  withFlowRemoteFetchLoading
} from './remoteFetchLoading';

export interface RevisionGraphFlowPullRequestWorkflowHost extends FlowRemoteFetchLoadingHost {
  readonly actionServices: RefActionServices;
  readonly mutationCoordinator: RepositoryMutationCoordinator;
  getCurrentRepository(): Repository | undefined;
  getCurrentState(): RevisionGraphViewState;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export interface RevisionGraphFlowPullRequestWorkflowDependencies {
  readonly checkSourcePublication: typeof checkFlowPullRequestSourcePublication;
  readonly checkTarget: typeof checkFlowPullRequestTarget;
  readonly loadRemoteBranchCommit: typeof loadFlowPullRequestRemoteBranchCommit;
  readonly isMergeInProgress: typeof isMergeInProgress;
}

const DEFAULT_DEPENDENCIES: RevisionGraphFlowPullRequestWorkflowDependencies = {
  checkSourcePublication: checkFlowPullRequestSourcePublication,
  checkTarget: checkFlowPullRequestTarget,
  loadRemoteBranchCommit: loadFlowPullRequestRemoteBranchCommit,
  isMergeInProgress
};

export class RevisionGraphFlowPullRequestWorkflow {
  constructor(
    private readonly host: RevisionGraphFlowPullRequestWorkflowHost,
    private readonly dependencies: RevisionGraphFlowPullRequestWorkflowDependencies = DEFAULT_DEPENDENCIES
  ) {}

  async copyContext(sourceRefName: string, targetRefName: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) return;
    if (!await this.ensureMergeCompleted(repository, sourceRefName)) return;
    if (!await this.ensureTargetEligible(repository, sourceRefName, targetRefName)) return;
    if (!await this.ensureSourceReady(repository, sourceRefName)) return;

    const context = createFlowPullRequestContext(sourceRefName, targetRefName);
    this.host.postHostMessage(createRevisionGraphFlowPullRequestContextMessage(
      context.sourceRefName,
      context.targetRefName,
      context.title,
      context.body
    ));
  }

  async copyContextField(
    sourceRefName: string,
    targetRefName: string,
    field: 'title' | 'description'
  ): Promise<void> {
    const context = createFlowPullRequestContext(sourceRefName, targetRefName);
    await vscode.env.clipboard.writeText(field === 'title' ? context.title : context.body);
  }

  async openUrl(sourceRefName: string, targetRefName: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) return;
    if (!await this.ensureMergeCompleted(repository, sourceRefName)) return;
    const remote = resolveFlowPullRequestRemote(repository);
    if (!remote) {
      this.host.actionServices.ui.showInformationMessage(
        'No supported Git hosting remote is configured for this repository.'
      );
      return;
    }
    if (!await this.ensureTargetEligible(repository, sourceRefName, targetRefName, remote)) return;
    if (!await this.ensureSourceReady(repository, sourceRefName, remote)) return;

    const url = buildFlowPullRequestUrlForRemote(remote, sourceRefName, targetRefName);
    if (url) await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private async ensureTargetEligible(
    repository: Repository,
    sourceRefName: string,
    targetRefName: string,
    preferredRemote?: Remote
  ): Promise<boolean> {
    const flowReferences = this.host.getCurrentState().flowGovernance?.references ?? [];
    const policy = resolveFlowPullRequestTargetPolicy(flowReferences, sourceRefName, targetRefName);
    let targetCommitish: string | undefined;
    let targetRemoteName: string | undefined;
    if (policy.requiresRemoteSynchronization) {
      const remote = this.resolvePreferredRemote(repository, preferredRemote);
      if (!remote) {
        await this.host.actionServices.ui.showWarningMessage(
          createMissingTargetRemoteMessage(policy, targetRefName),
          { modal: true }
        );
        return false;
      }
      targetRemoteName = remote.name;
      const outcome = await runGuardedRepositoryMutation(
        this.host.mutationCoordinator,
        repository,
        this.host.actionServices,
        (guardedRepository) => withFlowRemoteFetchLoading(
          this.host,
          () => this.dependencies.loadRemoteBranchCommit(
            guardedRepository,
            remote.name,
            targetRefName
          )
        )
      );
      if (outcome.status === 'rejected') {
        await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
        return false;
      }
      const remoteTarget = outcome.value;
      if (remoteTarget.status !== 'found') {
        const detail = remoteTarget.status === 'missing'
          ? `${remote.name}/${targetRefName} does not exist.`
          : remoteTarget.detail;
        await this.host.actionServices.ui.showWarningMessage(
          createUnverifiedTargetMessage(policy, remote.name, detail),
          { modal: true }
        );
        return false;
      }
      targetCommitish = remoteTarget.commit;
    }

    const eligibility = await this.dependencies.checkTarget(
      repository.rootUri.fsPath,
      sourceRefName,
      targetRefName,
      {
        requireTargetAncestor: policy.requiresTargetAncestry,
        requireTargetSynchronized: policy.requiresRemoteSynchronization,
        ...(targetCommitish ? { targetCommitish } : {})
      }
    );
    if (eligibility.status === 'ahead') return true;

    let message: string;
    if (eligibility.status === 'production-out-of-sync') {
      message = createOutOfSyncTargetMessage(
        policy,
        targetRemoteName,
        targetRefName,
        eligibility.targetLocalAhead,
        eligibility.targetRemoteAhead
      );
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
    await this.host.actionServices.ui.showWarningMessage(message, { modal: true });
    return false;
  }

  private async ensureMergeCompleted(repository: Repository, sourceRefName: string): Promise<boolean> {
    const sourceKind = this.host.getCurrentState().flowGovernance?.references
      .find((reference) => reference.refName === sourceRefName)?.kind;
    if (sourceKind !== 'sync' || !this.dependencies.isMergeInProgress(repository)) {
      return true;
    }

    await this.host.actionServices.ui.showWarningMessage(
      `Complete or abort the merge on ${sourceRefName} before opening Pull Request context.`,
      { modal: true }
    );
    return false;
  }

  private async ensureSourceReady(
    repository: Repository,
    sourceRefName: string,
    preferredRemote?: Remote
  ): Promise<boolean> {
    const remote = this.resolvePreferredRemote(repository, preferredRemote);
    if (!remote) {
      await this.host.actionServices.ui.showInformationMessage(
        'No Git remote is configured for this repository. Pull Request context was not opened.'
      );
      return false;
    }

    try {
      const outcome = await runGuardedRepositoryMutation(
        this.host.mutationCoordinator,
        repository,
        this.host.actionServices,
        async (guardedRepository, services) => {
          let publication = await withFlowRemoteFetchLoading(
            this.host,
            () => this.dependencies.checkSourcePublication(
              guardedRepository,
              remote.name,
              sourceRefName
            )
          );
          if (publication.status === 'ready') return true;
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
          if (!confirmed) return false;

          await guardedRepository.push(remote.name, sourceRefName, isPublish);
          publication = await withFlowRemoteFetchLoading(
            this.host,
            () => this.dependencies.checkSourcePublication(
              guardedRepository,
              remote.name,
              sourceRefName
            )
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
        await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
        return false;
      }
      return outcome.value;
    } catch (error) {
      await this.host.actionServices.ui.showErrorMessage(
        toOperationError(`Could not synchronize ${sourceRefName} before creating the Pull Request.`, error),
        { modal: true }
      );
      return false;
    }
  }

  private resolveRemote(repository: Repository): Remote | undefined {
    return resolveFlowPullRequestRemote(repository)
      ?? repository.state.remotes.find((candidate) => candidate.name === 'origin')
      ?? repository.state.remotes[0];
  }

  private resolvePreferredRemote(repository: Repository, preferredRemote: Remote | undefined): Remote | undefined {
    return preferredRemote ?? this.resolveRemote(repository);
  }
}

interface FlowPullRequestTargetPolicy {
  readonly isProductionPromotion: boolean;
  readonly requiresRemoteSynchronization: boolean;
  readonly requiresTargetAncestry: boolean;
}

function resolveFlowPullRequestTargetPolicy(
  references: NonNullable<RevisionGraphViewState['flowGovernance']>['references'],
  sourceRefName: string,
  targetRefName: string
): FlowPullRequestTargetPolicy {
  const sourceKind = references.find((reference) => reference.refName === sourceRefName)?.kind;
  const targetKind = references.find((reference) => reference.refName === targetRefName)?.kind;
  const isProductionPromotion = (sourceKind === 'release' || sourceKind === 'hotfix') && targetKind === 'main';
  const isFeaturePromotion = sourceKind === 'feature' && targetKind === 'release';
  const isTaskPromotion = sourceKind === 'task' && targetKind === 'feature';
  const isSyncPromotion = sourceKind === 'sync' && (targetKind === 'release' || targetKind === 'feature');
  return {
    isProductionPromotion,
    requiresRemoteSynchronization: isProductionPromotion || isFeaturePromotion || isTaskPromotion || isSyncPromotion,
    requiresTargetAncestry: isProductionPromotion
  };
}

function createMissingTargetRemoteMessage(
  policy: FlowPullRequestTargetPolicy,
  targetRefName: string
): string {
  return policy.isProductionPromotion
    ? `Production promotion aborted: no remote is available to verify the current ${targetRefName} branch.`
    : `Pull Request context was not opened: no remote is available to verify the current ${targetRefName} branch.`;
}

function createUnverifiedTargetMessage(
  policy: FlowPullRequestTargetPolicy,
  remoteName: string,
  detail: string
): string {
  return policy.isProductionPromotion
    ? `Production promotion aborted: the current production branch could not be verified on ${remoteName}. ${detail}`
    : `Pull Request context was not opened: the target branch could not be verified on ${remoteName}. ${detail}`;
}

function createOutOfSyncTargetMessage(
  policy: FlowPullRequestTargetPolicy,
  remoteName: string | undefined,
  targetRefName: string,
  targetLocalAhead: number | undefined,
  targetRemoteAhead: number | undefined
): string {
  const remoteLabel = `${remoteName ?? 'remote'}/${targetRefName}`;
  const localAhead = targetLocalAhead ?? 0;
  const remoteAhead = targetRemoteAhead ?? 0;
  const relationship = remoteAhead > 0 && localAhead === 0
    ? `${targetRefName} is behind ${remoteLabel} by ${remoteAhead} commit(s)`
    : localAhead > 0 && remoteAhead === 0
      ? `${targetRefName} is ahead of ${remoteLabel} by ${localAhead} commit(s)`
      : `${targetRefName} has diverged from ${remoteLabel}`;
  const prefix = policy.isProductionPromotion
    ? 'Production promotion aborted'
    : 'Pull Request context was not opened';
  return `${prefix}: ${relationship}. ` +
    `Synchronize the local ${targetRefName} branch with ${remoteLabel}, refresh the graph, and retry.`;
}

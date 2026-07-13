import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import type { Remote, Repository } from '../../git';
import type { RefActionServices } from '../../refActions';
import {
  RepositoryMutationCoordinator,
  runGuardedRepositoryMutation
} from '../../repositoryMutationCoordinator';
import type { RevisionGraphViewState } from '../../revisionGraphTypes';
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

export interface RevisionGraphFlowPullRequestWorkflowHost {
  readonly actionServices: RefActionServices;
  readonly mutationCoordinator: RepositoryMutationCoordinator;
  getCurrentRepository(): Repository | undefined;
  getCurrentState(): RevisionGraphViewState;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphFlowPullRequestWorkflow {
  constructor(private readonly host: RevisionGraphFlowPullRequestWorkflowHost) {}

  async copyContext(sourceRefName: string, targetRefName: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) return;
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
    const requiresProductionAncestry = flowReferences.some((reference) => (
      reference.refName === sourceRefName && (reference.kind === 'release' || reference.kind === 'hotfix')
    )) && flowReferences.some((reference) => reference.refName === targetRefName && reference.kind === 'main');
    let targetCommitish: string | undefined;
    let productionRemoteName: string | undefined;
    if (requiresProductionAncestry) {
      const remote = this.resolvePreferredRemote(repository, preferredRemote);
      if (!remote) {
        await this.host.actionServices.ui.showWarningMessage(
          `Production promotion aborted: no remote is available to verify the current ${targetRefName} branch.`,
          { modal: true }
        );
        return false;
      }
      productionRemoteName = remote.name;
      const outcome = await runGuardedRepositoryMutation(
        this.host.mutationCoordinator,
        repository,
        this.host.actionServices,
        (guardedRepository) => loadFlowPullRequestRemoteBranchCommit(guardedRepository, remote.name, targetRefName)
      );
      if (outcome.status === 'rejected') {
        this.showConcurrentMutationWarning();
        return false;
      }
      const remoteTarget = outcome.value;
      if (remoteTarget.status !== 'found') {
        const detail = remoteTarget.status === 'missing'
          ? `${remote.name}/${targetRefName} does not exist.`
          : remoteTarget.detail;
        await this.host.actionServices.ui.showWarningMessage(
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
    if (eligibility.status === 'ahead') return true;

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
    await this.host.actionServices.ui.showWarningMessage(message, { modal: true });
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
          let publication = await checkFlowPullRequestSourcePublication(guardedRepository, remote.name, sourceRefName);
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
          publication = await checkFlowPullRequestSourcePublication(guardedRepository, remote.name, sourceRefName);
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
        this.showConcurrentMutationWarning();
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

  private showConcurrentMutationWarning(): void {
    this.host.actionServices.ui.showWarningMessage('Another Git operation is already running for this repository.');
  }
}

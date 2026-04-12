import { toChangeQuickPickItems } from './changePresentation';
import { hasGitErrorCode as matchesGitErrorCode, toOperationError } from './errorDetail';
import { Repository } from './git';
import { formatUpstreamLabel, hasMergeConflicts } from './gitState';
import {
  buildDeleteBranchConfirmationMessage,
  buildForceDeleteBranchMessage,
  buildSyncResultMessage,
  ensureWorkspaceReadyForMutation,
  getCurrentHeadSyncState,
  getLocalBranchForDeletion,
  getSuggestedNewBranchName,
  parseRemoteReferenceTarget,
  resolveRemoteCheckoutTarget,
  shouldRevealSourceControlAfterWorkspaceConflict
} from './refActions/shared';
import {
  BranchCreationTarget,
  RefActionServices,
  RefActionTarget,
  RefSelection
} from './refActions/types';

export type {
  DiffPresenter,
  RefreshController,
  ReferenceManager,
  AncestryInspector,
  RefActionKind,
  RefActionUi,
  RefActionServices,
  RefActionTarget,
  RefSelection
} from './refActions/types';

export async function compareResolvedRefs(
  repository: Repository,
  left: RefSelection,
  right: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffBetween(left.refName, right.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`No differences found between ${left.label} and ${right.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${left.label} and ${right.label}`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openBetweenRefs(repository, pickedChange.change, left.refName, right.refName);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not compare references.', error));
  }
}

export async function compareResolvedRefWithWorktree(
  repository: Repository,
  target: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffWith(target.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`The worktree is already aligned with ${target.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${target.label} and the worktree`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openWithWorktree(repository, pickedChange.change, target.refName);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not compare the reference with the worktree.', error));
  }
}

export async function checkoutResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if ((target.kind === 'head' || target.kind === 'branch') && repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage(`${target.label} is already checked out.`);
      return;
    }

    if (!await ensureWorkspaceReadyForMutation(repository, 'checking out another reference', services)) {
      return;
    }

    if (target.kind === 'remote' || target.kind === 'tag') {
      await createBranchFromResolvedReference(repository, target, services);
      return;
    }

    const confirmed = await services.ui.confirm({
      message: `Check out ${target.label}?`,
      confirmLabel: 'Checkout'
    });
    if (!confirmed) {
      return;
    }

    await repository.checkout(target.refName);
    services.ui.showInformationMessage(`Checkout completed for ${target.label}.`);
    services.refreshController.refresh();
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not check out the reference.', error));
  }
}

export async function createBranchFromResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if (!await ensureWorkspaceReadyForMutation(repository, 'creating a new branch', services)) {
      return;
    }

    const branchCreation = await getBranchCreationTarget(repository, target);
    const branchName = await services.ui.promptBranchName({
      prompt: branchCreation.prompt,
      value: branchCreation.suggestedLocalName
    });

    if (!branchName) {
      return;
    }

    await repository.createBranch(branchName, true, branchCreation.startPointRefName);
    if (branchCreation.upstreamRefName) {
      await repository.setBranchUpstream(branchName, branchCreation.upstreamRefName);
    } else {
      await services.referenceManager.unsetBranchUpstream(repository, branchName);
    }

    services.ui.showInformationMessage(
      branchCreation.upstreamRefName
        ? `Branch ${branchName} was created and checked out from ${branchCreation.upstreamRefName}.`
        : `Branch ${branchName} was created and checked out from ${target.label}.`
    );
    services.refreshController.refresh();
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not create the branch.', error));
  }
}

export async function syncCurrentHeadWithUpstream(
  repository: Repository,
  services: RefActionServices
): Promise<void> {
  try {
    const syncState = getCurrentHeadSyncState(repository);
    if (!syncState) {
      services.ui.showInformationMessage('The current branch is not tracking a remote branch.');
      return;
    }

    if (syncState.ahead <= 0 && syncState.behind <= 0) {
      services.ui.showInformationMessage(`${syncState.branchName} is already synchronized with ${syncState.upstreamLabel}.`);
      return;
    }

    if (hasMergeConflicts(repository)) {
      services.ui.showWarningMessage('Resolve the current conflicts in Source Control before synchronizing the current branch.');
      await services.ui.showSourceControl();
      return;
    }

    if (syncState.behind > 0 && !await ensureWorkspaceReadyForMutation(repository, 'synchronizing the current branch', services)) {
      return;
    }

    if (syncState.behind > 0) {
      await repository.pull();
    }

    if (syncState.ahead > 0) {
      await repository.push();
    }

    services.refreshController.refresh();
    services.ui.showInformationMessage(buildSyncResultMessage(syncState));
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not synchronize the current branch.', error));
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      await services.ui.showSourceControl();
    }
  }
}

export async function mergeResolvedReference(
  repository: Repository,
  target: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const currentBranch = repository.state.HEAD?.name ?? 'current HEAD';
    if (repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage('The current branch cannot be merged into itself.');
      return;
    }

    if (
      repository.state.HEAD?.name &&
      await services.ancestryInspector.isRefAncestorOfHead(repository, target.refName, repository.state.HEAD.name)
    ) {
      services.ui.showInformationMessage(`${target.label} is already contained in ${currentBranch}.`);
      return;
    }

    if (!await ensureWorkspaceReadyForMutation(repository, 'merging another reference', services)) {
      return;
    }

    const confirmed = await services.ui.confirm({
      message: `Merge ${target.label} into ${currentBranch}?`,
      confirmLabel: 'Merge'
    });
    if (!confirmed) {
      return;
    }

    await repository.merge(target.refName);
    services.refreshController.refresh();
    services.ui.showInformationMessage(`Merge from ${target.label} started in ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError('Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience.', error)
    );
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      await services.ui.showSourceControl();
    }
  }
}

export async function deleteResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if (target.kind === 'remote') {
      await deleteRemoteReference(repository, target, services);
      return;
    }

    if (target.kind === 'tag') {
      await deleteTagReference(repository, target, services);
      return;
    }

    await deleteBranchReference(repository, target, services);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not delete the reference.', error));
  }
}

async function getBranchCreationTarget(
  repository: Repository,
  target: RefActionTarget
): Promise<BranchCreationTarget> {
  if (target.kind === 'remote') {
    const remoteCheckout = await resolveRemoteCheckoutTarget(repository, target.refName);
    return {
      ...remoteCheckout,
      prompt: remoteCheckout.upstreamRefName
        ? `Create a New Local Branch Tracking ${remoteCheckout.upstreamRefName}`
        : `Create a New Local Branch from ${target.label}`
    };
  }

  return {
    startPointRefName: target.refName,
    upstreamRefName: undefined,
    suggestedLocalName: getSuggestedNewBranchName(target.refName, target.kind),
    prompt: `Create a New Local Branch from ${target.label}`
  };
}

async function deleteRemoteReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const remoteTarget = parseRemoteReferenceTarget(target.refName);
  if (!remoteTarget || remoteTarget.branchName === 'HEAD') {
    services.ui.showInformationMessage(`The remote reference ${target.label} cannot be deleted from this view.`);
    return;
  }

  const confirmed = await services.ui.confirm({
    message: `Delete the Remote Branch ${target.label}?\n\nThis will remove the branch from ${remoteTarget.remoteName} and may affect other collaborators.`,
    confirmLabel: 'Delete Remote Reference'
  });
  if (!confirmed) {
    return;
  }

  await services.referenceManager.deleteRemoteBranch(repository, remoteTarget.remoteName, remoteTarget.branchName);
  services.ui.showInformationMessage(`Remote branch ${target.label} was deleted from ${remoteTarget.remoteName}.`);
  services.refreshController.refresh();
}

async function deleteTagReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const confirmed = await services.ui.confirm({
    message: `Delete the Tag ${target.label}?`,
    confirmLabel: `Delete Tag: ${target.label}`
  });
  if (!confirmed) {
    return;
  }

  await repository.deleteTag(target.refName);
  services.ui.showInformationMessage(`Tag ${target.label} was deleted.`);
  services.refreshController.refresh();
}

async function deleteBranchReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const branch = await getLocalBranchForDeletion(repository, target.refName);
  const upstreamLabel = branch?.upstream
    ? formatUpstreamLabel(branch.upstream.remote, branch.upstream.name)
    : undefined;

  const confirmed = await services.ui.confirm({
    message: buildDeleteBranchConfirmationMessage(target.label, upstreamLabel),
    confirmLabel: `Delete Branch: ${target.label}`
  });
  if (!confirmed) {
    return;
  }

  try {
    await repository.deleteBranch(target.refName, false);
    services.ui.showInformationMessage(`Branch ${target.label} was deleted.`);
    services.refreshController.refresh();
  } catch (error) {
    if (!matchesGitErrorCode(error, 'BranchNotFullyMerged')) {
      throw error;
    }

    const forceConfirmed = await services.ui.confirm({
      message: buildForceDeleteBranchMessage(target.label, upstreamLabel),
      confirmLabel: 'Force Delete'
    });
    if (!forceConfirmed) {
      return;
    }

    await repository.deleteBranch(target.refName, true);
    services.ui.showInformationMessage(`Branch ${target.label} was force deleted.`);
    services.refreshController.refresh();
  }
}

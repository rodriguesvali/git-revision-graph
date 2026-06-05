import {
  hasGitErrorCode as matchesGitErrorCode,
  toOperationError
} from './errorDetail';
import { Repository } from './git';
import { formatUpstreamLabel, hasMergeConflicts } from './gitState';
import {
  buildDeleteBranchConfirmationMessage,
  buildForceDeleteBranchMessage,
  ensureWorkspaceReadyForMutation,
  getLocalBranchForDeletion,
  parseRemoteReferenceTarget,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from './refActions/shared';
import {
  RefActionServices,
  RefActionTarget,
  RefSelection
} from './refActions/types';

export type {
  CompareResultsPresenter,
  DiffPresenter,
  PreparedRefreshHandle,
  RefreshController,
  ReferenceManager,
  AncestryInspector,
  CompareResultsRevealOptions,
  CurrentBranchPushMode,
  RefActionKind,
  RefActionUi,
  RefActionServices,
  RefActionTarget,
  RemoteCheckoutInput,
  RefSelection
} from './refActions/types';
export type { RevisionGraphRefreshIntent } from './revisionGraphRefresh';
export {
  compareResolvedRefs,
  compareResolvedRefWithWorktree
} from './refActions/compare';
export {
  checkoutResolvedReference,
  createBranchFromResolvedReference
} from './refActions/branches';
export {
  publishLocalBranchResolvedReference,
  pullCurrentBranchFromUpstream,
  pushCurrentBranchToUpstream,
  syncCurrentHeadWithUpstream
} from './refActions/currentBranch';
export {
  createTagFromResolvedReference,
  deleteRemoteTagResolvedReference,
  pushTagResolvedReference
} from './refActions/tags';

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

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await repository.merge(target.refName);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(`Merge from ${target.label} started in ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError('Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience.', error)
    );
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      const preparedRefresh = prepareFullRebuildRefresh(repository, services);
      services.refreshController.refresh(preparedRefresh.request);
    }
  }
}

export async function abortCurrentMerge(
  repository: Repository,
  services: RefActionServices
): Promise<void> {
  try {
    if (!hasMergeConflicts(repository)) {
      services.ui.showInformationMessage('There is no conflicted merge to abort.');
      return;
    }

    const confirmed = await services.ui.confirm({
      message: 'Abort the current merge?\n\nConflict resolutions and staged merge changes from this merge may be discarded.',
      confirmLabel: 'Abort Merge'
    });
    if (!confirmed) {
      return;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await services.referenceManager.abortMerge(repository);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage('Merge aborted. Workspace restored to the pre-merge state.');
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not abort the current merge.', error));
    await services.ui.showSourceControl();
  }
}

export async function resetCurrentBranchWorkspace(
  repository: Repository,
  includeUntracked: boolean,
  services: RefActionServices
): Promise<void> {
  try {
    const currentBranch = repository.state.HEAD?.name;
    if (!currentBranch) {
      services.ui.showWarningMessage('A local current branch is required before resetting the workspace.');
      return;
    }

    if (hasMergeConflicts(repository)) {
      services.ui.showWarningMessage('Abort or resolve the current conflicted merge before resetting the workspace.');
      return;
    }

    const confirmed = await services.ui.confirm({
      message: includeUntracked
        ? `Reset workspace on ${currentBranch} to HEAD and remove untracked files?\n\nThis discards tracked changes, staged changes, and untracked files in this repository.`
        : `Reset workspace on ${currentBranch} to HEAD?\n\nThis discards tracked changes and staged changes in this repository. Untracked files are kept.`,
      confirmLabel: includeUntracked ? 'Reset and Remove Untracked' : 'Reset Workspace'
    });
    if (!confirmed) {
      return;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await services.referenceManager.resetWorkspace(repository, includeUntracked);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(
      includeUntracked
        ? `Workspace reset to ${currentBranch} HEAD. Untracked files were removed.`
        : `Workspace reset to ${currentBranch} HEAD. Untracked files were kept.`
    );
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not reset the workspace.', error));
  }
}

export async function resetCurrentBranchToCommit(
  repository: Repository,
  commitHash: string,
  commitLabel: string,
  services: RefActionServices
): Promise<boolean> {
  try {
    const currentBranch = repository.state.HEAD?.name;
    if (!currentBranch) {
      services.ui.showWarningMessage('A local current branch is required before resetting to a commit.');
      return false;
    }

    if (repository.state.HEAD?.commit === commitHash) {
      services.ui.showInformationMessage(`${currentBranch} is already at ${commitLabel}.`);
      return false;
    }

    if (!await ensureWorkspaceReadyForMutation(repository, `resetting ${currentBranch} to ${commitLabel}`, services)) {
      return false;
    }

    const confirmed = await services.ui.confirm({
      message: `Reset local branch ${currentBranch} to ${commitLabel}?\n\nThis runs git reset --hard ${commitLabel}. Local commits after ${commitLabel} may be lost if they are not reachable from another ref.`,
      confirmLabel: `Reset to ${commitLabel}`
    });
    if (!confirmed) {
      return false;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await services.referenceManager.resetCurrentBranch(repository, commitHash);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(`${currentBranch} was reset to ${commitLabel}.`);
    services.refreshController.refresh(preparedRefresh.request);
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not reset the current branch.', error));
    return false;
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

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  try {
    await services.referenceManager.deleteRemoteBranch(repository, remoteTarget.remoteName, remoteTarget.branchName);
  } catch (error) {
    preparedRefresh.cancel();
    throw error;
  }
  services.ui.showInformationMessage(`Remote branch ${target.label} was deleted from ${remoteTarget.remoteName}.`);
  services.refreshController.refresh(preparedRefresh.request);
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

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  try {
    await repository.deleteTag(target.refName);
  } catch (error) {
    preparedRefresh.cancel();
    throw error;
  }
  services.ui.showInformationMessage(`Tag ${target.label} was deleted.`);
  services.refreshController.refresh(preparedRefresh.request);
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
    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await repository.deleteBranch(target.refName, false);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(`Branch ${target.label} was deleted.`);
    services.refreshController.refresh(preparedRefresh.request);
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

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await repository.deleteBranch(target.refName, true);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(`Branch ${target.label} was force deleted.`);
    services.refreshController.refresh(preparedRefresh.request);
  }
}

import {
  hasGitErrorCode as matchesGitErrorCode,
  isRemotePermissionDeniedError,
  toOperationError
} from '../errorDetail';
import { Repository } from '../git';
import { formatUpstreamLabel } from '../gitState';
import {
  buildDeleteBranchConfirmationMessage,
  buildForceDeleteBranchMessage,
  getLocalBranchForDeletion,
  parseRemoteReferenceTarget,
  prepareFullRebuildRefresh
} from './shared';
import { RefActionServices, RefActionTarget } from './types';

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
    await services.ui.showErrorMessage(
      toOperationError('Could not delete the reference.', error),
      target.kind === 'remote' && isRemotePermissionDeniedError(error) ? { modal: true } : undefined
    );
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

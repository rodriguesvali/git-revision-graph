import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { hasMergeConflicts } from '../gitState';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh
} from './shared';
import { RefActionServices } from './types';

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

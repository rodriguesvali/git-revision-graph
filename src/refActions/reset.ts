import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh
} from './shared';
import { RefActionServices } from './types';

type ResetRefActionServices = Pick<RefActionServices, 'ui' | 'referenceManager' | 'refreshController'>;

export async function resetCurrentBranchToCommit(
  repository: Repository,
  commitHash: string,
  commitLabel: string,
  services: ResetRefActionServices
): Promise<boolean> {
  try {
    const currentBranch = repository.state.HEAD?.name;
    if (!currentBranch) {
      await services.ui.showWarningMessage(
        'A local current branch is required before resetting to a commit.',
        { modal: true }
      );
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

import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { validateGitBranchName } from '../../refActions/branchValidation';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';

export interface PrepareFlowEqualizationOptions {
  readonly productionBranch: string;
  readonly releaseBranch: string;
}

export function suggestFlowEqualizationBranchName(releaseBranch: string): string {
  const suffix = releaseBranch
    .replace(/^release\//, '')
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/^[/.-]+|[/.-]+$/g, '')
    .replace(/\/{2,}/g, '/');
  return `sync/${suffix || 'release'}`;
}

export async function prepareFlowEqualizationBranch(
  repository: Repository,
  options: PrepareFlowEqualizationOptions,
  services: RefActionServices
): Promise<void> {
  const { productionBranch, releaseBranch } = options;
  if (!await ensureWorkspaceReadyForMutation(repository, 'preparing release equalization', services)) {
    return;
  }

  const branchName = await services.ui.promptBranchName({
    prompt: `Create a Local Sync Branch from ${releaseBranch}`,
    value: suggestFlowEqualizationBranchName(releaseBranch)
  });
  if (!branchName) {
    return;
  }

  const validationMessage = validateGitBranchName(branchName);
  if (validationMessage) {
    await services.ui.showErrorMessage(`Could not prepare release equalization. ${validationMessage}`);
    return;
  }
  if (!branchName.startsWith('sync/')) {
    await services.ui.showErrorMessage('Could not prepare release equalization. The helper branch must use the sync/* prefix.');
    return;
  }

  const confirmed = await services.ui.confirm({
    message: `Prepare ${branchName} from ${releaseBranch} and merge ${productionBranch} into it?\n\nThis creates and checks out a local branch. It will not push or merge into ${releaseBranch}.`,
    confirmLabel: 'Prepare Sync Branch'
  });
  if (!confirmed) {
    return;
  }

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  let branchCreated = false;
  try {
    await repository.createBranch(branchName, true, releaseBranch);
    branchCreated = true;
    await repository.merge(productionBranch);
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(
      `${branchName} was created locally from ${releaseBranch} and equalized with ${productionBranch}. Review it, then publish and open a Pull Request when ready.`
    );
  } catch (error) {
    if (!branchCreated) {
      preparedRefresh.cancel();
    } else {
      services.refreshController.refresh(preparedRefresh.request);
    }

    const hasWorkspaceConflict = shouldRevealSourceControlAfterWorkspaceConflict(error, repository);
    await services.ui.showErrorMessage(
      toOperationError(
        branchCreated
          ? `The local branch ${branchName} was created, but equalization did not complete.`
          : 'Could not prepare the local equalization branch.',
        error
      ),
      hasWorkspaceConflict
        ? { modal: true, detail: 'Resolve the merge conflicts in Source Control. No branch was pushed.' }
        : undefined
    );
    if (hasWorkspaceConflict) {
      await services.ui.showSourceControl();
    }
  }
}

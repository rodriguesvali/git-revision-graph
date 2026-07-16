import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { validateGitBranchName } from '../../refActions/branchValidation';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import { setFlowBranchDescription } from './flowBranchDescription';
import { setFlowEqualizationTarget } from './flowEqualizationTarget';

export interface PrepareFlowEqualizationOptions {
  readonly originBranch: string;
  readonly targetBranch: string;
  readonly description: string;
}

export interface FlowEqualizationDependencies {
  readonly setDescription?: typeof setFlowBranchDescription;
  readonly setTarget?: typeof setFlowEqualizationTarget;
}

export function suggestFlowEqualizationBranchName(targetBranch: string): string {
  const suffix = targetBranch
    .replace(/^(?:release|feature)\//, '')
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/^[/.-]+|[/.-]+$/g, '')
    .replace(/\/{2,}/g, '/');
  return `sync/${suffix || 'release'}`;
}

export async function prepareFlowEqualizationBranch(
  repository: Repository,
  options: PrepareFlowEqualizationOptions,
  services: RefActionServices,
  dependencies: FlowEqualizationDependencies = {}
): Promise<void> {
  const { originBranch, targetBranch } = options;
  if (!await ensureWorkspaceReadyForMutation(repository, 'preparing branch equalization', services)) {
    return;
  }

  const description = options.description.trim();
  if (!description) {
    await services.ui.showErrorMessage('Could not prepare equalization. Description is required.');
    return;
  }

  if (originBranch === targetBranch) {
    await services.ui.showErrorMessage('Could not prepare equalization. Origin branch must differ from the target branch.');
    return;
  }

  const branchName = suggestFlowEqualizationBranchName(targetBranch);
  const validationMessage = validateGitBranchName(branchName);
  if (validationMessage) {
    await services.ui.showErrorMessage(`Could not prepare equalization. ${validationMessage}`);
    return;
  }

  const branchBaseRefName = targetBranch;
  const mergeRefName = originBranch;
  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  let branchCreated = false;
  try {
    await repository.createBranch(branchName, true, branchBaseRefName);
    branchCreated = true;
    await (dependencies.setTarget ?? setFlowEqualizationTarget)(
      repository.rootUri.fsPath,
      branchName,
      targetBranch
    );
    try {
      await (dependencies.setDescription ?? setFlowBranchDescription)(
        repository.rootUri.fsPath,
        branchName,
        description
      );
    } catch (error) {
      await services.ui.showWarningMessage(
        toOperationError(`${branchName} was created, but its description could not be saved.`, error),
        { modal: true }
      );
    }
    await repository.merge(mergeRefName);
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(
      `${branchName} was created locally from ${branchBaseRefName} and equalized with ${mergeRefName}. Review it, then publish and open a Pull Request when ready.`
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

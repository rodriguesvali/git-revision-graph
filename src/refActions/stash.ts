import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { hasMergeConflicts, hasWorkspaceChanges } from '../gitState';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from './shared';
import { RefActionServices, RefActionTarget } from './types';

export async function saveCurrentWorkspaceToStash(
  repository: Repository,
  services: RefActionServices
): Promise<boolean> {
  try {
    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before saving workspace changes to a stash.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return false;
    }

    if (!hasWorkspaceChanges(repository)) {
      services.ui.showInformationMessage('There are no workspace changes to stash.');
      return false;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await services.referenceManager.stashSave(repository);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage('Workspace changes were saved to stash.');
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not save workspace changes to stash.', error));
    return false;
  }
}

export async function applyStashResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  return runStashMutation(repository, target, services, {
    operationDescription: 'applying a stash',
    confirmationMessage: `Apply ${target.label} to the workspace?`,
    confirmationLabel: 'Stash Apply',
    action: (stashRefName) => services.referenceManager.stashApply(repository, stashRefName),
    successMessage: `${target.label} was applied to the workspace.`,
    errorMessage: 'Could not apply the stash.'
  });
}

export async function popStashResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  return runStashMutation(repository, target, services, {
    operationDescription: 'popping a stash',
    confirmationMessage: `Pop ${target.label} into the workspace?\n\nThe stash entry is removed if it applies cleanly.`,
    confirmationLabel: 'Stash Pop',
    action: (stashRefName) => services.referenceManager.stashPop(repository, stashRefName),
    successMessage: `${target.label} was popped into the workspace.`,
    errorMessage: 'Could not pop the stash.'
  });
}

export async function dropStashResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  return runStashMutation(repository, target, services, {
    operationDescription: 'removing a stash',
    confirmationMessage: `Remove ${target.label}?\n\nThis deletes the stash entry from the repository.`,
    confirmationLabel: 'Remove Stash',
    allowWorkspaceChanges: true,
    action: (stashRefName) => services.referenceManager.stashDrop(repository, stashRefName),
    successMessage: `${target.label} was removed.`,
    errorMessage: 'Could not remove the stash.'
  });
}

async function runStashMutation(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices,
  options: {
    readonly operationDescription: string;
    readonly confirmationMessage: string;
    readonly confirmationLabel: string;
    readonly allowWorkspaceChanges?: boolean;
    readonly action: (stashRefName: string) => Promise<void>;
    readonly successMessage: string;
    readonly errorMessage: string;
  }
): Promise<boolean> {
  try {
    if (target.kind !== 'stash') {
      await services.ui.showWarningMessage(
        'Select a stash reference before running this action.',
        { modal: true }
      );
      return false;
    }

    if (!await ensureWorkspaceReadyForMutation(
      repository,
      options.operationDescription,
      services,
      { allowWorkspaceChanges: options.allowWorkspaceChanges }
    )) {
      return false;
    }

    const confirmed = await services.ui.confirm({
      message: options.confirmationMessage,
      confirmLabel: options.confirmationLabel
    });
    if (!confirmed) {
      return false;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await options.action(target.refName);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(options.successMessage);
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError(options.errorMessage, error));
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      const preparedRefresh = prepareFullRebuildRefresh(repository, services);
      services.refreshController.refresh(preparedRefresh.request);
      await services.ui.showSourceControl();
      return true;
    }
    return false;
  }
}

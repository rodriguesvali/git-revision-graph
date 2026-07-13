import { toOperationError } from '../errorDetail';
import { Repository } from '../git';
import { hasMergeConflicts } from '../gitState';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from './shared';
import { MergeRefSelection, RefActionServices } from './types';

export async function mergeResolvedReference(
  repository: Repository,
  target: MergeRefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const currentBranch = repository.state.HEAD?.name ?? 'current HEAD';
    if (repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage('The current branch cannot be merged into itself.');
      return;
    }

    const qualifiedRefName = qualifyMergeRefName(target);

    if (
      repository.state.HEAD?.name &&
      await services.ancestryInspector.isRefAncestorOfHead(repository, qualifiedRefName, repository.state.HEAD.name)
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
      await repository.merge(qualifiedRefName);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(`Merge from ${target.label} started in ${currentBranch}.`);
  } catch (error) {
    const errorMessage = toOperationError(
      'Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience.',
      error
    );
    const hasWorkspaceConflict = shouldRevealSourceControlAfterWorkspaceConflict(error, repository);
    if (hasWorkspaceConflict) {
      const preparedRefresh = prepareFullRebuildRefresh(repository, services);
      services.refreshController.refresh(preparedRefresh.request);
    }

    await services.ui.showErrorMessage(
      errorMessage,
      hasWorkspaceConflict
        ? {
            modal: true,
            detail: 'Resolve the conflicts in Source Control or abort the merge from the HEAD reference before continuing.'
          }
        : undefined
    );
  }
}

function qualifyMergeRefName(target: MergeRefSelection): string {
  if (target.refName.startsWith('refs/')) {
    return target.refName;
  }

  switch (target.kind) {
    case 'branch':
      return `refs/heads/${target.refName}`;
    case 'remote':
      return `refs/remotes/${target.refName}`;
    case 'tag':
      return `refs/tags/${target.refName}`;
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

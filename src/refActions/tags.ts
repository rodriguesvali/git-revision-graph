import {
  isNonInteractiveGitAuthenticationError,
  isRemotePermissionDeniedError,
  toErrorDetail,
  toOperationError
} from '../errorDetail';
import { RefType, Repository } from '../git';
import { hasMergeConflicts } from '../gitState';
import { pickRemote, prepareFullRebuildRefresh } from './shared';
import { validateGitTagName } from './tagValidation';
import { RefActionServices, RefActionTarget } from './types';

export async function createTagFromResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before creating a new tag.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return;
    }

    const existingTagNames = await getLocalTagNames(repository);
    const tagName = await services.ui.promptTagName({
      prompt: `Create a New Tag from ${target.label}`,
      existingTagNames
    });

    if (!tagName) {
      return;
    }

    const validationMessage = validateGitTagName(tagName, existingTagNames);
    if (validationMessage) {
      await services.ui.showErrorMessage(`Could not create the tag. ${validationMessage}`);
      return;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await services.referenceManager.createTag(repository, tagName, target.refName);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(`Tag ${tagName} was created from ${target.label}.`);
    services.refreshController.refresh(preparedRefresh.request);
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not create the tag.', error));
  }
}

async function getLocalTagNames(repository: Repository): Promise<readonly string[]> {
  const refs = await repository.getRefs();
  return refs
    .filter((ref) => ref.type === RefType.Tag && !!ref.name)
    .map((ref) => ref.name as string);
}

export async function pushTagResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  try {
    if (target.kind !== 'tag') {
      services.ui.showInformationMessage(`${target.label} is not a local tag.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before pushing a tag.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return false;
    }

    const remoteName = await pickTagPushRemote(repository, services);
    if (!remoteName) {
      return false;
    }

    const confirmed = await services.ui.confirm({
      message: `Push tag ${target.label} to ${remoteName}?`,
      confirmLabel: `Push Tag: ${target.label}`
    });
    if (!confirmed) {
      return false;
    }

    await services.referenceManager.pushTag(repository, remoteName, target.refName);
    services.ui.showInformationMessage(`Tag ${target.label} was pushed to ${remoteName}.`);
    return true;
  } catch (error) {
    if (isNonInteractiveGitAuthenticationError(error)) {
      await services.ui.showErrorMessage(
        'Could not push the tag. Git authentication is unavailable for this operation. ' +
        `Open Source Control and run "Git: Push Tags", or configure Git credentials for command-line pushes. ${toErrorDetail(error)}`
      );
      await services.ui.showSourceControl();
    } else {
      await services.ui.showErrorMessage(
        toOperationError('Could not push the tag.', error),
        isRemotePermissionDeniedError(error) ? { modal: true } : undefined
      );
    }
    return false;
  }
}

export async function deleteRemoteTagResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  try {
    if (target.kind !== 'tag') {
      services.ui.showInformationMessage(`${target.label} is not a local tag.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before deleting a remote tag.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return false;
    }

    const remoteName = await pickRemote(repository, services, 'Choose a remote to delete the tag from');
    if (!remoteName) {
      return false;
    }

    const confirmed = await services.ui.confirm({
      message: `Delete tag ${target.label} from ${remoteName}?\n\nThis removes the tag from the remote repository for everyone. The local tag will remain unchanged.`,
      confirmLabel: `Delete Remote Tag: ${target.label}`
    });
    if (!confirmed) {
      return false;
    }

    await services.referenceManager.deleteRemoteTag(repository, remoteName, target.refName);
    services.ui.showInformationMessage(`Tag ${target.label} was deleted from ${remoteName}.`);
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError('Could not delete the remote tag.', error),
      isRemotePermissionDeniedError(error) ? { modal: true } : undefined
    );
    return false;
  }
}

async function pickTagPushRemote(
  repository: Repository,
  services: RefActionServices
): Promise<string | undefined> {
  return pickRemote(repository, services, 'Choose a remote for the tag push');
}

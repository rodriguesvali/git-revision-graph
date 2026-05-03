import {
  hasGitErrorCode as matchesGitErrorCode,
  isNonInteractiveGitAuthenticationError,
  toErrorDetail,
  toOperationError
} from './errorDetail';
import { RefType, Repository } from './git';
import { formatUpstreamLabel, hasMergeConflicts, isBranchTrackingMatchingUpstream } from './gitState';
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
import { validateGitBranchName } from './refActions/branchValidation';
import { validateGitTagName } from './refActions/tagValidation';
import {
  BranchCreationTarget,
  RefActionServices,
  RefActionTarget,
  RefSelection
} from './refActions/types';
import {
  createActionRefreshRequest,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequestLike
} from './revisionGraphRefresh';

export type {
  CompareResultsPresenter,
  DiffPresenter,
  PreparedRefreshHandle,
  RefreshController,
  ReferenceManager,
  AncestryInspector,
  RefActionKind,
  RefActionUi,
  RefActionServices,
  RefActionTarget,
  RefSelection
} from './refActions/types';
export type { RevisionGraphRefreshIntent } from './revisionGraphRefresh';

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
    await services.compareResultsPresenter.showBetweenRefs(repository, left, right, changes);
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
    await services.compareResultsPresenter.showWithWorktree(repository, target, changes);
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
      confirmLabel: `Checkout to: ${target.label}`
    });
    if (!confirmed) {
      return;
    }

    await repository.checkout(target.refName);
    services.ui.showInformationMessage(`Checkout completed for ${target.label}.`);
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

    const validationMessage = validateGitBranchName(branchName);
    if (validationMessage) {
      await services.ui.showErrorMessage(`Could not create the branch. ${validationMessage}`);
      return;
    }

    const normalizedBranchName = branchName.trim();
    if (normalizedBranchName.length === 0) {
      return;
    }

    const existingLocalBranch = target.kind === 'remote'
      ? await getLocalBranch(repository, normalizedBranchName)
      : undefined;
    const didOverwrite = !!existingLocalBranch;
    if (existingLocalBranch) {
      if (repository.state.HEAD?.name === normalizedBranchName) {
        services.ui.showWarningMessage(
          `The current branch ${normalizedBranchName} cannot be overwritten from ${branchCreation.startPointRefName}. Check out another branch first.`
        );
        return;
      }

      const confirmed = await services.ui.confirm({
        message: buildOverwriteBranchConfirmationMessage(normalizedBranchName, branchCreation.startPointRefName),
        confirmLabel: `Overwrite Branch: ${normalizedBranchName}`
      });
      if (!confirmed) {
        return;
      }

      await services.referenceManager.resetBranch(repository, normalizedBranchName, branchCreation.startPointRefName);
      await repository.checkout(normalizedBranchName);
    } else {
      await repository.createBranch(normalizedBranchName, true, branchCreation.startPointRefName);
    }

    if (branchCreation.upstreamRefName) {
      await repository.setBranchUpstream(normalizedBranchName, branchCreation.upstreamRefName);
    } else {
      await services.referenceManager.unsetBranchUpstream(repository, normalizedBranchName);
    }

    services.ui.showInformationMessage(
      didOverwrite && branchCreation.upstreamRefName
        ? `Branch ${normalizedBranchName} was overwritten, checked out, and set to track ${branchCreation.upstreamRefName}.`
        : branchCreation.upstreamRefName
          ? `Branch ${normalizedBranchName} was created and checked out from ${branchCreation.upstreamRefName}.`
          : `Branch ${normalizedBranchName} was created and checked out from ${target.label}.`
    );
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not create the branch.', error));
  }
}

export async function createTagFromResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const refreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';
  try {
    if (hasMergeConflicts(repository)) {
      services.ui.showWarningMessage('Resolve the current conflicts in Source Control before creating a new tag.');
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

    await services.referenceManager.createTag(repository, tagName, target.refName);
    services.ui.showInformationMessage(`Tag ${tagName} was created from ${target.label}.`);
    services.refreshController.refresh(
      createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
    );
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

async function getLocalBranch(repository: Repository, branchName: string): Promise<unknown | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

function buildOverwriteBranchConfirmationMessage(branchName: string, startPointRefName: string): string {
  return `Overwrite local branch ${branchName} with ${startPointRefName}?\n\nThis resets ${branchName} to ${startPointRefName} before checking it out. Local commits on ${branchName} that are not reachable from another ref may be lost.`;
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
      services.ui.showWarningMessage('Resolve the current conflicts in Source Control before pushing a tag.');
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
      await services.ui.showErrorMessage(toOperationError('Could not push the tag.', error));
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
      services.ui.showWarningMessage('Resolve the current conflicts in Source Control before deleting a remote tag.');
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
    await services.ui.showErrorMessage(toOperationError('Could not delete the remote tag.', error));
    return false;
  }
}

export async function publishLocalBranchResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  const refreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';
  try {
    if (target.kind !== 'head' && target.kind !== 'branch') {
      services.ui.showInformationMessage(`${target.label} is not a local branch.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      services.ui.showWarningMessage('Resolve the current conflicts in Source Control before publishing a branch.');
      await services.ui.showSourceControl();
      return false;
    }

    const branch = await repository.getBranch(target.refName);
    const upstreamLabel = branch.upstream
      ? formatUpstreamLabel(branch.upstream.remote, branch.upstream.name)
      : undefined;
    if (branch.upstream && isBranchTrackingMatchingUpstream(target.refName, branch.upstream)) {
      services.ui.showInformationMessage(
        `${target.label} already tracks ${upstreamLabel}. Use Sync to update the remote branch.`
      );
      return false;
    }

    const remoteName = await pickRemote(repository, services, 'Choose a remote for the branch publish');
    if (!remoteName) {
      return false;
    }

    const confirmed = await services.ui.confirm({
      message: buildPublishBranchConfirmationMessage(target.label, remoteName, upstreamLabel),
      confirmLabel: `Publish Branch: ${target.label}`
    });
    if (!confirmed) {
      return false;
    }

    await repository.push(remoteName, target.refName, true);
    services.refreshController.refresh(
      createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
    );
    services.ui.showInformationMessage(`Branch ${target.label} was published to ${remoteName}/${target.refName}.`);
    return true;
  } catch (error) {
    if (isNonInteractiveGitAuthenticationError(error)) {
      await services.ui.showErrorMessage(
        'Could not publish the branch. Git authentication is unavailable for this operation. ' +
        `Open Source Control and run "Git: Publish Branch", or configure Git credentials for command-line pushes. ${toErrorDetail(error)}`
      );
      await services.ui.showSourceControl();
    } else {
      await services.ui.showErrorMessage(toOperationError('Could not publish the branch.', error));
    }
    return false;
  }
}

function buildPublishBranchConfirmationMessage(
  branchName: string,
  remoteName: string,
  currentUpstreamLabel: string | undefined
): string {
  const targetUpstreamLabel = formatUpstreamLabel(remoteName, branchName);
  if (!currentUpstreamLabel) {
    return `Publish branch ${branchName} to ${remoteName}?`;
  }

  return `Publish branch ${branchName} to ${remoteName}?\n\nIt currently tracks ${currentUpstreamLabel}. Publishing will update upstream tracking to ${targetUpstreamLabel}.`;
}

export async function syncCurrentHeadWithUpstream(
  repository: Repository,
  services: RefActionServices
): Promise<void> {
  try {
    const head = repository.state.HEAD;
    if (head?.name && head.upstream && !isBranchTrackingMatchingUpstream(head.name, head.upstream)) {
      services.ui.showInformationMessage(
        `${head.name} is tracking ${formatUpstreamLabel(head.upstream.remote, head.upstream.name)}. Publish the branch to update upstream tracking before synchronizing.`
      );
      return;
    }

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

    const refreshIntent: RevisionGraphRefreshIntent =
      syncState.ahead > 0 && syncState.behind > 0
        ? 'full-rebuild'
        : 'metadata-patch';
    services.refreshController.refresh(
      createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
    );
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
  const refreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';
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
    services.refreshController.refresh(
      createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
    );
    services.ui.showInformationMessage(`Merge from ${target.label} started in ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError('Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience.', error)
    );
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      services.refreshController.refresh(
        { intent: 'overlay-patch', repositoryPath: repository.rootUri.toString() }
      );
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

    await services.referenceManager.abortMerge(repository);
    services.refreshController.refresh(
      { intent: 'overlay-patch', repositoryPath: repository.rootUri.toString() }
    );
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

    await services.referenceManager.resetWorkspace(repository, includeUntracked);
    services.refreshController.refresh(
      { intent: 'overlay-patch', repositoryPath: repository.rootUri.toString() }
    );
    services.ui.showInformationMessage(
      includeUntracked
        ? `Workspace reset to ${currentBranch} HEAD. Untracked files were removed.`
        : `Workspace reset to ${currentBranch} HEAD. Untracked files were kept.`
    );
  } catch (error) {
    await services.ui.showErrorMessage(toOperationError('Could not reset the workspace.', error));
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

async function pickTagPushRemote(
  repository: Repository,
  services: RefActionServices
): Promise<string | undefined> {
  return pickRemote(repository, services, 'Choose a remote for the tag push');
}

async function pickRemote(
  repository: Repository,
  services: RefActionServices,
  placeHolder: string
): Promise<string | undefined> {
  const remoteNames = await services.referenceManager.getRemoteNames(repository);
  if (remoteNames.length === 0) {
    services.ui.showInformationMessage('No Git remote is configured for this repository.');
    return undefined;
  }

  if (remoteNames.length === 1) {
    return remoteNames[0];
  }

  return services.ui.pickRemoteName(remoteNames, placeHolder);
}

async function deleteRemoteReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const refreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';
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
  services.refreshController.refresh(
    createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
  );
}

async function deleteTagReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  const refreshIntent: RevisionGraphRefreshIntent = 'full-rebuild';
  const confirmed = await services.ui.confirm({
    message: `Delete the Tag ${target.label}?`,
    confirmLabel: `Delete Tag: ${target.label}`
  });
  if (!confirmed) {
    return;
  }

  await repository.deleteTag(target.refName);
  services.ui.showInformationMessage(`Tag ${target.label} was deleted.`);
  services.refreshController.refresh(
    createActionRefreshRequest(refreshIntent, repository.rootUri.toString())
  );
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
    services.refreshController.refresh(
      createDeletedLocalBranchPatchRequest(repository, target.refName)
    );
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
    services.refreshController.refresh(
      createDeletedLocalBranchPatchRequest(repository, target.refName)
    );
  }
}

function createDeletedLocalBranchPatchRequest(
  repository: Repository,
  branchName: string
): RevisionGraphRefreshRequestLike {
  return {
    intent: 'overlay-patch',
    repositoryPath: repository.rootUri.toString(),
    followUpEvents: ['state'],
    referencePatch: {
      removeRefs: [{ kind: 'branch', name: branchName }]
    }
  };
}

import {
  isNonInteractiveGitAuthenticationError,
  isRemotePermissionDeniedError,
  toErrorDetail,
  toOperationError
} from '../errorDetail';
import { Repository } from '../git';
import { formatUpstreamLabel, hasMergeConflicts, isBranchTrackingMatchingUpstream } from '../gitState';
import {
  buildSyncResultMessage,
  ensureWorkspaceReadyForMutation,
  getCurrentHeadSyncState,
  pickRemote,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from './shared';
import { CurrentBranchPushMode, RefActionServices, RefActionTarget } from './types';

export async function publishLocalBranchResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<boolean> {
  try {
    if (target.kind !== 'head' && target.kind !== 'branch') {
      services.ui.showInformationMessage(`${target.label} is not a local branch.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before publishing a branch.',
        { modal: true }
      );
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

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await repository.push(remoteName, target.refName, true);
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(`Branch ${target.label} was published to ${remoteName}/${target.refName}.`);
    return true;
  } catch (error) {
    if (isNonInteractiveGitAuthenticationError(error)) {
      await services.ui.showErrorMessage(
        'Could not publish the branch. Git authentication is unavailable for this operation. ' +
        `Open Source Control and run "Git: Publish Branch", or configure Git credentials for command-line pushes. ${toErrorDetail(error)}`
      );
      await services.ui.showSourceControl();
    } else if (isRemotePermissionDeniedError(error)) {
      await services.ui.showErrorMessage(
        toOperationError('Could not publish the branch.', error),
        { modal: true }
      );
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
): Promise<boolean> {
  try {
    const head = repository.state.HEAD;
    if (head?.name && head.upstream && !isBranchTrackingMatchingUpstream(head.name, head.upstream)) {
      services.ui.showInformationMessage(
        `${head.name} is tracking ${formatUpstreamLabel(head.upstream.remote, head.upstream.name)}. Publish the branch to update upstream tracking before synchronizing.`
      );
      return false;
    }

    const syncState = getCurrentHeadSyncState(repository);
    if (!syncState) {
      services.ui.showInformationMessage('The current branch is not tracking a remote branch.');
      return false;
    }

    if (syncState.ahead <= 0 && syncState.behind <= 0) {
      services.ui.showInformationMessage(`${syncState.branchName} is already synchronized with ${syncState.upstreamLabel}.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before synchronizing the current branch.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return false;
    }

    if (syncState.behind > 0 && !await ensureWorkspaceReadyForMutation(repository, 'synchronizing the current branch', services)) {
      return false;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      if (syncState.behind > 0) {
        await repository.pull();
      }

      if (syncState.ahead > 0) {
        await repository.push();
      }
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }

    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(buildSyncResultMessage(syncState));
    return true;
  } catch (error) {
    const message = toOperationError('Could not synchronize the current branch.', error);
    if (isRemotePermissionDeniedError(error)) {
      await services.ui.showErrorMessage(message, { modal: true });
      return false;
    }

    const errorMessage = services.ui.showErrorMessage(message);
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      void errorMessage
        .then(() => services.ui.showSourceControl())
        .catch(() => undefined);
    } else {
      void errorMessage.catch(() => undefined);
    }
    return false;
  }
}

export async function pullCurrentBranchFromUpstream(
  repository: Repository,
  services: RefActionServices
): Promise<boolean> {
  try {
    const currentBranch = repository.state.HEAD?.name;
    const upstream = repository.state.HEAD?.upstream;
    if (!currentBranch) {
      await services.ui.showWarningMessage(
        'A local current branch is required before pulling.',
        { modal: true }
      );
      return false;
    }

    if (!upstream) {
      services.ui.showInformationMessage(`${currentBranch} has no upstream branch configured for pull.`);
      return false;
    }

    const upstreamLabel = formatUpstreamLabel(upstream.remote, upstream.name);
    if (!await ensureWorkspaceReadyForMutation(repository, `pulling ${upstreamLabel} into ${currentBranch}`, services, { allowWorkspaceChanges: true })) {
      return false;
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      await repository.pull();
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(`${currentBranch} was pulled from ${upstreamLabel}.`);
    services.refreshController.refresh(preparedRefresh.request);
    return true;
  } catch (error) {
    const message = toOperationError('Could not pull the current branch.', error);
    if (isRemotePermissionDeniedError(error)) {
      await services.ui.showErrorMessage(message, { modal: true });
      return false;
    }

    const errorMessage = services.ui.showErrorMessage(message);
    if (shouldRevealSourceControlAfterWorkspaceConflict(error, repository)) {
      void errorMessage
        .then(() => services.ui.showSourceControl())
        .catch(() => undefined);
    } else {
      void errorMessage.catch(() => undefined);
    }
    return false;
  }
}

export async function pushCurrentBranchToUpstream(
  repository: Repository,
  services: RefActionServices,
  requestedMode?: CurrentBranchPushMode
): Promise<boolean> {
  try {
    const currentBranch = repository.state.HEAD?.name;
    const upstream = repository.state.HEAD?.upstream;
    if (!currentBranch) {
      await services.ui.showWarningMessage(
        'A local current branch is required before pushing.',
        { modal: true }
      );
      return false;
    }

    if (!upstream) {
      services.ui.showInformationMessage(`${currentBranch} has no upstream branch configured for push.`);
      return false;
    }

    if (hasMergeConflicts(repository)) {
      await services.ui.showWarningMessage(
        'Resolve the current conflicts in Source Control before pushing.',
        { modal: true }
      );
      await services.ui.showSourceControl();
      return false;
    }

    const upstreamLabel = formatUpstreamLabel(upstream.remote, upstream.name);
    const pushMode = requestedMode ?? await services.ui.pickCurrentBranchPushMode({
      branchName: currentBranch,
      upstreamLabel
    });
    if (!pushMode) {
      return false;
    }

    if (isForcePushMode(pushMode)) {
      const confirmed = await services.ui.confirm({
        message: buildForcePushConfirmationMessage(currentBranch, upstreamLabel, pushMode),
        confirmLabel: pushMode === 'force-with-lease' ? 'Force Push With Lease' : 'Force Push'
      });
      if (!confirmed) {
        return false;
      }
    }

    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      const didPush = await services.referenceManager.pushCurrentBranch(
        repository,
        upstream.remote,
        getUpstreamBranchName(upstream.remote, upstream.name),
        pushMode
      );
      if (!didPush) {
        preparedRefresh.cancel();
        return false;
      }
    } catch (error) {
      preparedRefresh.cancel();
      throw error;
    }
    services.ui.showInformationMessage(buildCurrentBranchPushResultMessage(currentBranch, upstreamLabel, pushMode));
    services.refreshController.refresh(preparedRefresh.request);
    return true;
  } catch (error) {
    if (isNonInteractiveGitAuthenticationError(error)) {
      await services.ui.showErrorMessage(
        `Open Source Control and run the equivalent Git push command, or configure Git credentials for command-line pushes. ${toErrorDetail(error)}`
      );
      await services.ui.showSourceControl();
      return false;
    }

    await services.ui.showErrorMessage(
      toOperationError('Could not push the current branch.', error),
      isRemotePermissionDeniedError(error) ? { modal: true } : undefined
    );
    return false;
  }
}

function isForcePushMode(mode: CurrentBranchPushMode): boolean {
  return mode === 'force-with-lease' || mode === 'force';
}

function buildForcePushConfirmationMessage(
  currentBranch: string,
  upstreamLabel: string,
  mode: CurrentBranchPushMode
): string {
  const safetyNote = mode === 'force-with-lease'
    ? 'This rewrites the remote branch only if it has not changed since your last fetch.'
    : 'This rewrites the remote branch without checking whether someone else updated it.';
  return `Force push ${currentBranch} to ${upstreamLabel}?\n\n${safetyNote} Use this only when you intentionally moved the local branch history.`;
}

function buildCurrentBranchPushResultMessage(
  currentBranch: string,
  upstreamLabel: string,
  mode: CurrentBranchPushMode
): string {
  if (mode === 'normal') {
    return `${currentBranch} was pushed to ${upstreamLabel}.`;
  }

  return `${currentBranch} was force pushed to ${upstreamLabel}.`;
}

function getUpstreamBranchName(remoteName: string, upstreamName: string): string {
  const remotePrefix = `${remoteName}/`;
  return upstreamName.startsWith(remotePrefix)
    ? upstreamName.slice(remotePrefix.length)
    : upstreamName;
}

import { Branch, Repository, RefType } from '../git';
import { hasGitErrorCode as matchesGitErrorCode } from '../errorDetail';
import { HeadSyncState, RefActionKind, RefActionServices } from './types';

export function parseRemoteReferenceTarget(refName: string): { remoteName: string; branchName: string } | undefined {
  const firstSlash = refName.indexOf('/');
  if (firstSlash <= 0 || firstSlash === refName.length - 1) {
    return undefined;
  }

  return {
    remoteName: refName.slice(0, firstSlash),
    branchName: refName.slice(firstSlash + 1)
  };
}

export function getSuggestedLocalBranchName(refName: string): string {
  const firstSlash = refName.indexOf('/');
  return firstSlash >= 0 ? refName.slice(firstSlash + 1) : refName;
}

export function getSuggestedNewBranchName(refName: string, kind: RefActionKind): string {
  if (kind === 'head' || kind === 'branch') {
    return `${refName}-copy`;
  }

  return refName;
}

export function getCurrentHeadSyncState(repository: Repository): HeadSyncState | undefined {
  const head = repository.state.HEAD;
  if (!head?.name || !head.upstream) {
    return undefined;
  }

  return {
    branchName: head.name,
    upstreamLabel: formatUpstreamLabel(head.upstream.remote, head.upstream.name),
    ahead: head.ahead ?? 0,
    behind: head.behind ?? 0
  };
}

export function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}

export function buildSyncResultMessage(syncState: HeadSyncState): string {
  if (syncState.behind > 0 && syncState.ahead > 0) {
    return `${syncState.branchName} was synchronized with ${syncState.upstreamLabel}.`;
  }

  if (syncState.behind > 0) {
    return `${syncState.branchName} was updated from ${syncState.upstreamLabel}.`;
  }

  return `${syncState.branchName} was pushed to ${syncState.upstreamLabel}.`;
}

export async function ensureWorkspaceReadyForMutation(
  repository: Repository,
  operationDescription: string,
  services: RefActionServices
): Promise<boolean> {
  if (hasMergeConflicts(repository)) {
    services.ui.showWarningMessage(`Resolve the current conflicts in Source Control before ${operationDescription}.`);
    await services.ui.showSourceControl();
    return false;
  }

  if (hasWorkspaceChanges(repository)) {
    services.ui.showWarningMessage(`The workspace must be clean before ${operationDescription}. Review, stash, or commit the current changes first.`);
    return false;
  }

  return true;
}

export function hasMergeConflicts(repository: Repository): boolean {
  return repository.state.mergeChanges.length > 0;
}

export function hasWorkspaceChanges(repository: Repository): boolean {
  return (
    repository.state.mergeChanges.length > 0
    || repository.state.indexChanges.length > 0
    || repository.state.workingTreeChanges.length > 0
    || repository.state.untrackedChanges.length > 0
  );
}

export function shouldRevealSourceControlAfterWorkspaceConflict(error: unknown, repository: Repository): boolean {
  return (
    hasMergeConflicts(repository)
    || matchesGitErrorCode(error, 'Conflict')
    || matchesGitErrorCode(error, 'UnmergedChanges')
  );
}

export async function getLocalBranchForDeletion(repository: Repository, branchName: string): Promise<Branch | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

export function buildDeleteBranchConfirmationMessage(label: string, upstreamLabel: string | undefined): string {
  if (!upstreamLabel) {
    return `Delete the Branch ${label}?`;
  }

  return `Delete the Local Branch ${label}?\n\nThis removes only the local branch. The tracked remote branch ${upstreamLabel} will remain unchanged.`;
}

export function buildForceDeleteBranchMessage(label: string, upstreamLabel: string | undefined): string {
  const mergeBaseLabel = upstreamLabel ?? 'HEAD';
  const remoteNotice = upstreamLabel
    ? ` The tracked remote branch ${upstreamLabel} will remain unchanged.`
    : '';

  return `${label} is not fully merged into ${mergeBaseLabel}.\n\nForce delete the local branch anyway?${remoteNotice}`;
}

export async function resolveRemoteCheckoutTarget(
  repository: Repository,
  refName: string
): Promise<{
  startPointRefName: string;
  upstreamRefName: string | undefined;
  suggestedLocalName: string;
}> {
  const remoteTarget = parseRemoteReferenceTarget(refName);
  if (!remoteTarget || remoteTarget.branchName !== 'HEAD') {
    return {
      startPointRefName: refName,
      upstreamRefName: refName,
      suggestedLocalName: getSuggestedLocalBranchName(refName)
    };
  }

  const refs = await repository.getRefs();
  const symbolicRef = refs.find(
    (ref) => ref.type === RefType.RemoteHead && ref.name === refName
  );
  const candidates = refs.filter(
    (ref) =>
      ref.type === RefType.RemoteHead &&
      ref.name &&
      ref.name.startsWith(`${remoteTarget.remoteName}/`) &&
      ref.name !== refName
  );

  const upstreamRef =
    candidates.find((ref) => ref.commit && symbolicRef?.commit && ref.commit === symbolicRef.commit) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/${repository.state.HEAD?.name}`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/main`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/master`) ??
    candidates[0];

  return {
    startPointRefName: upstreamRef?.name ?? refName,
    upstreamRefName: upstreamRef?.name,
    suggestedLocalName: upstreamRef?.name ? getSuggestedLocalBranchName(upstreamRef.name) : ''
  };
}

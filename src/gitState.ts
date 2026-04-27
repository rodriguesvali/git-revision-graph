import { Branch, Repository, UpstreamRef } from './git';

export function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}

export function isBranchTrackingMatchingUpstream(
  branchName: string,
  upstream: UpstreamRef
): boolean {
  return formatUpstreamLabel(upstream.remote, upstream.name) === formatUpstreamLabel(upstream.remote, branchName);
}

export function isPublishedLocalBranch(branch: Branch): boolean {
  return !!branch.name && !!branch.upstream && isBranchTrackingMatchingUpstream(branch.name, branch.upstream);
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

import { Repository } from './git';

export function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
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

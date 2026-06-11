import { Branch, Ref, Repository } from '../../git';
import {
  formatUpstreamLabel,
  getPublishedLocalBranchNames,
  hasConflictedMerge,
  hasMergeConflicts,
  hasWorkspaceChanges
} from '../../gitState';
import { RevisionGraphViewState } from '../../revisionGraphTypes';

export function buildRevisionGraphRepositoryStateSignature(repository: Repository): string {
  return JSON.stringify({
    head: serializeRefForStateSignature(repository.state.HEAD),
    refs: repository.state.refs
      .map(serializeRefForStateSignature)
      .sort()
  });
}

export function applyRepositoryStatusToRevisionGraphViewState(
  state: RevisionGraphViewState,
  repository: Repository
): RevisionGraphViewState {
  if (state.viewMode !== 'ready' || state.repositoryPath !== repository.rootUri.fsPath) {
    return state;
  }

  const nextState: RevisionGraphViewState = {
    ...state,
    currentHeadName: repository.state.HEAD?.name,
    currentHeadUpstreamName: repository.state.HEAD?.upstream
      ? formatUpstreamLabel(repository.state.HEAD.upstream.remote, repository.state.HEAD.upstream.name)
      : undefined,
    publishedLocalBranchNames: getPublishedLocalBranchNames(repository),
    isWorkspaceDirty: hasWorkspaceChanges(repository),
    hasMergeConflicts: hasMergeConflicts(repository),
    hasConflictedMerge: hasConflictedMerge(repository),
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };

  return areRevisionGraphRepositoryStatusFieldsEqual(state, nextState) ? state : nextState;
}

function serializeRefForStateSignature(ref: Ref | undefined): string {
  if (!ref) {
    return '';
  }

  const branch = ref as Branch;
  const upstream = branch.upstream
    ? `${branch.upstream.remote}:${branch.upstream.name}:${branch.upstream.commit ?? ''}`
    : '';

  return [
    ref.type,
    ref.remote ?? '',
    ref.name ?? '',
    ref.commit ?? '',
    upstream,
    branch.ahead ?? '',
    branch.behind ?? ''
  ].join(':');
}

function areRevisionGraphRepositoryStatusFieldsEqual(
  left: RevisionGraphViewState,
  right: RevisionGraphViewState
): boolean {
  return left.currentHeadName === right.currentHeadName
    && left.currentHeadUpstreamName === right.currentHeadUpstreamName
    && areStringArraysEqual(left.publishedLocalBranchNames, right.publishedLocalBranchNames)
    && left.isWorkspaceDirty === right.isWorkspaceDirty
    && left.hasMergeConflicts === right.hasMergeConflicts
    && left.hasConflictedMerge === right.hasConflictedMerge
    && left.loading === right.loading
    && left.loadingLabel === right.loadingLabel
    && left.errorMessage === right.errorMessage;
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

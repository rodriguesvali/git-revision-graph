import type { RevisionGraphRef } from './model/commitGraphTypes';
import { isFlowGovernedTransition } from './flow';
import {
  RevisionGraphMessage,
  RevisionGraphViewState,
  RevisionLogSource
} from '../revisionGraphTypes';

const REVISION_GRAPH_REF_KINDS = new Set<RevisionGraphRef['kind']>(['head', 'branch', 'remote', 'tag', 'stash']);

export function isRevisionGraphMessageAllowedForState(
  message: RevisionGraphMessage,
  state: RevisionGraphViewState
): boolean {
  switch (message.type) {
    case 'webview-ready':
    case 'load-trace':
    case 'refresh':
    case 'refresh-with-empty-cache':
    case 'fetch-current-repository':
    case 'choose-repository':
    case 'set-projection-options':
    case 'sync-current-head':
      return true;
    case 'set-flow-governance-options':
      return state.viewMode === 'ready' && !!state.flowGovernance;
    case 'validate-release-promotion':
      return state.viewMode === 'ready'
        && state.flowGovernance?.enabled === true
        && hasKnownReferenceName(state, message.refName)
        && state.flowGovernance.references.some((ref) =>
          ref.refName === message.refName && ref.kind === 'release'
        );
    case 'prepare-flow-equalization':
      return state.viewMode === 'ready'
        && state.flowGovernance?.enabled === true
        && hasKnownReferenceName(state, message.releaseRefName)
        && hasKnownReferenceName(state, message.productionRefName)
        && hasKnownFlowKinds(state, message.releaseRefName, 'release', message.productionRefName, 'main');
    case 'copy-flow-pr-context':
    case 'open-flow-pr-url':
      return state.viewMode === 'ready'
        && state.flowGovernance?.enabled === true
        && hasKnownReferenceName(state, message.sourceRefName)
        && hasKnownReferenceName(state, message.targetRefName)
        && isKnownGovernedFlowTransition(state, message.sourceRefName, message.targetRefName);
    case 'pull-current-head':
    case 'push-current-head':
      return state.viewMode === 'ready'
        && !!state.currentHeadName
        && !!state.currentHeadUpstreamName
        && state.publishedLocalBranchNames.includes(state.currentHeadName)
        && state.references.some((ref) => ref.kind === 'head' && ref.name === state.currentHeadName);
    case 'reset-current-workspace':
      return state.viewMode === 'ready'
        && !!state.currentHeadName
        && state.references.some((ref) => ref.kind === 'head' && ref.name === state.currentHeadName);
    case 'stash-save':
      return state.viewMode === 'ready'
        && state.isWorkspaceDirty
        && !state.hasMergeConflicts
        && state.references.some((ref) => ref.kind === 'head');
    case 'stash-apply':
    case 'stash-pop':
    case 'stash-drop':
      return hasKnownReference(state, message.refName, 'stash');
    case 'abort-merge':
      return state.viewMode === 'ready' && state.hasConflictedMerge;
    case 'compare-selected':
      return hasKnownRevision(state, message.baseRevision) && hasKnownRevision(state, message.compareRevision);
    case 'show-log':
      return isKnownRevisionLogSource(state, message.source);
    case 'open-unified-diff':
      return hasKnownRevision(state, message.baseRevision) && hasKnownRevision(state, message.compareRevision);
    case 'compare-with-worktree':
      return hasKnownRevision(state, message.revision);
    case 'copy-commit-hash':
      return hasKnownCommitHash(state, message.commitHash);
    case 'copy-ref-name':
      return hasKnownReference(state, message.refName, message.refKind);
    case 'checkout':
    case 'delete':
      return isRevisionGraphRefKind(message.refKind) && hasKnownReference(state, message.refName, message.refKind);
    case 'create-branch':
    case 'create-tag':
      return message.refKind === 'commit'
        ? hasKnownCommitHash(state, message.revision)
        : hasKnownReference(state, message.revision, message.refKind);
    case 'resolve-remote-tag-state':
      return hasKnownReference(state, message.refName, 'tag');
    case 'push-tag':
    case 'delete-remote-tag':
      return hasKnownReference(state, message.refName, 'tag');
    case 'publish-branch':
      return (message.refKind === 'head' || message.refKind === 'branch')
        && hasKnownReference(state, message.refName, message.refKind);
    case 'merge':
      return hasKnownReferenceName(state, message.refName);
  }
}

export function isRevisionGraphMessageAllowedForCurrentRepository(
  message: RevisionGraphMessage,
  state: RevisionGraphViewState,
  currentRepositoryPath: string | undefined
): boolean {
  if (!isRevisionGraphMessageRepositoryScoped(message)) {
    return true;
  }

  return state.viewMode === 'ready' &&
    !state.loading &&
    !!state.repositoryPath &&
    state.repositoryPath === currentRepositoryPath;
}

function isRevisionGraphMessageRepositoryScoped(message: RevisionGraphMessage): boolean {
  switch (message.type) {
    case 'webview-ready':
    case 'load-trace':
    case 'refresh':
    case 'refresh-with-empty-cache':
    case 'choose-repository':
    case 'set-projection-options':
      return false;
    case 'set-flow-governance-options':
    case 'validate-release-promotion':
    case 'prepare-flow-equalization':
    case 'copy-flow-pr-context':
    case 'open-flow-pr-url':
      return true;
    case 'fetch-current-repository':
    case 'abort-merge':
    case 'sync-current-head':
    case 'pull-current-head':
    case 'push-current-head':
    case 'reset-current-workspace':
    case 'stash-save':
    case 'stash-apply':
    case 'stash-pop':
    case 'stash-drop':
    case 'compare-selected':
    case 'show-log':
    case 'open-unified-diff':
    case 'compare-with-worktree':
    case 'copy-commit-hash':
    case 'copy-ref-name':
    case 'checkout':
    case 'create-branch':
    case 'create-tag':
    case 'resolve-remote-tag-state':
    case 'push-tag':
    case 'delete-remote-tag':
    case 'publish-branch':
    case 'delete':
    case 'merge':
      return true;
  }
}

function hasKnownFlowKinds(
  state: RevisionGraphViewState,
  firstRefName: string,
  firstKind: 'release',
  secondRefName: string,
  secondKind: 'main'
): boolean {
  return state.flowGovernance?.references.some((ref) => ref.refName === firstRefName && ref.kind === firstKind) === true
    && state.flowGovernance.references.some((ref) => ref.refName === secondRefName && ref.kind === secondKind);
}

function isKnownRevisionLogSource(state: RevisionGraphViewState, source: RevisionLogSource): boolean {
  return source.kind === 'target'
    ? hasKnownRevision(state, source.revision)
    : hasKnownRevision(state, source.baseRevision) && hasKnownRevision(state, source.compareRevision);
}

function hasKnownRevision(state: RevisionGraphViewState, revision: string): boolean {
  if (state.viewMode !== 'ready') {
    return false;
  }

  return hasKnownCommitHash(state, revision) || hasKnownReferenceName(state, revision);
}

function hasKnownCommitHash(state: RevisionGraphViewState, hash: string): boolean {
  return state.viewMode === 'ready' && state.scene.nodes.some((node) => node.hash === hash);
}

function hasKnownReferenceName(state: RevisionGraphViewState, refName: string): boolean {
  return state.viewMode === 'ready' && state.references.some((ref) => ref.name === refName);
}

function isKnownGovernedFlowTransition(
  state: RevisionGraphViewState,
  sourceRefName: string,
  targetRefName: string
): boolean {
  const source = state.flowGovernance?.references.find((ref) => ref.refName === sourceRefName);
  const target = state.flowGovernance?.references.find((ref) => ref.refName === targetRefName);
  return !!source && !!target && isFlowGovernedTransition(source.kind, target.kind);
}

function hasKnownReference(
  state: RevisionGraphViewState,
  refName: string,
  refKind: RevisionGraphRef['kind']
): boolean {
  return state.viewMode === 'ready' && state.references.some((ref) => ref.name === refName && ref.kind === refKind);
}

function isRevisionGraphRefKind(value: unknown): value is RevisionGraphRef['kind'] {
  return typeof value === 'string' && REVISION_GRAPH_REF_KINDS.has(value as RevisionGraphRef['kind']);
}

import type { RevisionGraphRef } from './model/commitGraphTypes';
import type { RevisionGraphMergeRefKind, RevisionGraphMessage, RevisionGraphViewState, RevisionLogSource } from '../revisionGraphTypes';
import { FlowBranchKind, isFlowGovernedTransition } from './flow';

type RevisionGraphMessageType = RevisionGraphProtocol.MessageType;
type RevisionGraphMessageOf<Type extends RevisionGraphMessageType> = RevisionGraphProtocol.MessageOf<Type>;
type RevisionGraphMessageAuthorizationPolicy<Type extends RevisionGraphMessageType> = {
  readonly repositoryScoped: boolean;
  readonly allowedWhileLoading?: boolean;
  readonly isAllowed: (message: RevisionGraphMessageOf<Type>, state: RevisionGraphViewState) => boolean;
};
type RevisionGraphMessageAuthorizationPolicyMap = {
  readonly [Type in RevisionGraphMessageType]: RevisionGraphMessageAuthorizationPolicy<Type>;
};

const REVISION_GRAPH_REF_KINDS = new Set<RevisionGraphRef['kind']>(['head', 'branch', 'remote', 'tag', 'stash']);
const REVISION_GRAPH_MERGE_REF_KINDS = new Set<RevisionGraphMergeRefKind>(['branch', 'remote', 'tag']);

const REVISION_GRAPH_MESSAGE_AUTHORIZATION_POLICIES: RevisionGraphMessageAuthorizationPolicyMap = {
  'webview-ready': { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  'load-trace': { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  refresh: { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  'refresh-with-empty-cache': { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  'fetch-current-repository': { repositoryScoped: true, isAllowed: allowRevisionGraphMessage },
  'choose-repository': { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  'abort-merge': { repositoryScoped: true, isAllowed: authorizeAbortMerge },
  'set-projection-options': { repositoryScoped: false, isAllowed: allowRevisionGraphMessage },
  'set-flow-governance-options': { repositoryScoped: true, isAllowed: authorizeFlowGovernanceOptions },
  'start-flow-branch': { repositoryScoped: true, isAllowed: authorizeFlowBranchStart },
  'prepare-flow-equalization': { repositoryScoped: true, isAllowed: authorizeFlowEqualization },
  'copy-flow-pr-context': { repositoryScoped: true, isAllowed: authorizeFlowPullRequestContext },
  'copy-flow-pr-context-field': { repositoryScoped: true, isAllowed: authorizeEligibleFlowPullRequestTarget },
  'open-flow-pr-url': { repositoryScoped: true, isAllowed: authorizeEligibleFlowPullRequestTarget },
  'improve-flow-pr-text': { repositoryScoped: true, isAllowed: authorizeEligibleFlowPullRequestTarget },
  'improve-flow-release-text': { repositoryScoped: true, isAllowed: authorizeFlowReleaseText },
  'cancel-flow-ai-text': { repositoryScoped: true, isAllowed: authorizeFlowAiTextCancellation },
  'compare-selected': { repositoryScoped: true, isAllowed: authorizeCompareSelected },
  'show-log': { repositoryScoped: true, isAllowed: authorizeShowLog },
  'open-unified-diff': { repositoryScoped: true, isAllowed: authorizeOpenUnifiedDiff },
  'compare-with-worktree': { repositoryScoped: true, isAllowed: authorizeCompareWithWorktree },
  'copy-commit-hash': {
    repositoryScoped: true,
    allowedWhileLoading: true,
    isAllowed: authorizeKnownCommit
  },
  'load-commit-short-stat': {
    repositoryScoped: true,
    allowedWhileLoading: true,
    isAllowed: authorizeKnownCommit
  },
  'open-commit-on-remote': {
    repositoryScoped: true,
    allowedWhileLoading: true,
    isAllowed: authorizeKnownCommit
  },
  'copy-ref-name': { repositoryScoped: true, isAllowed: authorizeKnownReference },
  checkout: { repositoryScoped: true, isAllowed: authorizeKnownReference },
  'reset-to-commit': { repositoryScoped: true, isAllowed: isResetToCommitTargetAllowed },
  'create-branch': { repositoryScoped: true, isAllowed: authorizeCreateRef },
  'create-tag': { repositoryScoped: true, isAllowed: authorizeCreateRef },
  'resolve-remote-tag-state': { repositoryScoped: true, isAllowed: authorizeKnownTag },
  'push-tag': { repositoryScoped: true, isAllowed: authorizeKnownTag },
  'delete-remote-tag': { repositoryScoped: true, isAllowed: authorizeKnownTag },
  'publish-branch': { repositoryScoped: true, isAllowed: authorizePublishBranch },
  'sync-current-head': { repositoryScoped: true, isAllowed: allowRevisionGraphMessage },
  'pull-current-head': { repositoryScoped: true, isAllowed: authorizeTrackedCurrentHead },
  'push-current-head': { repositoryScoped: true, isAllowed: authorizeTrackedCurrentHead },
  'stash-save': { repositoryScoped: true, isAllowed: authorizeStashSave },
  'stash-apply': { repositoryScoped: true, isAllowed: authorizeKnownStash },
  'stash-pop': { repositoryScoped: true, isAllowed: authorizeKnownStash },
  'stash-drop': { repositoryScoped: true, isAllowed: authorizeKnownStash },
  delete: { repositoryScoped: true, isAllowed: authorizeKnownReference },
  merge: { repositoryScoped: true, isAllowed: isMergeTargetAllowed }
};

export function isRevisionGraphMessageAllowedForState(
  message: RevisionGraphMessage,
  state: RevisionGraphViewState
): boolean {
  return getRevisionGraphMessageAuthorizationPolicy(message).isAllowed(message, state);
}

export function isRevisionGraphMessageAllowedForCurrentRepository(
  message: RevisionGraphMessage,
  state: RevisionGraphViewState,
  currentRepositoryPath: string | undefined
): boolean {
  const policy = getRevisionGraphMessageAuthorizationPolicy(message);
  if (!policy.repositoryScoped) {
    return true;
  }
  return state.viewMode === 'ready'
    && (!state.loading || policy.allowedWhileLoading === true)
    && !!state.repositoryPath
    && state.repositoryPath === currentRepositoryPath;
}

function getRevisionGraphMessageAuthorizationPolicy<Type extends RevisionGraphMessageType>(
  message: RevisionGraphMessageOf<Type>
): RevisionGraphMessageAuthorizationPolicy<Type> {
  return REVISION_GRAPH_MESSAGE_AUTHORIZATION_POLICIES[message.type];
}

function allowRevisionGraphMessage(): boolean {
  return true;
}

function authorizeFlowGovernanceOptions(
  _message: RevisionGraphMessageOf<'set-flow-governance-options'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready' && !!state.flowGovernance;
}

function authorizeFlowAiTextCancellation(
  _message: RevisionGraphMessageOf<'cancel-flow-ai-text'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready' && state.flowGovernance?.enabled === true;
}

function authorizeFlowBranchStart(
  message: RevisionGraphMessageOf<'start-flow-branch'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && state.flowGovernance?.enabled === true
    && hasKnownReferenceName(state, message.sourceRefName)
    && state.flowGovernance.references.some((ref) =>
      ref.refName === message.sourceRefName && isAllowedFlowStartSourceKind(message.branchKind, ref.kind)
    );
}

function authorizeFlowEqualization(
  message: RevisionGraphMessageOf<'prepare-flow-equalization'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && state.flowGovernance?.enabled === true
    && hasKnownReferenceName(state, message.targetRefName)
    && hasKnownReferenceName(state, message.originRefName)
    && message.targetRefName !== message.originRefName
    && isKnownFlowKind(state, message.targetRefName, 'release', 'feature')
    && isKnownFlowKind(state, message.originRefName, 'main', 'release');
}

function authorizeFlowPullRequestContext(
  message: RevisionGraphMessageOf<'copy-flow-pr-context'>,
  state: RevisionGraphViewState
): boolean {
  return isFlowPullRequestTargetKnown(message, state)
    && isKnownGovernedFlowTransition(state, message.sourceRefName, message.targetRefName);
}

function authorizeEligibleFlowPullRequestTarget(
  message: RevisionGraphMessageOf<'copy-flow-pr-context-field' | 'open-flow-pr-url' | 'improve-flow-pr-text'>,
  state: RevisionGraphViewState
): boolean {
  return isFlowPullRequestTargetKnown(message, state)
    && isKnownGovernedFlowTransition(state, message.sourceRefName, message.targetRefName)
    && state.flowGovernance?.pullRequestTargets?.some((target) =>
      target.sourceRefName === message.sourceRefName
        && target.targetRefName === message.targetRefName
        && target.status === 'ahead'
    ) === true;
}

function isFlowPullRequestTargetKnown(
  message: RevisionGraphMessageOf<'copy-flow-pr-context' | 'copy-flow-pr-context-field' | 'open-flow-pr-url' | 'improve-flow-pr-text'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && state.flowGovernance?.enabled === true
    && hasKnownReferenceName(state, message.sourceRefName)
    && hasKnownReferenceName(state, message.targetRefName);
}

function authorizeFlowReleaseText(
  message: RevisionGraphMessageOf<'improve-flow-release-text'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && state.flowGovernance?.enabled === true
    && state.flowGovernance.references.some((ref) =>
      ref.refName === message.sourceRefName && isAllowedFlowStartSourceKind('release', ref.kind)
    );
}

function authorizeTrackedCurrentHead(
  _message: RevisionGraphMessageOf<'pull-current-head' | 'push-current-head'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && !!state.currentHeadName
    && !!state.currentHeadUpstreamName
    && state.publishedLocalBranchNames.includes(state.currentHeadName)
    && state.references.some((ref) => ref.kind === 'head' && ref.name === state.currentHeadName);
}

function authorizeStashSave(
  _message: RevisionGraphMessageOf<'stash-save'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready'
    && state.isWorkspaceDirty
    && !state.hasMergeConflicts
    && state.references.some((ref) => ref.kind === 'head');
}

function authorizeKnownStash(
  message: RevisionGraphMessageOf<'stash-apply' | 'stash-pop' | 'stash-drop'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownReference(state, message.refName, 'stash');
}

function authorizeAbortMerge(
  _message: RevisionGraphMessageOf<'abort-merge'>,
  state: RevisionGraphViewState
): boolean {
  return state.viewMode === 'ready' && state.hasConflictedMerge;
}

function authorizeCompareSelected(
  message: RevisionGraphMessageOf<'compare-selected'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownRevision(state, message.baseRevision) && hasKnownRevision(state, message.compareRevision);
}

function authorizeShowLog(
  message: RevisionGraphMessageOf<'show-log'>,
  state: RevisionGraphViewState
): boolean {
  return isKnownRevisionLogSource(state, message.source);
}

function authorizeOpenUnifiedDiff(
  message: RevisionGraphMessageOf<'open-unified-diff'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownRevision(state, message.baseRevision) && hasKnownRevision(state, message.compareRevision);
}

function authorizeCompareWithWorktree(
  message: RevisionGraphMessageOf<'compare-with-worktree'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownRevision(state, message.revision);
}

function authorizeKnownCommit(
  message: RevisionGraphMessageOf<'copy-commit-hash' | 'load-commit-short-stat' | 'open-commit-on-remote'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownCommitHash(state, message.commitHash);
}

function authorizeKnownReference(
  message: RevisionGraphMessageOf<'copy-ref-name' | 'checkout' | 'delete'>,
  state: RevisionGraphViewState
): boolean {
  return isRevisionGraphRefKind(message.refKind) && hasKnownReference(state, message.refName, message.refKind);
}

function authorizeCreateRef(
  message: RevisionGraphMessageOf<'create-branch' | 'create-tag'>,
  state: RevisionGraphViewState
): boolean {
  return message.refKind === 'commit'
    ? hasKnownCommitHash(state, message.revision)
    : hasKnownReference(state, message.revision, message.refKind);
}

function authorizeKnownTag(
  message: RevisionGraphMessageOf<'resolve-remote-tag-state' | 'push-tag' | 'delete-remote-tag'>,
  state: RevisionGraphViewState
): boolean {
  return hasKnownReference(state, message.refName, 'tag');
}

function authorizePublishBranch(
  message: RevisionGraphMessageOf<'publish-branch'>,
  state: RevisionGraphViewState
): boolean {
  return (message.refKind === 'head' || message.refKind === 'branch')
    && hasKnownReference(state, message.refName, message.refKind);
}

function isMergeTargetAllowed(
  message: RevisionGraphMessageOf<'merge'>,
  state: RevisionGraphViewState
): boolean {
  return REVISION_GRAPH_MERGE_REF_KINDS.has(message.refKind)
    && message.refName !== state.currentHeadName
    && hasKnownReferenceAtCommit(state, message.refName, message.refKind, message.commitHash);
}

function isAllowedFlowStartSourceKind(
  branchKind: RevisionGraphMessageOf<'start-flow-branch'>['branchKind'],
  sourceKind: NonNullable<RevisionGraphViewState['flowGovernance']>['references'][number]['kind']
): boolean {
  if (branchKind === 'task') {
    return sourceKind === 'feature';
  }
  if (branchKind === 'bug') {
    return sourceKind === 'release' || sourceKind === 'feature';
  }
  return sourceKind === 'main';
}

function isKnownFlowKind(
  state: RevisionGraphViewState,
  refName: string,
  ...kinds: readonly FlowBranchKind[]
): boolean {
  return state.flowGovernance?.references.some((ref) =>
    ref.refName === refName && kinds.includes(ref.kind)
  ) === true;
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
  if (!source || !target || !isFlowGovernedTransition(source.kind, target.kind)) {
    return false;
  }
  return (source.kind !== 'sync' && source.kind !== 'task') || state.flowGovernance?.pullRequestTargets?.some((candidate) =>
    candidate.sourceRefName === sourceRefName && candidate.targetRefName === targetRefName
  ) === true;
}

function hasKnownReference(
  state: RevisionGraphViewState,
  refName: string,
  refKind: RevisionGraphRef['kind']
): boolean {
  return state.viewMode === 'ready' && state.references.some((ref) => ref.name === refName && ref.kind === refKind);
}

function isResetToCommitTargetAllowed(
  message: RevisionGraphMessageOf<'reset-to-commit'>,
  state: RevisionGraphViewState
): boolean {
  if (state.viewMode !== 'ready' || message.targetKind === 'head' || message.targetKind === 'stash') {
    return false;
  }
  if (!hasKnownCommitHash(state, message.commitHash)) {
    return false;
  }
  if (message.targetKind === 'commit') {
    return true;
  }
  if (!message.targetName) {
    return false;
  }
  if (message.targetKind === 'branch' && message.targetName === state.currentHeadName) {
    return false;
  }
  return hasKnownReferenceAtCommit(state, message.targetName, message.targetKind, message.commitHash);
}

function hasKnownReferenceAtCommit(
  state: RevisionGraphViewState,
  refName: string,
  refKind: RevisionGraphRef['kind'],
  commitHash: string
): boolean {
  return state.viewMode === 'ready' && state.references.some((ref) =>
    ref.name === refName && ref.kind === refKind && ref.hash === commitHash
  );
}

function isRevisionGraphRefKind(value: unknown): value is RevisionGraphRef['kind'] {
  return typeof value === 'string' && REVISION_GRAPH_REF_KINDS.has(value as RevisionGraphRef['kind']);
}

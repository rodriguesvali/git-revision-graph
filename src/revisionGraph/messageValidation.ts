import {
  RevisionGraphMessage,
  RevisionGraphViewState,
  RevisionLogSource
} from '../revisionGraphTypes';
import { RevisionGraphProjectionOptions, RevisionGraphRef } from '../revisionGraphData';
import { isBoolean, isBoundedNonEmptyString, isBoundedString, isRecord, isString } from '../webviewMessageValidation';

const REVISION_GRAPH_REF_KINDS = new Set<RevisionGraphRef['kind']>(['head', 'branch', 'remote', 'tag', 'stash']);
const REVISION_GRAPH_TARGET_KINDS = new Set<RevisionGraphRef['kind'] | 'commit'>([
  'head',
  'branch',
  'remote',
  'tag',
  'stash',
  'commit'
]);

export function validateRevisionGraphMessage(message: unknown): RevisionGraphMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  switch (message.type) {
    case 'webview-ready':
    case 'refresh':
    case 'fetch-current-repository':
    case 'open-source-control':
    case 'choose-repository':
    case 'abort-merge':
    case 'sync-current-head':
      return { type: message.type };
    case 'set-projection-options': {
      const options = validateProjectionOptions(message.options);
      return options ? { type: 'set-projection-options', options } : undefined;
    }
    case 'compare-selected':
      return isBoundedNonEmptyString(message.baseRevision)
        && isBoundedString(message.baseLabel)
        && isBoundedNonEmptyString(message.compareRevision)
        && isBoundedString(message.compareLabel)
        ? {
          type: 'compare-selected',
          baseRevision: message.baseRevision,
          baseLabel: message.baseLabel,
          compareRevision: message.compareRevision,
          compareLabel: message.compareLabel
        }
        : undefined;
    case 'show-log': {
      const source = validateRevisionLogSource(message.source);
      return source ? { type: 'show-log', source } : undefined;
    }
    case 'open-unified-diff':
      return isBoundedNonEmptyString(message.baseRevision) && isBoundedNonEmptyString(message.compareRevision)
        ? { type: 'open-unified-diff', baseRevision: message.baseRevision, compareRevision: message.compareRevision }
        : undefined;
    case 'compare-with-worktree':
      return isBoundedNonEmptyString(message.revision) && isBoundedString(message.label)
        ? { type: 'compare-with-worktree', revision: message.revision, label: message.label }
        : undefined;
    case 'copy-commit-hash':
      return isBoundedNonEmptyString(message.commitHash)
        ? { type: 'copy-commit-hash', commitHash: message.commitHash }
        : undefined;
    case 'copy-ref-name':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
        ? { type: 'copy-ref-name', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'checkout':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
        ? { type: 'checkout', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'create-branch':
    case 'create-tag':
      return isBoundedNonEmptyString(message.revision)
        && isBoundedString(message.label)
        && isRevisionGraphTargetKind(message.refKind)
        ? { type: message.type, revision: message.revision, label: message.label, refKind: message.refKind }
        : undefined;
    case 'resolve-remote-tag-state':
      return isBoundedNonEmptyString(message.refName)
        ? { type: 'resolve-remote-tag-state', refName: message.refName }
        : undefined;
    case 'push-tag':
    case 'delete-remote-tag':
    case 'publish-branch':
      return isBoundedNonEmptyString(message.refName)
        && isBoundedString(message.label)
        && isRevisionGraphRefKind(message.refKind)
        ? { type: message.type, refName: message.refName, label: message.label, refKind: message.refKind }
        : undefined;
    case 'reset-current-workspace':
      return isBoolean(message.includeUntracked)
        ? { type: 'reset-current-workspace', includeUntracked: message.includeUntracked }
        : undefined;
    case 'delete':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
        ? { type: 'delete', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'merge':
      return isBoundedNonEmptyString(message.refName)
        ? { type: 'merge', refName: message.refName }
        : undefined;
  }

  return undefined;
}

export function isRevisionGraphMessageAllowedForState(
  message: RevisionGraphMessage,
  state: RevisionGraphViewState
): boolean {
  switch (message.type) {
    case 'webview-ready':
    case 'refresh':
    case 'fetch-current-repository':
    case 'open-source-control':
    case 'choose-repository':
    case 'set-projection-options':
    case 'sync-current-head':
      return true;
    case 'reset-current-workspace':
      return state.viewMode === 'ready'
        && !!state.currentHeadName
        && state.references.some((ref) => ref.kind === 'head' && ref.name === state.currentHeadName);
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

type MutableProjectionOptions = {
  -readonly [Key in keyof RevisionGraphProjectionOptions]?: RevisionGraphProjectionOptions[Key];
};

function validateProjectionOptions(value: unknown): Partial<RevisionGraphProjectionOptions> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const options: MutableProjectionOptions = {};
  if (value.refScope !== undefined) {
    if (
      value.refScope !== 'current' &&
      value.refScope !== 'remoteHead' &&
      value.refScope !== 'local' &&
      value.refScope !== 'all'
    ) {
      return undefined;
    }
    options.refScope = value.refScope;
  }

  for (const key of ['showTags', 'showRemoteBranches', 'showStashes', 'showCurrentBranchDescendants'] as const) {
    if (value[key] !== undefined) {
      if (!isBoolean(value[key])) {
        return undefined;
      }
      options[key] = value[key];
    }
  }

  return options;
}

function validateRevisionLogSource(value: unknown): RevisionLogSource | undefined {
  if (!isRecord(value) || !isString(value.kind)) {
    return undefined;
  }

  if (value.kind === 'target') {
    return isBoundedNonEmptyString(value.revision) && isBoundedString(value.label)
      ? { kind: 'target', revision: value.revision, label: value.label }
      : undefined;
  }

  if (value.kind === 'range') {
    return isBoundedNonEmptyString(value.baseRevision)
      && isBoundedString(value.baseLabel)
      && isBoundedNonEmptyString(value.compareRevision)
      && isBoundedString(value.compareLabel)
      ? {
        kind: 'range',
        baseRevision: value.baseRevision,
        baseLabel: value.baseLabel,
        compareRevision: value.compareRevision,
        compareLabel: value.compareLabel
      }
      : undefined;
  }

  return undefined;
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

function hasKnownReference(
  state: RevisionGraphViewState,
  refName: string,
  refKind: RevisionGraphRef['kind']
): boolean {
  return state.viewMode === 'ready' && state.references.some((ref) => ref.name === refName && ref.kind === refKind);
}

function isRevisionGraphRefKind(value: unknown): value is RevisionGraphRef['kind'] {
  return isString(value) && REVISION_GRAPH_REF_KINDS.has(value as RevisionGraphRef['kind']);
}

function isRevisionGraphTargetKind(value: unknown): value is RevisionGraphRef['kind'] | 'commit' {
  return isString(value) && REVISION_GRAPH_TARGET_KINDS.has(value as RevisionGraphRef['kind'] | 'commit');
}

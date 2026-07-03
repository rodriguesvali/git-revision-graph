import {
  RevisionGraphMessage,
  RevisionLogSource
} from '../revisionGraphTypes';
import type {
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './model/commitGraphTypes';
import { isBoolean, isBoundedNonEmptyString, isBoundedString, isRecord, isString } from '../webviewMessageValidation';
export {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState
} from './messageAuthorization';

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
    case 'refresh-with-empty-cache':
    case 'fetch-current-repository':
    case 'choose-repository':
    case 'abort-merge':
    case 'sync-current-head':
    case 'pull-current-head':
    case 'stash-save':
      return { type: message.type };
    case 'push-current-head':
      return message.mode === 'normal' || message.mode === 'force-with-lease' || message.mode === 'force'
        ? { type: 'push-current-head', mode: message.mode }
        : undefined;
    case 'load-trace':
      return isBoundedNonEmptyString(message.phase, 120)
        && isNonNegativeFiniteNumber(message.durationMs)
        && (message.detail === undefined || isBoundedString(message.detail, 2048))
        && (message.requestId === undefined || isNonNegativeFiniteNumber(message.requestId))
        ? {
          type: 'load-trace',
          phase: message.phase,
          durationMs: Math.round(message.durationMs),
          detail: message.detail,
          requestId: message.requestId === undefined ? undefined : Math.round(message.requestId)
        }
        : undefined;
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
    case 'reset-to-commit': {
      if (
        !isBoundedNonEmptyString(message.commitHash) ||
        !isBoundedString(message.label) ||
        !isRevisionGraphTargetKind(message.targetKind)
      ) {
        return undefined;
      }

      if (message.targetKind === 'commit') {
        return message.targetName === undefined || isBoundedString(message.targetName)
          ? {
            type: 'reset-to-commit',
            commitHash: message.commitHash,
            label: message.label,
            targetKind: message.targetKind,
            targetName: undefined
          }
          : undefined;
      }

      return isBoundedNonEmptyString(message.targetName)
        ? {
          type: 'reset-to-commit',
          commitHash: message.commitHash,
          label: message.label,
          targetKind: message.targetKind,
          targetName: message.targetName
        }
        : undefined;
    }
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
    case 'delete':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
        ? { type: 'delete', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'stash-apply':
    case 'stash-pop':
    case 'stash-drop':
      return isBoundedNonEmptyString(message.refName)
        ? { type: message.type, refName: message.refName }
        : undefined;
    case 'merge':
      return isBoundedNonEmptyString(message.refName)
        ? { type: 'merge', refName: message.refName }
        : undefined;
  }

  return undefined;
}

type MutableProjectionOptions = {
  -readonly [Key in keyof RevisionGraphProjectionOptions]?: RevisionGraphProjectionOptions[Key];
};

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

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

  for (const key of ['showTags', 'showRemoteBranches', 'showStashes', 'showMergeCommits', 'showCurrentBranchDescendants'] as const) {
    if (value[key] !== undefined) {
      if (!isBoolean(value[key])) {
        return undefined;
      }
      options[key] = value[key];
    }
  }

  if (value.revisionRange !== undefined) {
    if (value.revisionRange === null) {
      options.revisionRange = undefined;
    } else {
      const revisionRange = validateRevisionRange(value.revisionRange);
      if (!revisionRange) {
        return undefined;
      }
      options.revisionRange = revisionRange;
    }
  }

  if (value.descendantFocus !== undefined) {
    if (value.descendantFocus === null) {
      options.descendantFocus = undefined;
    } else {
      const descendantFocus = validateDescendantFocus(value.descendantFocus);
      if (!descendantFocus) {
        return undefined;
      }
      options.descendantFocus = descendantFocus;
    }
  }

  if (options.revisionRange && options.descendantFocus) {
    return undefined;
  }

  return options;
}

function validateRevisionRange(value: unknown): RevisionGraphProjectionOptions['revisionRange'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return isBoundedNonEmptyString(value.baseRevision)
    && isBoundedString(value.baseLabel)
    && isBoundedNonEmptyString(value.compareRevision)
    && isBoundedString(value.compareLabel)
    ? {
      baseRevision: value.baseRevision,
      baseLabel: value.baseLabel,
      compareRevision: value.compareRevision,
      compareLabel: value.compareLabel
    }
    : undefined;
}

function validateDescendantFocus(value: unknown): RevisionGraphProjectionOptions['descendantFocus'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return isBoundedNonEmptyString(value.anchorRevision)
    && isBoundedString(value.anchorLabel)
    ? {
      anchorRevision: value.anchorRevision,
      anchorLabel: value.anchorLabel
    }
    : undefined;
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

function isRevisionGraphRefKind(value: unknown): value is RevisionGraphRef['kind'] {
  return isString(value) && REVISION_GRAPH_REF_KINDS.has(value as RevisionGraphRef['kind']);
}

function isRevisionGraphTargetKind(value: unknown): value is RevisionGraphRef['kind'] | 'commit' {
  return isString(value) && REVISION_GRAPH_TARGET_KINDS.has(value as RevisionGraphRef['kind'] | 'commit');
}

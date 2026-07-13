import {
  RevisionGraphMergeRefKind,
  RevisionGraphMessage,
  RevisionLogSource
} from '../revisionGraphTypes';
import type {
  RevisionGraphRef
} from './model/commitGraphTypes';
import { isBoolean, isBoundedNonEmptyString, isBoundedString, isRecord, isString } from '../webviewMessageValidation';
import { FlowGovernanceOptionsUpdate } from './flow';
export {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState
} from './messageAuthorization';

const REVISION_GRAPH_REF_KINDS = new Set<RevisionGraphRef['kind']>(['head', 'branch', 'remote', 'tag', 'stash']);
const REVISION_GRAPH_CHECKOUT_REF_KINDS = new Set<RevisionGraphProtocol.CheckoutRefKind>(['head', 'branch', 'remote']);
const REVISION_GRAPH_PUBLISH_BRANCH_REF_KINDS = new Set<RevisionGraphProtocol.PublishBranchRefKind>(['head', 'branch']);
const REVISION_GRAPH_DELETABLE_REF_KINDS = new Set<RevisionGraphProtocol.DeletableRefKind>(['branch', 'remote', 'tag']);
const REVISION_GRAPH_MERGE_REF_KINDS = new Set<RevisionGraphMergeRefKind>(['branch', 'remote', 'tag']);
const REVISION_GRAPH_TARGET_KINDS = new Set<RevisionGraphRef['kind'] | 'commit'>([
  'head',
  'branch',
  'remote',
  'tag',
  'stash',
  'commit'
]);
const REVISION_GRAPH_MESSAGE_TYPES = {
  'webview-ready': true,
  'load-trace': true,
  'refresh': true,
  'refresh-with-empty-cache': true,
  'fetch-current-repository': true,
  'choose-repository': true,
  'abort-merge': true,
  'set-projection-options': true,
  'set-flow-governance-options': true,
  'start-flow-branch': true,
  'prepare-flow-equalization': true,
  'copy-flow-pr-context': true,
  'copy-flow-pr-context-field': true,
  'open-flow-pr-url': true,
  'compare-selected': true,
  'show-log': true,
  'open-unified-diff': true,
  'compare-with-worktree': true,
  'copy-commit-hash': true,
  'load-commit-short-stat': true,
  'open-commit-on-github': true,
  'copy-ref-name': true,
  checkout: true,
  'reset-to-commit': true,
  'create-branch': true,
  'create-tag': true,
  'resolve-remote-tag-state': true,
  'push-tag': true,
  'delete-remote-tag': true,
  'publish-branch': true,
  'sync-current-head': true,
  'pull-current-head': true,
  'push-current-head': true,
  'stash-save': true,
  'stash-apply': true,
  'stash-pop': true,
  'stash-drop': true,
  delete: true,
  merge: true
} as const satisfies Readonly<Record<RevisionGraphProtocol.MessageType, true>>;

export function validateRevisionGraphMessage(message: unknown): RevisionGraphMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  if (!isRevisionGraphMessageType(message.type)) {
    return undefined;
  }
  const messageType = message.type;

  switch (messageType) {
    case 'webview-ready':
    case 'refresh':
    case 'refresh-with-empty-cache':
    case 'fetch-current-repository':
    case 'choose-repository':
    case 'abort-merge':
    case 'sync-current-head':
    case 'pull-current-head':
    case 'stash-save':
      return { type: messageType };
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
    case 'set-flow-governance-options': {
      const options = validateFlowGovernanceOptions(message.options);
      return options ? { type: 'set-flow-governance-options', options } : undefined;
    }
    case 'start-flow-branch':
      return isBoundedNonEmptyString(message.sourceRefName)
        && (message.branchKind === 'release'
          || message.branchKind === 'feature'
          || message.branchKind === 'task'
          || message.branchKind === 'bug'
          || message.branchKind === 'hotfix')
        && isBoundedNonEmptyString(message.name, 240)
        && isBoundedNonEmptyString(message.description, 2048)
        && message.description.trim().length > 0
        ? {
          type: 'start-flow-branch',
          branchKind: message.branchKind,
          sourceRefName: message.sourceRefName,
          name: message.name,
          description: message.description
        }
        : undefined;
    case 'prepare-flow-equalization':
      return isBoundedNonEmptyString(message.targetRefName)
        && isBoundedNonEmptyString(message.originRefName)
        && isBoundedNonEmptyString(message.description, 2048)
        ? {
          type: 'prepare-flow-equalization',
          targetRefName: message.targetRefName,
          originRefName: message.originRefName,
          description: message.description
        }
        : undefined;
    case 'copy-flow-pr-context':
    case 'open-flow-pr-url':
      return isBoundedNonEmptyString(message.sourceRefName)
        && isBoundedNonEmptyString(message.targetRefName)
        ? {
          type: messageType,
          sourceRefName: message.sourceRefName,
          targetRefName: message.targetRefName
        }
        : undefined;
    case 'copy-flow-pr-context-field':
      return isBoundedNonEmptyString(message.sourceRefName)
        && isBoundedNonEmptyString(message.targetRefName)
        && (message.field === 'title' || message.field === 'description')
        ? {
          type: 'copy-flow-pr-context-field',
          sourceRefName: message.sourceRefName,
          targetRefName: message.targetRefName,
          field: message.field
        }
        : undefined;
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
    case 'load-commit-short-stat':
    case 'open-commit-on-github':
      return isBoundedNonEmptyString(message.commitHash)
        ? { type: messageType, commitHash: message.commitHash }
        : undefined;
    case 'copy-ref-name':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
        ? { type: 'copy-ref-name', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'checkout':
      return validateCheckoutMessage(message);
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
        ? { type: messageType, revision: message.revision, label: message.label, refKind: message.refKind }
        : undefined;
    case 'resolve-remote-tag-state':
      return isBoundedNonEmptyString(message.refName)
        ? { type: 'resolve-remote-tag-state', refName: message.refName }
        : undefined;
    case 'push-tag':
    case 'delete-remote-tag':
      return isBoundedNonEmptyString(message.refName)
        && isBoundedString(message.label)
        && message.refKind === 'tag'
        ? { type: messageType, refName: message.refName, label: message.label, refKind: message.refKind }
        : undefined;
    case 'publish-branch':
      return validatePublishBranchMessage(message);
    case 'delete':
      return isBoundedNonEmptyString(message.refName) && isRevisionGraphDeletableRefKind(message.refKind)
        ? { type: 'delete', refName: message.refName, refKind: message.refKind }
        : undefined;
    case 'stash-apply':
    case 'stash-pop':
    case 'stash-drop':
      return isBoundedNonEmptyString(message.refName)
        ? { type: messageType, refName: message.refName }
        : undefined;
    case 'merge':
      return isBoundedNonEmptyString(message.refName)
        && isRevisionGraphMergeRefKind(message.refKind)
        && isBoundedNonEmptyString(message.commitHash)
        ? {
          type: 'merge',
          refName: message.refName,
          refKind: message.refKind,
          commitHash: message.commitHash
        }
        : undefined;
  }

  const unhandledMessageType: never = messageType;
  return unhandledMessageType;
}

function isRevisionGraphMessageType(value: string): value is RevisionGraphProtocol.MessageType {
  return Object.prototype.hasOwnProperty.call(REVISION_GRAPH_MESSAGE_TYPES, value);
}

function validateCheckoutMessage(
  message: Readonly<Record<string, unknown>>
): RevisionGraphProtocol.MessageOf<'checkout'> | undefined {
  return isBoundedNonEmptyString(message.refName) && isRevisionGraphCheckoutRefKind(message.refKind)
    ? { type: 'checkout', refName: message.refName, refKind: message.refKind }
    : undefined;
}

function validatePublishBranchMessage(
  message: Readonly<Record<string, unknown>>
): RevisionGraphProtocol.MessageOf<'publish-branch'> | undefined {
  return isBoundedNonEmptyString(message.refName)
    && isBoundedString(message.label)
    && isRevisionGraphPublishBranchRefKind(message.refKind)
    ? {
      type: 'publish-branch',
      refName: message.refName,
      label: message.label,
      refKind: message.refKind
    }
    : undefined;
}

function validateFlowGovernanceOptions(value: unknown): FlowGovernanceOptionsUpdate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const options: MutableFlowGovernanceOptionsUpdate = {};
  if (value.enabled !== undefined) {
    if (!isBoolean(value.enabled)) {
      return undefined;
    }
    options.enabled = value.enabled;
  }

  for (const key of Object.keys(value)) {
    if (key !== 'enabled') {
      return undefined;
    }
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

type MutableFlowGovernanceOptionsUpdate = {
  -readonly [Key in keyof FlowGovernanceOptionsUpdate]?: FlowGovernanceOptionsUpdate[Key];
};

type MutableProjectionOptions = {
  -readonly [Key in keyof RevisionGraphProtocol.ProjectionOptionsUpdate]?: RevisionGraphProtocol.ProjectionOptionsUpdate[Key];
};

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateProjectionOptions(value: unknown): RevisionGraphProtocol.ProjectionOptionsUpdate | undefined {
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

function validateRevisionRange(value: unknown): RevisionGraphProtocol.RevisionRange | undefined {
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

function validateDescendantFocus(value: unknown): RevisionGraphProtocol.DescendantFocus | undefined {
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

function isRevisionGraphCheckoutRefKind(value: unknown): value is RevisionGraphProtocol.CheckoutRefKind {
  return isString(value)
    && REVISION_GRAPH_CHECKOUT_REF_KINDS.has(value as RevisionGraphProtocol.CheckoutRefKind);
}

function isRevisionGraphPublishBranchRefKind(
  value: unknown
): value is RevisionGraphProtocol.PublishBranchRefKind {
  return isString(value)
    && REVISION_GRAPH_PUBLISH_BRANCH_REF_KINDS.has(value as RevisionGraphProtocol.PublishBranchRefKind);
}

function isRevisionGraphDeletableRefKind(value: unknown): value is RevisionGraphProtocol.DeletableRefKind {
  return isString(value)
    && REVISION_GRAPH_DELETABLE_REF_KINDS.has(value as RevisionGraphProtocol.DeletableRefKind);
}

function isRevisionGraphMergeRefKind(value: unknown): value is RevisionGraphMergeRefKind {
  return isString(value) && REVISION_GRAPH_MERGE_REF_KINDS.has(value as RevisionGraphMergeRefKind);
}

function isRevisionGraphTargetKind(value: unknown): value is RevisionGraphRef['kind'] | 'commit' {
  return isString(value) && REVISION_GRAPH_TARGET_KINDS.has(value as RevisionGraphRef['kind'] | 'commit');
}

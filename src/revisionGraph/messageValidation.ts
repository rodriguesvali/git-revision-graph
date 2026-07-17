import type { RevisionGraphMergeRefKind, RevisionGraphMessage, RevisionLogSource } from '../revisionGraphTypes';
import type { RevisionGraphRef } from './model/commitGraphTypes';
import { isFlowStartBranchKind } from './flow';
import { isBoundedNonEmptyString, isBoundedString, isRecord, isString } from '../webviewMessageValidation';
import { validateFlowGovernanceOptions, validateProjectionOptions } from './messageValidationOptions';
import {
  validateCancelFlowAiTextMessage,
  validateImproveFlowPullRequestTextMessage,
  validateImproveFlowReleaseTextMessage
} from './messageValidationFlowAi';

export {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState
} from './messageAuthorization';

type RawRevisionGraphMessage = Readonly<Record<string, unknown>>;
type RevisionGraphMessageValidator<Type extends RevisionGraphProtocol.MessageType> = (
  message: RawRevisionGraphMessage
) => RevisionGraphProtocol.MessageOf<Type> | undefined;
type RevisionGraphMessageValidatorMap = {
  readonly [Type in RevisionGraphProtocol.MessageType]: RevisionGraphMessageValidator<Type>;
};

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

const REVISION_GRAPH_MESSAGE_VALIDATORS: RevisionGraphMessageValidatorMap = {
  'webview-ready': () => ({ type: 'webview-ready' }),
  'load-trace': validateLoadTraceMessage,
  refresh: () => ({ type: 'refresh' }),
  'refresh-with-empty-cache': () => ({ type: 'refresh-with-empty-cache' }),
  'fetch-current-repository': () => ({ type: 'fetch-current-repository' }),
  'choose-repository': () => ({ type: 'choose-repository' }),
  'abort-merge': () => ({ type: 'abort-merge' }),
  'set-projection-options': validateSetProjectionOptionsMessage,
  'set-flow-governance-options': validateSetFlowGovernanceOptionsMessage,
  'start-flow-branch': validateStartFlowBranchMessage,
  'prepare-flow-equalization': validatePrepareFlowEqualizationMessage,
  'copy-flow-pr-context': validateCopyFlowPullRequestContextMessage,
  'copy-flow-pr-context-field': validateCopyFlowPullRequestContextFieldMessage,
  'open-flow-pr-url': validateOpenFlowPullRequestUrlMessage,
  'improve-flow-pr-text': validateImproveFlowPullRequestTextMessage,
  'improve-flow-release-text': validateImproveFlowReleaseTextMessage,
  'cancel-flow-ai-text': validateCancelFlowAiTextMessage,
  'compare-selected': validateCompareSelectedMessage,
  'show-log': validateShowLogMessage,
  'open-unified-diff': validateOpenUnifiedDiffMessage,
  'compare-with-worktree': validateCompareWithWorktreeMessage,
  'copy-commit-hash': validateCopyCommitHashMessage,
  'load-commit-short-stat': validateLoadCommitShortStatMessage,
  'open-commit-on-remote': validateOpenCommitOnRemoteMessage,
  'copy-ref-name': validateCopyRefNameMessage,
  checkout: validateCheckoutMessage,
  'reset-to-commit': validateResetToCommitMessage,
  'create-branch': validateCreateBranchMessage,
  'create-tag': validateCreateTagMessage,
  'resolve-remote-tag-state': validateResolveRemoteTagStateMessage,
  'push-tag': validatePushTagMessage,
  'delete-remote-tag': validateDeleteRemoteTagMessage,
  'publish-branch': validatePublishBranchMessage,
  'sync-current-head': () => ({ type: 'sync-current-head' }),
  'pull-current-head': () => ({ type: 'pull-current-head' }),
  'push-current-head': validatePushCurrentHeadMessage,
  'stash-save': () => ({ type: 'stash-save' }),
  'stash-apply': validateStashApplyMessage,
  'stash-pop': validateStashPopMessage,
  'stash-drop': validateStashDropMessage,
  delete: validateDeleteMessage,
  merge: validateMergeMessage
};

export function validateRevisionGraphMessage(message: unknown): RevisionGraphMessage | undefined {
  if (!isRecord(message) || !isString(message.type) || !isRevisionGraphMessageType(message.type)) {
    return undefined;
  }
  return REVISION_GRAPH_MESSAGE_VALIDATORS[message.type](message);
}

function isRevisionGraphMessageType(value: string): value is RevisionGraphProtocol.MessageType {
  return Object.prototype.hasOwnProperty.call(REVISION_GRAPH_MESSAGE_VALIDATORS, value);
}

function validateLoadTraceMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'load-trace'> | undefined {
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
}

function validateSetProjectionOptionsMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'set-projection-options'> | undefined {
  const options = validateProjectionOptions(message.options);
  return options ? { type: 'set-projection-options', options } : undefined;
}

function validateSetFlowGovernanceOptionsMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'set-flow-governance-options'> | undefined {
  const options = validateFlowGovernanceOptions(message.options);
  return options ? { type: 'set-flow-governance-options', options } : undefined;
}

function validateStartFlowBranchMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'start-flow-branch'> | undefined {
  if (!isBoundedNonEmptyString(message.sourceRefName) || !isFlowStartBranchKind(message.branchKind)) {
    return undefined;
  }
  if (message.phase === 'prepare') {
    return {
      type: 'start-flow-branch',
      phase: 'prepare',
      branchKind: message.branchKind,
      sourceRefName: message.sourceRefName
    };
  }
  return isBoundedNonEmptyString(message.name, 240)
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
}

function validatePrepareFlowEqualizationMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'prepare-flow-equalization'> | undefined {
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
}

function validateCopyFlowPullRequestContextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'copy-flow-pr-context'> | undefined {
  return validateFlowPullRequestTarget(message)
    ? { type: 'copy-flow-pr-context', sourceRefName: message.sourceRefName, targetRefName: message.targetRefName }
    : undefined;
}

function validateOpenFlowPullRequestUrlMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'open-flow-pr-url'> | undefined {
  return validateFlowPullRequestTarget(message)
    && isBoundedNonEmptyString(message.title, 240)
    && isBoundedNonEmptyString(message.description, 2048)
    ? {
      type: 'open-flow-pr-url',
      sourceRefName: message.sourceRefName,
      targetRefName: message.targetRefName,
      title: message.title,
      description: message.description
    }
    : undefined;
}

function validateCopyFlowPullRequestContextFieldMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'copy-flow-pr-context-field'> | undefined {
  const field = message.field;
  return validateFlowPullRequestTarget(message)
    && (field === 'title' || field === 'description')
    && isBoundedNonEmptyString(message.text, field === 'title' ? 240 : 2048)
    ? {
      type: 'copy-flow-pr-context-field',
      sourceRefName: message.sourceRefName,
      targetRefName: message.targetRefName,
      field,
      text: message.text
    }
    : undefined;
}

function validateFlowPullRequestTarget(
  message: RawRevisionGraphMessage
): message is RawRevisionGraphMessage & { readonly sourceRefName: string; readonly targetRefName: string } {
  return isBoundedNonEmptyString(message.sourceRefName) && isBoundedNonEmptyString(message.targetRefName);
}

function validateCompareSelectedMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'compare-selected'> | undefined {
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
}

function validateShowLogMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'show-log'> | undefined {
  const source = validateRevisionLogSource(message.source);
  return source ? { type: 'show-log', source } : undefined;
}

function validateOpenUnifiedDiffMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'open-unified-diff'> | undefined {
  return isBoundedNonEmptyString(message.baseRevision) && isBoundedNonEmptyString(message.compareRevision)
    ? { type: 'open-unified-diff', baseRevision: message.baseRevision, compareRevision: message.compareRevision }
    : undefined;
}

function validateCompareWithWorktreeMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'compare-with-worktree'> | undefined {
  return isBoundedNonEmptyString(message.revision) && isBoundedString(message.label)
    ? { type: 'compare-with-worktree', revision: message.revision, label: message.label }
    : undefined;
}

function validateCopyCommitHashMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'copy-commit-hash'> | undefined {
  return isBoundedNonEmptyString(message.commitHash)
    ? { type: 'copy-commit-hash', commitHash: message.commitHash }
    : undefined;
}

function validateLoadCommitShortStatMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'load-commit-short-stat'> | undefined {
  return isBoundedNonEmptyString(message.commitHash)
    ? { type: 'load-commit-short-stat', commitHash: message.commitHash }
    : undefined;
}

function validateOpenCommitOnRemoteMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'open-commit-on-remote'> | undefined {
  return isBoundedNonEmptyString(message.commitHash)
    ? { type: 'open-commit-on-remote', commitHash: message.commitHash }
    : undefined;
}

function validateCopyRefNameMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'copy-ref-name'> | undefined {
  return isBoundedNonEmptyString(message.refName) && isRevisionGraphRefKind(message.refKind)
    ? { type: 'copy-ref-name', refName: message.refName, refKind: message.refKind }
    : undefined;
}

function validateCheckoutMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'checkout'> | undefined {
  return isBoundedNonEmptyString(message.refName) && isRevisionGraphCheckoutRefKind(message.refKind)
    ? { type: 'checkout', refName: message.refName, refKind: message.refKind }
    : undefined;
}

function validateResetToCommitMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'reset-to-commit'> | undefined {
  if (
    !isBoundedNonEmptyString(message.commitHash)
    || !isBoundedString(message.label)
    || !isRevisionGraphTargetKind(message.targetKind)
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

function validateCreateBranchMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'create-branch'> | undefined {
  return validateCreateRefMessage(message)
    ? { type: 'create-branch', revision: message.revision, label: message.label, refKind: message.refKind }
    : undefined;
}

function validateCreateTagMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'create-tag'> | undefined {
  return validateCreateRefMessage(message)
    ? { type: 'create-tag', revision: message.revision, label: message.label, refKind: message.refKind }
    : undefined;
}

function validateCreateRefMessage(
  message: RawRevisionGraphMessage
): message is RawRevisionGraphMessage & {
  readonly revision: string;
  readonly label: string;
  readonly refKind: RevisionGraphProtocol.TargetKind;
} {
  return isBoundedNonEmptyString(message.revision)
    && isBoundedString(message.label)
    && isRevisionGraphTargetKind(message.refKind);
}

function validateResolveRemoteTagStateMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'resolve-remote-tag-state'> | undefined {
  return isBoundedNonEmptyString(message.refName)
    ? { type: 'resolve-remote-tag-state', refName: message.refName }
    : undefined;
}

function validatePushTagMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'push-tag'> | undefined {
  return validateTagActionMessage(message)
    ? { type: 'push-tag', refName: message.refName, label: message.label, refKind: 'tag' }
    : undefined;
}

function validateDeleteRemoteTagMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'delete-remote-tag'> | undefined {
  return validateTagActionMessage(message)
    ? { type: 'delete-remote-tag', refName: message.refName, label: message.label, refKind: 'tag' }
    : undefined;
}

function validateTagActionMessage(
  message: RawRevisionGraphMessage
): message is RawRevisionGraphMessage & { readonly refName: string; readonly label: string; readonly refKind: 'tag' } {
  return isBoundedNonEmptyString(message.refName) && isBoundedString(message.label) && message.refKind === 'tag';
}

function validatePublishBranchMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'publish-branch'> | undefined {
  return isBoundedNonEmptyString(message.refName)
    && isBoundedString(message.label)
    && isRevisionGraphPublishBranchRefKind(message.refKind)
    ? { type: 'publish-branch', refName: message.refName, label: message.label, refKind: message.refKind }
    : undefined;
}

function validatePushCurrentHeadMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'push-current-head'> | undefined {
  return message.mode === 'normal' || message.mode === 'force-with-lease' || message.mode === 'force'
    ? { type: 'push-current-head', mode: message.mode }
    : undefined;
}

function validateStashApplyMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'stash-apply'> | undefined {
  return isBoundedNonEmptyString(message.refName) ? { type: 'stash-apply', refName: message.refName } : undefined;
}

function validateStashPopMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'stash-pop'> | undefined {
  return isBoundedNonEmptyString(message.refName) ? { type: 'stash-pop', refName: message.refName } : undefined;
}

function validateStashDropMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'stash-drop'> | undefined {
  return isBoundedNonEmptyString(message.refName) ? { type: 'stash-drop', refName: message.refName } : undefined;
}

function validateDeleteMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'delete'> | undefined {
  return isBoundedNonEmptyString(message.refName) && isRevisionGraphDeletableRefKind(message.refKind)
    ? { type: 'delete', refName: message.refName, refKind: message.refKind }
    : undefined;
}

function validateMergeMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'merge'> | undefined {
  return isBoundedNonEmptyString(message.refName)
    && isRevisionGraphMergeRefKind(message.refKind)
    && isBoundedNonEmptyString(message.commitHash)
    ? { type: 'merge', refName: message.refName, refKind: message.refKind, commitHash: message.commitHash }
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

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRevisionGraphRefKind(value: unknown): value is RevisionGraphRef['kind'] {
  return isString(value) && REVISION_GRAPH_REF_KINDS.has(value as RevisionGraphRef['kind']);
}

function isRevisionGraphCheckoutRefKind(value: unknown): value is RevisionGraphProtocol.CheckoutRefKind {
  return isString(value) && REVISION_GRAPH_CHECKOUT_REF_KINDS.has(value as RevisionGraphProtocol.CheckoutRefKind);
}

function isRevisionGraphPublishBranchRefKind(value: unknown): value is RevisionGraphProtocol.PublishBranchRefKind {
  return isString(value)
    && REVISION_GRAPH_PUBLISH_BRANCH_REF_KINDS.has(value as RevisionGraphProtocol.PublishBranchRefKind);
}

function isRevisionGraphDeletableRefKind(value: unknown): value is RevisionGraphProtocol.DeletableRefKind {
  return isString(value) && REVISION_GRAPH_DELETABLE_REF_KINDS.has(value as RevisionGraphProtocol.DeletableRefKind);
}

function isRevisionGraphMergeRefKind(value: unknown): value is RevisionGraphMergeRefKind {
  return isString(value) && REVISION_GRAPH_MERGE_REF_KINDS.has(value as RevisionGraphMergeRefKind);
}

function isRevisionGraphTargetKind(value: unknown): value is RevisionGraphProtocol.TargetKind {
  return isString(value) && REVISION_GRAPH_TARGET_KINDS.has(value as RevisionGraphProtocol.TargetKind);
}

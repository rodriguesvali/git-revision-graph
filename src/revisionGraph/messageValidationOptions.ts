import type { FlowGovernanceOptionsUpdate } from './flow';
import { isBoolean, isBoundedNonEmptyString, isBoundedString, isRecord } from '../webviewMessageValidation';

type RawOptions = Readonly<Record<string, unknown>>;
type MutableProjectionOptions = {
  -readonly [Key in keyof RevisionGraphProtocol.ProjectionOptionsUpdate]?: RevisionGraphProtocol.ProjectionOptionsUpdate[Key];
};

export function validateFlowGovernanceOptions(value: unknown): FlowGovernanceOptionsUpdate | undefined {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== 'enabled')) {
    return undefined;
  }
  return isBoolean(value.enabled) ? { enabled: value.enabled } : undefined;
}

export function validateProjectionOptions(value: unknown): RevisionGraphProtocol.ProjectionOptionsUpdate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const options: MutableProjectionOptions = {};
  return validateProjectionRefScope(value, options)
    && validateProjectionBooleanOptions(value, options)
    && validateProjectionRevisionRange(value, options)
    && validateProjectionDescendantFocus(value, options)
    && !(options.revisionRange && options.descendantFocus)
    ? options
    : undefined;
}

function validateProjectionRefScope(value: RawOptions, options: MutableProjectionOptions): boolean {
  if (value.refScope === undefined) {
    return true;
  }
  if (value.refScope !== 'current' && value.refScope !== 'remoteHead' && value.refScope !== 'local' && value.refScope !== 'all') {
    return false;
  }
  options.refScope = value.refScope;
  return true;
}

function validateProjectionBooleanOptions(value: RawOptions, options: MutableProjectionOptions): boolean {
  for (const key of ['showTags', 'showRemoteBranches', 'showStashes', 'showMergeCommits', 'showCurrentBranchDescendants'] as const) {
    if (value[key] !== undefined) {
      if (!isBoolean(value[key])) {
        return false;
      }
      options[key] = value[key];
    }
  }
  return true;
}

function validateProjectionRevisionRange(value: RawOptions, options: MutableProjectionOptions): boolean {
  if (value.revisionRange === undefined) {
    return true;
  }
  if (value.revisionRange === null) {
    options.revisionRange = undefined;
    return true;
  }
  const revisionRange = validateRevisionRange(value.revisionRange);
  if (!revisionRange) {
    return false;
  }
  options.revisionRange = revisionRange;
  return true;
}

function validateProjectionDescendantFocus(value: RawOptions, options: MutableProjectionOptions): boolean {
  if (value.descendantFocus === undefined) {
    return true;
  }
  if (value.descendantFocus === null) {
    options.descendantFocus = undefined;
    return true;
  }
  const descendantFocus = validateDescendantFocus(value.descendantFocus);
  if (!descendantFocus) {
    return false;
  }
  options.descendantFocus = descendantFocus;
  return true;
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
  return isBoundedNonEmptyString(value.anchorRevision) && isBoundedString(value.anchorLabel)
    ? { anchorRevision: value.anchorRevision, anchorLabel: value.anchorLabel }
    : undefined;
}

import { isBoundedNonEmptyString } from '../webviewMessageValidation';

type RawRevisionGraphMessage = Readonly<Record<string, unknown>>;

export function validateImproveFlowBranchTextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'improve-flow-branch-text'> | undefined {
  return isNonNegativeFiniteNumber(message.requestId)
    && isBoundedNonEmptyString(message.sourceRefName)
    && isFlowAiBranchKind(message.branchKind)
    && isBoundedNonEmptyString(message.branchName, 240)
    && isBoundedNonEmptyString(message.text, 2048)
    ? {
      type: 'improve-flow-branch-text',
      requestId: Math.round(message.requestId),
      sourceRefName: message.sourceRefName,
      branchKind: message.branchKind,
      branchName: message.branchName,
      text: message.text
    }
    : undefined;
}

export function validateCancelFlowAiTextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'cancel-flow-ai-text'> | undefined {
  return isNonNegativeFiniteNumber(message.requestId)
    && isFlowAiBranchKind(message.surface)
    && message.field === 'description'
    ? {
      type: 'cancel-flow-ai-text',
      requestId: Math.round(message.requestId),
      surface: message.surface,
      field: message.field
    }
    : undefined;
}

function isFlowAiBranchKind(value: unknown): value is 'release' | 'feature' | 'task' | 'bug' | 'hotfix' {
  return value === 'release' || value === 'feature' || value === 'task'
    || value === 'bug' || value === 'hotfix';
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

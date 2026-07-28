import { isBoundedNonEmptyString } from '../webviewMessageValidation';

type RawRevisionGraphMessage = Readonly<Record<string, unknown>>;

export function validateImproveFlowPullRequestTextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'improve-flow-pr-text'> | undefined {
  const field = message.field;
  return isNonNegativeFiniteNumber(message.requestId)
    && isBoundedNonEmptyString(message.sourceRefName)
    && isBoundedNonEmptyString(message.targetRefName)
    && (field === 'title' || field === 'description')
    && isBoundedNonEmptyString(message.title, 240)
    && isBoundedNonEmptyString(message.description, 2048)
    ? {
      type: 'improve-flow-pr-text',
      requestId: Math.round(message.requestId),
      sourceRefName: message.sourceRefName,
      targetRefName: message.targetRefName,
      field,
      title: message.title,
      description: message.description
    }
    : undefined;
}

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
    && (message.surface === 'pull-request' || isFlowAiBranchKind(message.surface))
    && (message.field === 'title' || message.field === 'description')
    && !(message.surface !== 'pull-request' && message.field !== 'description')
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

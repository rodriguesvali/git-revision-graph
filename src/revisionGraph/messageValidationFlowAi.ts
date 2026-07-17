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

export function validateImproveFlowReleaseTextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'improve-flow-release-text'> | undefined {
  return isNonNegativeFiniteNumber(message.requestId)
    && isBoundedNonEmptyString(message.sourceRefName)
    && isBoundedNonEmptyString(message.releaseName, 240)
    && isBoundedNonEmptyString(message.text, 2048)
    ? {
      type: 'improve-flow-release-text',
      requestId: Math.round(message.requestId),
      sourceRefName: message.sourceRefName,
      releaseName: message.releaseName,
      text: message.text
    }
    : undefined;
}

export function validateCancelFlowAiTextMessage(
  message: RawRevisionGraphMessage
): RevisionGraphProtocol.MessageOf<'cancel-flow-ai-text'> | undefined {
  return isNonNegativeFiniteNumber(message.requestId)
    && (message.surface === 'pull-request' || message.surface === 'release')
    && (message.field === 'title' || message.field === 'description')
    && !(message.surface === 'release' && message.field !== 'description')
    ? {
      type: 'cancel-flow-ai-text',
      requestId: Math.round(message.requestId),
      surface: message.surface,
      field: message.field
    }
    : undefined;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

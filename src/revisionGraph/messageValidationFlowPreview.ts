import { isBoundedNonEmptyString, isBoundedString, isRecord } from '../webviewMessageValidation';
import { isFlowStartBranchKind } from './flow/flowTypes';

export function validateFlowFormPreviewRequest(
  message: Readonly<Record<string, unknown>>
): RevisionGraphProtocol.MessageOf<'preview-flow-form'> | undefined {
  if (!Number.isSafeInteger(message.requestId) || (message.requestId as number) < 1
    || !isBoundedNonEmptyString(message.repositoryPath)) return undefined;
  const action = validatePreviewAction(message.action);
  return action ? { type: 'preview-flow-form', requestId: message.requestId as number, repositoryPath: message.repositoryPath, action } : undefined;
}

function validatePreviewAction(value: unknown): RevisionGraphProtocol.FlowFormPreviewAction | undefined {
  if (!isRecord(value)) return undefined;
  if (value.type === 'start-flow-branch' && isFlowStartBranchKind(value.branchKind)
    && isBoundedNonEmptyString(value.sourceRefName) && isBoundedString(value.name, 240)) {
    return { type: value.type, branchKind: value.branchKind, sourceRefName: value.sourceRefName, name: value.name };
  }
  if (value.type === 'prepare-flow-equalization' && isBoundedNonEmptyString(value.targetRefName)
    && isBoundedNonEmptyString(value.originRefName)) {
    return { type: value.type, targetRefName: value.targetRefName, originRefName: value.originRefName };
  }
  return undefined;
}

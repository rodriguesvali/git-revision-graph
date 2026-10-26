import { getFileOpenSide, type FileOpenMessageType } from '../fileOpen';
import type { WebviewClientMessage } from '../webviewMessageOrigin';
import { isBoundedNonEmptyString, isBoundedStringArray, isRecord, isString } from '../webviewMessageValidation';

export type CompareResultsWebviewMessage =
  | { readonly type: FileOpenMessageType; readonly itemId: string }
  | { readonly type: 'ready' }
  | { readonly type: 'base'; readonly itemId: string }
  | { readonly type: 'copyFileName'; readonly itemIds: readonly string[] }
  | { readonly type: 'copyFullPath'; readonly itemIds: readonly string[] }
  | { readonly type: 'copyBriefing' }
  | { readonly type: 'cancelBriefing' }
  | { readonly type: 'generateBriefing' }
  | { readonly type: 'unifiedDiff' }
  | { readonly type: 'worktree'; readonly itemId: string }
  | { readonly type: 'revert'; readonly itemId: string };

export type CompareResultsClientMessage = WebviewClientMessage<CompareResultsWebviewMessage>;

export function validateCompareResultsWebviewMessage(message: unknown): CompareResultsWebviewMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  if (getFileOpenSide(message.type)) return validateItemMessage(message, message.type as FileOpenMessageType);

  switch (message.type) {
    case 'ready':
      return { type: 'ready' };
    case 'copyBriefing':
      return { type: 'copyBriefing' };
    case 'cancelBriefing':
      return { type: 'cancelBriefing' };
    case 'generateBriefing':
      return { type: 'generateBriefing' };
    case 'unifiedDiff':
      return { type: 'unifiedDiff' };
    case 'base':
    case 'worktree':
    case 'revert':
      return validateItemMessage(message, message.type);
    case 'copyFileName':
    case 'copyFullPath':
      return isBoundedStringArray(message.itemIds)
        ? { type: message.type, itemIds: message.itemIds }
        : undefined;
  }

  return undefined;
}

function validateItemMessage(message: Record<string, unknown>, type: FileOpenMessageType | 'base' | 'worktree' | 'revert'): CompareResultsWebviewMessage | undefined {
  return isBoundedNonEmptyString(message.itemId) ? { type, itemId: message.itemId } : undefined;
}

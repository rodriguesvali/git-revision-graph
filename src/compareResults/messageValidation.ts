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
  | { readonly type: 'savePatch' }
  | { readonly type: 'worktree'; readonly itemId: string }
  | { readonly type: 'revert'; readonly itemId: string };

export type CompareResultsClientMessage = WebviewClientMessage<CompareResultsWebviewMessage>;

type SimpleCompareMessage = Extract<CompareResultsWebviewMessage, { readonly type: 'ready' | 'copyBriefing' | 'cancelBriefing' | 'generateBriefing' | 'unifiedDiff' | 'savePatch' }>;
function isSimpleCompareMessage(type: string): type is SimpleCompareMessage['type'] {
  return ['ready', 'copyBriefing', 'cancelBriefing', 'generateBriefing', 'unifiedDiff', 'savePatch'].includes(type);
}

export function validateCompareResultsWebviewMessage(message: unknown): CompareResultsWebviewMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  if (getFileOpenSide(message.type)) return validateItemMessage(message, message.type as FileOpenMessageType);
  if (isSimpleCompareMessage(message.type)) return { type: message.type };

  switch (message.type) {
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

import { isBoundedNonEmptyString, isBoundedStringArray, isRecord, isString } from '../webviewMessageValidation';

export type CompareResultsWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'base'; readonly itemId: string }
  | { readonly type: 'copyFileName'; readonly itemIds: readonly string[] }
  | { readonly type: 'copyFullPath'; readonly itemIds: readonly string[] }
  | { readonly type: 'copyBriefing' }
  | { readonly type: 'generateBriefing' }
  | { readonly type: 'unifiedDiff' }
  | { readonly type: 'worktree'; readonly itemId: string }
  | { readonly type: 'revert'; readonly itemId: string };

export function validateCompareResultsWebviewMessage(message: unknown): CompareResultsWebviewMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  switch (message.type) {
    case 'ready':
      return { type: 'ready' };
    case 'copyBriefing':
      return { type: 'copyBriefing' };
    case 'generateBriefing':
      return { type: 'generateBriefing' };
    case 'unifiedDiff':
      return { type: 'unifiedDiff' };
    case 'base':
    case 'worktree':
    case 'revert':
      return isBoundedNonEmptyString(message.itemId)
        ? { type: message.type, itemId: message.itemId }
        : undefined;
    case 'copyFileName':
    case 'copyFullPath':
      return isBoundedStringArray(message.itemIds)
        ? { type: message.type, itemIds: message.itemIds }
        : undefined;
  }

  return undefined;
}

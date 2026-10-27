import { getFileOpenSide, type FileOpenSide } from '../fileOpen';
import { isAuthorizedWebviewMessage, type WebviewMessageOrigin } from '../webviewMessageOrigin';
import { validateCompareResultsWebviewMessage } from './messageValidation';

type MaybePromise<T> = T | Promise<T>;

export interface CompareResultsMessageHandlers {
  readonly openFileVersion: (itemId: string, side: FileOpenSide) => MaybePromise<void>;
  readonly ready: () => MaybePromise<void>;
  readonly base: (itemId: string) => MaybePromise<void>;
  readonly copyFileName: (itemIds: readonly string[]) => MaybePromise<void>;
  readonly copyFullPath: (itemIds: readonly string[]) => MaybePromise<void>;
  readonly copyBriefing: () => MaybePromise<void>;
  readonly cancelBriefing: () => MaybePromise<void>;
  readonly generateBriefing: () => MaybePromise<void>;
  readonly unifiedDiff: () => MaybePromise<void>;
  readonly savePatch: () => MaybePromise<void>;
  readonly worktree: (itemId: string) => MaybePromise<void>;
  readonly revert: (itemId: string) => MaybePromise<void>;
}

export async function dispatchCompareResultsWebviewMessage(
  rawMessage: unknown,
  handlers: CompareResultsMessageHandlers,
  origin?: WebviewMessageOrigin
): Promise<boolean> {
  const message = validateCompareResultsWebviewMessage(rawMessage);
  if (!isAuthorizedWebviewMessage(message, rawMessage, origin)) {
    return false;
  }
  const side = getFileOpenSide(message.type);
  if (side && 'itemId' in message) {
    await handlers.openFileVersion(message.itemId, side);
    return true;
  }

  switch (message.type) {
    case 'ready':
      await handlers.ready();
      return true;
    case 'base':
      await handlers.base(message.itemId);
      return true;
    case 'copyFileName':
      await handlers.copyFileName(message.itemIds);
      return true;
    case 'copyFullPath':
      await handlers.copyFullPath(message.itemIds);
      return true;
    case 'copyBriefing':
      await handlers.copyBriefing();
      return true;
    case 'cancelBriefing':
      await handlers.cancelBriefing();
      return true;
    case 'generateBriefing':
      await handlers.generateBriefing();
      return true;
    case 'unifiedDiff':
      await handlers.unifiedDiff();
      return true;
    case 'savePatch':
      await handlers.savePatch();
      return true;
    case 'worktree':
      await handlers.worktree(message.itemId);
      return true;
    case 'revert':
      await handlers.revert(message.itemId);
      return true;
  }
  return false;
}

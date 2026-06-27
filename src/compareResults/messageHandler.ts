import { validateCompareResultsWebviewMessage } from './messageValidation';

type MaybePromise<T> = T | Promise<T>;

export interface CompareResultsMessageHandlers {
  readonly ready: () => MaybePromise<void>;
  readonly base: (itemId: string) => MaybePromise<void>;
  readonly copyFileName: (itemIds: readonly string[]) => MaybePromise<void>;
  readonly copyFullPath: (itemIds: readonly string[]) => MaybePromise<void>;
  readonly unifiedDiff: () => MaybePromise<void>;
  readonly worktree: (itemId: string) => MaybePromise<void>;
  readonly revert: (itemId: string) => MaybePromise<void>;
}

export async function dispatchCompareResultsWebviewMessage(
  rawMessage: unknown,
  handlers: CompareResultsMessageHandlers
): Promise<boolean> {
  const message = validateCompareResultsWebviewMessage(rawMessage);
  if (!message) {
    return false;
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
    case 'unifiedDiff':
      await handlers.unifiedDiff();
      return true;
    case 'worktree':
      await handlers.worktree(message.itemId);
      return true;
    case 'revert':
      await handlers.revert(message.itemId);
      return true;
  }
}

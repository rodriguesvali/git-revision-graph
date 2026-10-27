import { getFileOpenSide, type FileOpenSide } from '../fileOpen';
import { isAuthorizedWebviewMessage, type WebviewMessageOrigin } from '../webviewMessageOrigin';
import {
  validateShowLogWebviewMessage,
  type ShowLogWebviewMessage
} from './messageValidation';

type MaybePromise<T> = T | Promise<T>;

export interface ShowLogMessageHandlers {
  readonly openFileVersion: (commitHash: string, changeId: string, side: FileOpenSide) => MaybePromise<void>;
  readonly startBugBisect?: (commitHash: string, sourceToken: string) => MaybePromise<void>;
  readonly ready: () => MaybePromise<void>;
  readonly toggleCommit: (commitHash: string) => MaybePromise<void>;
  readonly toggleShowAllBranches: (value: boolean) => MaybePromise<void>;
  readonly setFilterText: (value: string, sourceToken: string) => MaybePromise<void>;
  readonly setCommitFileFilter: (commitHash: string, value: string, sourceToken: string) => MaybePromise<void>;
  readonly loadMore: () => MaybePromise<void>;
  readonly openFile: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly compareWithWorktree: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly revertFileToCommit: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyFileName: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyFullPath: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyCommitHash: (commitHash: string) => MaybePromise<void>;
  readonly copyReferenceName: (commitHash: string, refName: string) => MaybePromise<void>;
  readonly openCommitOnRemote: (commitHash: string) => MaybePromise<void>;
  readonly openCommitDetails: (commitHash: string) => MaybePromise<void>;
  readonly formatPatch: (commitHashes: readonly string[]) => MaybePromise<void>;
  readonly compareCommits: (baseCommitHash: string, compareCommitHash: string) => MaybePromise<void>;
  readonly compareCommitWithWorktree: (commitHash: string) => MaybePromise<void>;
  readonly cherryPickCommits: (commitHashes: readonly string[]) => MaybePromise<void>;
  readonly checkoutCommit: (commitHash: string) => MaybePromise<void>;
  readonly createTagFromCommit: (commitHash: string) => MaybePromise<void>;
  readonly resetToCommit: (commitHash: string) => MaybePromise<void>;
}

export async function dispatchShowLogWebviewMessage(
  rawMessage: unknown,
  handlers: ShowLogMessageHandlers,
  origin?: WebviewMessageOrigin
): Promise<boolean> {
  const message = validateShowLogWebviewMessage(rawMessage);
  if (!isAuthorizedWebviewMessage(message, rawMessage, origin)) {
    return false;
  }

  const commitAction = dispatchShowLogCommitAction(message, handlers);
  if (commitAction !== false) {
    await commitAction;
    return true;
  }

  switch (message.type) {
    case 'ready':
      await handlers.ready();
      return true;
    case 'toggleShowAllBranches':
      await handlers.toggleShowAllBranches(message.value);
      return true;
    case 'setFilterText':
      await handlers.setFilterText(message.value, message.sourceToken);
      return true;
    case 'loadMore':
      await handlers.loadMore();
      return true;
    case 'openFile':
      await handlers.openFile(message.commitHash, message.changeId);
      return true;
    case 'compareWithWorktree':
      await handlers.compareWithWorktree(message.commitHash, message.changeId);
      return true;
    case 'revertFileToCommit':
      await handlers.revertFileToCommit(message.commitHash, message.changeId);
      return true;
    case 'copyFileName':
      await handlers.copyFileName(message.commitHash, message.changeId);
      return true;
    case 'copyFullPath':
      await handlers.copyFullPath(message.commitHash, message.changeId);
      return true;
    case 'copyReferenceName':
      await handlers.copyReferenceName(message.commitHash, message.refName);
      return true;
    case 'compareCommits':
      await handlers.compareCommits(message.baseCommitHash, message.compareCommitHash);
      return true;
    case 'cherryPickCommits':
      await handlers.cherryPickCommits(message.commitHashes);
      return true;
  }

  return false;
}

function dispatchShowLogCommitAction(
  message: ShowLogWebviewMessage,
  handlers: ShowLogMessageHandlers
): MaybePromise<void> | false {
  switch (message.type) {
    case 'openWorktreeFile':
    case 'openSourceFile':
    case 'openTargetFile':
      return handlers.openFileVersion(message.commitHash, message.changeId, getFileOpenSide(message.type)!);
    case 'startBugBisect':
      return handlers.startBugBisect?.(message.commitHash, message.sourceToken);
    case 'setCommitFileFilter':
      return handlers.setCommitFileFilter(message.commitHash, message.value, message.sourceToken);
    case 'toggleCommit':
      return handlers.toggleCommit(message.commitHash);
    case 'openCommitOnRemote':
      return handlers.openCommitOnRemote(message.commitHash);
    case 'openCommitDetails':
      return handlers.openCommitDetails(message.commitHash);
    case 'formatPatch':
      return handlers.formatPatch(message.commitHashes);
    case 'compareCommitWithWorktree':
      return handlers.compareCommitWithWorktree(message.commitHash);
    case 'copyCommitHash':
      return handlers.copyCommitHash(message.commitHash);
    case 'checkoutCommit':
      return handlers.checkoutCommit(message.commitHash);
    case 'createTagFromCommit':
      return handlers.createTagFromCommit(message.commitHash);
    case 'resetToCommit':
      return handlers.resetToCommit(message.commitHash);
    default:
      return false;
  }
}

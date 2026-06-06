import { validateShowLogWebviewMessage } from './messageValidation';

type MaybePromise<T> = T | Promise<T>;

export interface ShowLogMessageHandlers {
  readonly ready: () => MaybePromise<void>;
  readonly toggleCommit: (commitHash: string) => MaybePromise<void>;
  readonly toggleShowAllBranches: (value: boolean) => MaybePromise<void>;
  readonly setFilterText: (value: string, sourceToken: string) => MaybePromise<void>;
  readonly loadMore: () => MaybePromise<void>;
  readonly openFile: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly compareWithWorktree: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyFileName: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyFullPath: (commitHash: string, changeId: string) => MaybePromise<void>;
  readonly copyCommitHash: (commitHash: string) => MaybePromise<void>;
  readonly copyReferenceName: (commitHash: string, refName: string) => MaybePromise<void>;
  readonly openCommitOnGitHub: (commitHash: string) => MaybePromise<void>;
  readonly openCommitDetails: (commitHash: string) => MaybePromise<void>;
  readonly compareCommits: (baseCommitHash: string, compareCommitHash: string) => MaybePromise<void>;
  readonly compareCommitWithWorktree: (commitHash: string) => MaybePromise<void>;
  readonly resetToCommit: (commitHash: string) => MaybePromise<void>;
}

export async function dispatchShowLogWebviewMessage(
  rawMessage: unknown,
  handlers: ShowLogMessageHandlers
): Promise<boolean> {
  const message = validateShowLogWebviewMessage(rawMessage);
  if (!message) {
    return false;
  }

  switch (message.type) {
    case 'ready':
      await handlers.ready();
      return true;
    case 'toggleCommit':
      await handlers.toggleCommit(message.commitHash);
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
    case 'copyFileName':
      await handlers.copyFileName(message.commitHash, message.changeId);
      return true;
    case 'copyFullPath':
      await handlers.copyFullPath(message.commitHash, message.changeId);
      return true;
    case 'copyCommitHash':
      await handlers.copyCommitHash(message.commitHash);
      return true;
    case 'copyReferenceName':
      await handlers.copyReferenceName(message.commitHash, message.refName);
      return true;
    case 'openCommitOnGitHub':
      await handlers.openCommitOnGitHub(message.commitHash);
      return true;
    case 'openCommitDetails':
      await handlers.openCommitDetails(message.commitHash);
      return true;
    case 'compareCommits':
      await handlers.compareCommits(message.baseCommitHash, message.compareCommitHash);
      return true;
    case 'compareCommitWithWorktree':
      await handlers.compareCommitWithWorktree(message.commitHash);
      return true;
    case 'resetToCommit':
      await handlers.resetToCommit(message.commitHash);
      return true;
  }
}

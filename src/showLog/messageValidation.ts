import { isBoolean, isBoundedNonEmptyString, isBoundedString, isRecord, isString } from '../webviewMessageValidation';

export type ShowLogWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'toggleShowAllBranches'; readonly value: boolean }
  | { readonly type: 'setFilterText'; readonly value: string }
  | { readonly type: 'toggleCommit'; readonly commitHash: string }
  | { readonly type: 'compareCommits'; readonly baseCommitHash: string; readonly compareCommitHash: string }
  | { readonly type: 'compareCommitWithWorktree'; readonly commitHash: string }
  | { readonly type: 'loadMore' }
  | { readonly type: 'openFile'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'compareWithWorktree'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'copyFileName'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'copyFullPath'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'openCommitDetails'; readonly commitHash: string };

export function validateShowLogWebviewMessage(message: unknown): ShowLogWebviewMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  switch (message.type) {
    case 'ready':
    case 'loadMore':
      return { type: message.type };
    case 'toggleShowAllBranches':
      return isBoolean(message.value)
        ? { type: 'toggleShowAllBranches', value: message.value }
        : undefined;
    case 'setFilterText':
      return isBoundedString(message.value)
        ? { type: 'setFilterText', value: message.value }
        : undefined;
    case 'toggleCommit':
    case 'compareCommitWithWorktree':
    case 'openCommitDetails':
      return isBoundedNonEmptyString(message.commitHash)
        ? { type: message.type, commitHash: message.commitHash }
        : undefined;
    case 'compareCommits':
      return isBoundedNonEmptyString(message.baseCommitHash) && isBoundedNonEmptyString(message.compareCommitHash)
        ? { type: 'compareCommits', baseCommitHash: message.baseCommitHash, compareCommitHash: message.compareCommitHash }
        : undefined;
    case 'openFile':
    case 'compareWithWorktree':
    case 'copyFileName':
    case 'copyFullPath':
      return isBoundedNonEmptyString(message.commitHash) && isBoundedNonEmptyString(message.changeId)
        ? { type: message.type, commitHash: message.commitHash, changeId: message.changeId }
        : undefined;
  }

  return undefined;
}

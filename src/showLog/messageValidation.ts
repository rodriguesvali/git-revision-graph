import { isBoolean, isBoundedNonEmptyString, isBoundedString, isBoundedStringArray, isRecord, isString } from '../webviewMessageValidation';

export type ShowLogWebviewMessage =
  | { readonly type: 'startBugBisect'; readonly commitHash: string; readonly sourceToken: string }
  | { readonly type: 'ready' }
  | { readonly type: 'toggleShowAllBranches'; readonly value: boolean }
  | { readonly type: 'setFilterText'; readonly value: string; readonly sourceToken: string }
  | { readonly type: 'setCommitFileFilter'; readonly commitHash: string; readonly value: string; readonly sourceToken: string }
  | { readonly type: 'toggleCommit'; readonly commitHash: string }
  | { readonly type: 'compareCommits'; readonly baseCommitHash: string; readonly compareCommitHash: string }
  | { readonly type: 'compareCommitWithWorktree'; readonly commitHash: string }
  | { readonly type: 'loadMore' }
  | { readonly type: 'openFile'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'compareWithWorktree'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'revertFileToCommit'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'copyFileName'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'copyFullPath'; readonly commitHash: string; readonly changeId: string }
  | { readonly type: 'openCommitDetails'; readonly commitHash: string }
  | { readonly type: 'copyCommitHash'; readonly commitHash: string }
  | { readonly type: 'copyReferenceName'; readonly commitHash: string; readonly refName: string }
  | { readonly type: 'cherryPickCommits'; readonly commitHashes: readonly string[] }
  | { readonly type: 'openCommitOnRemote'; readonly commitHash: string }
  | { readonly type: 'checkoutCommit'; readonly commitHash: string }
  | { readonly type: 'createTagFromCommit'; readonly commitHash: string }
  | { readonly type: 'resetToCommit'; readonly commitHash: string };

type ShowLogCommitHashMessageType =
  | 'startBugBisect'
  | 'toggleCommit'
  | 'compareCommitWithWorktree'
  | 'openCommitDetails'
  | 'copyCommitHash'
  | 'openCommitOnRemote'
  | 'checkoutCommit'
  | 'createTagFromCommit'
  | 'resetToCommit';

const SHOW_LOG_COMMIT_HASH_MESSAGE_TYPES: readonly ShowLogCommitHashMessageType[] = [
  'startBugBisect',
  'toggleCommit',
  'compareCommitWithWorktree',
  'openCommitDetails',
  'copyCommitHash',
  'openCommitOnRemote',
  'checkoutCommit',
  'createTagFromCommit',
  'resetToCommit'
];

export function validateShowLogWebviewMessage(message: unknown): ShowLogWebviewMessage | undefined {
  if (!isRecord(message) || !isString(message.type)) {
    return undefined;
  }

  if (isShowLogCommitHashMessageType(message.type)) {
    return validateCommitHashMessage(message, message.type);
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
      return validateFilterTextMessage(message);
    case 'setCommitFileFilter':
      return validateCommitFileFilterMessage(message);
    case 'compareCommits':
      return isBoundedNonEmptyString(message.baseCommitHash) && isBoundedNonEmptyString(message.compareCommitHash)
        ? { type: 'compareCommits', baseCommitHash: message.baseCommitHash, compareCommitHash: message.compareCommitHash }
        : undefined;
    case 'copyReferenceName':
      return isBoundedNonEmptyString(message.commitHash) && isBoundedNonEmptyString(message.refName)
        ? { type: 'copyReferenceName', commitHash: message.commitHash, refName: message.refName }
        : undefined;
    case 'cherryPickCommits':
      return isBoundedStringArray(message.commitHashes)
        && message.commitHashes.length > 0
        && message.commitHashes.every((hash) => hash.trim().length > 0)
        ? { type: 'cherryPickCommits', commitHashes: message.commitHashes }
        : undefined;
    case 'openFile':
    case 'compareWithWorktree':
    case 'revertFileToCommit':
    case 'copyFileName':
    case 'copyFullPath':
      return isBoundedNonEmptyString(message.commitHash) && isBoundedNonEmptyString(message.changeId)
        ? { type: message.type, commitHash: message.commitHash, changeId: message.changeId }
        : undefined;
  }

  return undefined;
}

function validateCommitHashMessage(message: Record<string, unknown>, type: ShowLogCommitHashMessageType): ShowLogWebviewMessage | undefined {
  if (!isBoundedNonEmptyString(message.commitHash)) return undefined;
  if (type === 'startBugBisect') {
    return isBoundedNonEmptyString(message.sourceToken)
      ? { type, commitHash: message.commitHash, sourceToken: message.sourceToken } : undefined;
  }
  return { type, commitHash: message.commitHash };
}

function validateFilterTextMessage(message: Record<string, unknown>): ShowLogWebviewMessage | undefined {
  return isBoundedString(message.value) && isBoundedString(message.sourceToken)
    ? { type: 'setFilterText', value: message.value, sourceToken: message.sourceToken }
    : undefined;
}

function validateCommitFileFilterMessage(message: Record<string, unknown>): ShowLogWebviewMessage | undefined {
  return isBoundedNonEmptyString(message.commitHash) && isBoundedString(message.value) && isBoundedString(message.sourceToken)
    ? { type: 'setCommitFileFilter', commitHash: message.commitHash, value: message.value, sourceToken: message.sourceToken }
    : undefined;
}

function isShowLogCommitHashMessageType(value: string): value is ShowLogCommitHashMessageType {
  return SHOW_LOG_COMMIT_HASH_MESSAGE_TYPES.includes(value as ShowLogCommitHashMessageType);
}

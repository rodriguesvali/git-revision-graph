import * as path from 'node:path';

import { Change, Status } from './git';

export interface ChangeQuickPickItem {
  readonly label: string;
  readonly description: string;
  readonly detail: string;
  readonly change: Change;
}

export function getTargetUri(change: Change): Change['uri'] {
  return change.renameUri ?? change.uri;
}

export function getLeftUri(change: Change): Change['uri'] {
  return change.originalUri;
}

export function getRightUri(change: Change): Change['uri'] {
  return change.renameUri ?? change.uri;
}

export function getRepositoryRelativeChangePath(
  repositoryRootPath: string,
  change: Change
): string {
  const fileUri = getTargetUri(change);
  const relativePath = path.relative(repositoryRootPath, fileUri.fsPath);
  if (
    relativePath &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  ) {
    return relativePath;
  }

  return fileUri.fsPath;
}

export function isAddition(status: Status): boolean {
  return status === Status.INDEX_ADDED || status === Status.UNTRACKED;
}

export function isDeletion(status: Status): boolean {
  return status === Status.INDEX_DELETED || status === Status.DELETED;
}

export function getStatusLabel(status: Status): string {
  switch (status) {
    case Status.INDEX_ADDED:
    case Status.UNTRACKED:
      return 'Added';
    case Status.INDEX_DELETED:
    case Status.DELETED:
      return 'Deleted';
    case Status.INDEX_RENAMED:
    case Status.INTENT_TO_RENAME:
      return 'Renamed';
    case Status.BOTH_MODIFIED:
    case Status.MODIFIED:
    case Status.INDEX_MODIFIED:
      return 'Modified';
    default:
      return 'Changed';
  }
}

export function toChangeQuickPickItems(
  changes: Change[],
  formatPath: (fsPath: string) => string
): ChangeQuickPickItem[] {
  return changes
    .map<ChangeQuickPickItem>((change) => {
      const fileUri = getTargetUri(change);
      return {
        label: path.basename(fileUri.fsPath),
        description: formatPath(fileUri.fsPath),
        detail: getStatusLabel(change.status),
        change
      };
    })
    .sort((left, right) => left.description.localeCompare(right.description));
}

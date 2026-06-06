import * as path from 'node:path';

import type { Change, Repository } from '../git';
import type { RevisionLogEntry } from '../revisionGraphTypes';

export const SHOW_LOG_EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export interface ShowLogFileDiffServices {
  openChangeDiffBetweenRefs(
    repository: Repository,
    change: Change,
    leftRef: string,
    rightRef: string
  ): Promise<void>;
  openChangeDiffWithWorktree(
    repository: Repository,
    change: Change,
    ref: string
  ): Promise<void>;
}

export async function openShowLogFileChange(
  repository: Repository,
  entries: readonly RevisionLogEntry[],
  commitHash: string,
  change: Change,
  services?: ShowLogFileDiffServices
): Promise<void> {
  const diffServices = services ?? await getDefaultShowLogFileDiffServices();
  await diffServices.openChangeDiffBetweenRefs(
    repository,
    change,
    getShowLogFileChangeParentHash(entries, commitHash),
    commitHash
  );
}

export async function compareShowLogFileChangeWithWorktree(
  repository: Repository,
  commitHash: string,
  change: Change,
  services?: ShowLogFileDiffServices
): Promise<void> {
  const diffServices = services ?? await getDefaultShowLogFileDiffServices();
  await diffServices.openChangeDiffWithWorktree(repository, change, commitHash);
}

export function getShowLogFileChangeParentHash(
  entries: readonly RevisionLogEntry[],
  commitHash: string
): string {
  return entries.find((entry) => entry.hash === commitHash)?.parentHashes[0] ?? SHOW_LOG_EMPTY_TREE_HASH;
}

export function getShowLogChangeFileName(change: Change): string {
  return path.basename(getShowLogChangeTargetPath(change));
}

export function getShowLogChangeFullPath(change: Change): string {
  return getShowLogChangeTargetPath(change);
}

function getShowLogChangeTargetPath(change: Change): string {
  return change.renameUri?.fsPath ?? change.uri.fsPath;
}

async function getDefaultShowLogFileDiffServices(): Promise<ShowLogFileDiffServices> {
  const services = await import('../workbenchRefActionServices');
  return {
    openChangeDiffBetweenRefs: services.openChangeDiffBetweenRefs,
    openChangeDiffWithWorktree: services.openChangeDiffWithWorktree
  };
}

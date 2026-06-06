import * as path from 'node:path';

import type { Change, Repository } from '../git';
import type { CompareResultItem } from '../compareResultsShared';

export interface CompareResultsItemDiffServices {
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

export async function openCompareResultItem(
  item: CompareResultItem,
  services?: CompareResultsItemDiffServices
): Promise<void> {
  const diffServices = services ?? await getDefaultCompareResultsItemDiffServices();
  if (item.leftRef && item.rightRef) {
    await diffServices.openChangeDiffBetweenRefs(item.repository, item.change, item.leftRef, item.rightRef);
    return;
  }

  if (item.worktreeRef) {
    await diffServices.openChangeDiffWithWorktree(item.repository, item.change, item.worktreeRef);
  }
}

export async function compareCompareResultItemWithWorktree(
  item: CompareResultItem,
  services?: CompareResultsItemDiffServices
): Promise<void> {
  const ref = getCompareResultItemWorktreeComparisonRef(item);
  if (!ref) {
    return;
  }

  const diffServices = services ?? await getDefaultCompareResultsItemDiffServices();
  await diffServices.openChangeDiffWithWorktree(item.repository, item.change, ref);
}

export function getCompareResultItemFileName(item: CompareResultItem): string {
  return path.basename(getCompareResultItemTargetPath(item));
}

export function getCompareResultItemFullPath(item: CompareResultItem): string {
  return getCompareResultItemTargetPath(item);
}

export function getCompareResultItemFileNameList(items: readonly CompareResultItem[]): string {
  return items.map((item) => getCompareResultItemFileName(item)).join('\n');
}

export function getCompareResultItemFullPathList(items: readonly CompareResultItem[]): string {
  return items.map((item) => getCompareResultItemFullPath(item)).join('\n');
}

export function getCompareResultItemWorktreeComparisonRef(
  item: CompareResultItem
): string | undefined {
  return item.worktreeRef ?? item.rightRef ?? item.leftRef;
}

function getCompareResultItemTargetPath(item: CompareResultItem): string {
  return item.change.renameUri?.fsPath ?? item.change.uri.fsPath;
}

async function getDefaultCompareResultsItemDiffServices(): Promise<CompareResultsItemDiffServices> {
  const services = await import('../workbenchRefActionServices');
  return {
    openChangeDiffBetweenRefs: services.openChangeDiffBetweenRefs,
    openChangeDiffWithWorktree: services.openChangeDiffWithWorktree
  };
}

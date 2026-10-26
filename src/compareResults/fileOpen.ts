import { getLeftUri, getRightUri, getTargetUri, isAddition, isDeletion } from '../changePresentation';
import type { CompareResultItem, CompareResultsState } from '../compareResultsShared';
import { fileOpenAction, openFileTarget, type FileOpenSide, type FileOpenTarget, type FileOpenServices } from '../fileOpen';

export function getCompareResultFileTarget(item: CompareResultItem, side: FileOpenSide): FileOpenTarget | undefined {
  if (side === 'worktree') return { uri: getTargetUri(item.change) };
  if (side === 'source') {
    const revision = item.worktreeRef ?? item.leftRef;
    return revision && !isAddition(item.change.status) ? { uri: getLeftUri(item.change), revision } : undefined;
  }
  return item.rightRef && !isDeletion(item.change.status)
    ? { uri: getRightUri(item.change), revision: item.rightRef } : undefined;
}

export async function openCompareResultFile(
  getState: () => CompareResultsState,
  item: CompareResultItem | undefined,
  side: FileOpenSide,
  services?: FileOpenServices
): Promise<void> {
  const state = getState();
  if (!item) return;
  await openFileTarget(item.repository, getCompareResultFileTarget(item, side), () => getState() === state, services);
}

export function getCompareResultFileActions(item: CompareResultItem, sourceLabel: string, targetLabel: string) {
  const actions = [fileOpenAction('openWorktreeFile', 'Open File', getCompareResultFileTarget(item, 'worktree')),
    fileOpenAction('openSourceFile', `Open ${item.worktreeRef ? '' : 'Source '}File at ${sourceLabel} (read-only)`, getCompareResultFileTarget(item, 'source'))];
  if (!item.worktreeRef) actions.push(fileOpenAction('openTargetFile', `Open Target File at ${targetLabel} (read-only)`, getCompareResultFileTarget(item, 'target')));
  return actions;
}

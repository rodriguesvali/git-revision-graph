import { getLeftUri, getRightUri, getTargetUri, isAddition, isDeletion } from '../changePresentation';
import { fileOpenAction, openFileTarget, type FileOpenSide, type FileOpenTarget, type FileOpenServices } from '../fileOpen';
import type { Change } from '../git';
import type { RevisionLogEntry } from '../revisionGraphTypes';
import type { ShowLogState } from '../showLogShared';
import { findShowLogChange, getVisibleShowLogRepository } from './stateLookup';

export function getShowLogFileTarget(
  change: Change, entry: RevisionLogEntry, side: FileOpenSide
): FileOpenTarget | undefined {
  if (side === 'worktree') return { uri: getTargetUri(change) };
  if (side === 'source') {
    return entry.parentHashes[0] && !isAddition(change.status)
      ? { uri: getLeftUri(change), revision: entry.parentHashes[0] } : undefined;
  }
  return !isDeletion(change.status) ? { uri: getRightUri(change), revision: entry.hash } : undefined;
}

export async function openShowLogFile(
  getState: () => ShowLogState, commitHash: string, changeId: string, side: FileOpenSide,
  services?: FileOpenServices
): Promise<void> {
  const state = getState();
  if (state.loading || state.expandedCommitHash !== commitHash || !changeId.startsWith(`${commitHash}:`)) return;
  const change = findShowLogChange(state, commitHash, changeId);
  const repository = getVisibleShowLogRepository(state);
  const entry = state.entries.find(candidate => candidate.hash === commitHash);
  if (!change || !repository || !entry) return;
  await openFileTarget(repository, getShowLogFileTarget(change, entry, side), () => getState() === state, services);
}

export function getShowLogFileActions(change: Change, entry: RevisionLogEntry) {
  const actions = [fileOpenAction('openWorktreeFile', 'Open File', getShowLogFileTarget(change, entry, 'worktree')),
    fileOpenAction('openTargetFile', `Open File at ${entry.shortHash} (read-only)`, getShowLogFileTarget(change, entry, 'target'))];
  if (isDeletion(change.status)) actions.push(fileOpenAction('openSourceFile',
    `Open Parent File at ${(entry.parentHashes[0] ?? '').slice(0, 8)} (read-only)`, getShowLogFileTarget(change, entry, 'source')));
  return actions;
}

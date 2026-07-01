import * as vscode from 'vscode';

import { getLeftUri, getRightUri, isAddition, isDeletion } from './changePresentation';
import { Change, Repository } from './git';
import { EMPTY_SCHEME, REF_SCHEME } from './refContentProvider';
import { DiffPresenter } from './refActions';

export function createWorkbenchDiffPresenter(): DiffPresenter {
  return {
    async openBetweenRefs(repository, change, leftRef, rightRef) {
      await openChangeDiffBetweenRefs(repository, change, leftRef, rightRef);
    },
    async openWithWorktree(repository, change, ref) {
      await openChangeDiffWithWorktree(repository, change, ref);
    }
  };
}

function buildRefUri(repository: Repository, ref: string, filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: REF_SCHEME,
    path: filePath,
    query: new URLSearchParams({
      repo: repository.rootUri.fsPath,
      ref,
      path: filePath
    }).toString()
  });
}

function buildEmptyUri(filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: EMPTY_SCHEME,
    path: filePath
  });
}

export async function openChangeDiffBetweenRefs(
  repository: Repository,
  change: Change,
  leftRef: string,
  rightRef: string
): Promise<void> {
  const leftPath = getLeftUri(change).fsPath;
  const rightPath = getRightUri(change).fsPath;
  const leftIsEmpty = isAddition(change.status);
  const rightIsEmpty = isDeletion(change.status);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, leftRef, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : buildRefUri(repository, rightRef, rightPath);
  const title = `${leftRef} <-> ${rightRef} • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

export async function openChangeDiffWithWorktree(
  repository: Repository,
  change: Change,
  ref: string
): Promise<void> {
  const leftPath = getLeftUri(change).fsPath;
  const rightPath = getRightUri(change).fsPath;
  const leftIsEmpty = isAddition(change.status);
  const rightIsEmpty = isDeletion(change.status);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, ref, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : vscode.Uri.file(rightPath);
  const title = `${ref} <-> worktree • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

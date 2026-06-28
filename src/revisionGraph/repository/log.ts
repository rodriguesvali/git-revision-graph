import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import { formatShortCommitHash } from '../../commitHash';
import { Repository } from '../../git';
import { RevisionGraphDocumentBackend } from '../backend';

export async function openUnifiedDiffDocument(
  repository: Repository,
  left: string,
  right: string,
  backend: RevisionGraphDocumentBackend
): Promise<void> {
  try {
    const stdout = await backend.loadUnifiedDiff(repository, left, right);

    if (stdout.trim().length === 0) {
      void vscode.window.showInformationMessage(`No unified diff found between ${formatShortCommitHash(left)} and ${formatShortCommitHash(right)}.`);
      return;
    }

    const document = await vscode.workspace.openTextDocument({
      content: stdout,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document, {
      preview: true
    });
  } catch (error) {
    await vscode.window.showErrorMessage(
      toOperationError('Could not open the unified diff.', error),
      { modal: true }
    );
  }
}

export async function openUnifiedDiffWithWorktreeDocument(
  repository: Repository,
  ref: string,
  label: string,
  untrackedPaths: readonly string[],
  backend: RevisionGraphDocumentBackend
): Promise<void> {
  try {
    const stdout = await backend.loadUnifiedDiffWithWorktree(repository, ref, untrackedPaths);

    if (stdout.trim().length === 0) {
      void vscode.window.showInformationMessage(`No unified diff found between ${label} and the worktree.`);
      return;
    }

    const document = await vscode.workspace.openTextDocument({
      content: stdout,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document, {
      preview: true
    });
  } catch (error) {
    await vscode.window.showErrorMessage(
      toOperationError('Could not open the unified diff.', error),
      { modal: true }
    );
  }
}

export async function openCommitDetails(
  repository: Repository,
  commitHash: string,
  backend: RevisionGraphDocumentBackend
): Promise<void> {
  try {
    const stdout = await backend.loadCommitDetails(repository, commitHash);

    const document = await vscode.workspace.openTextDocument({
      content: stdout,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document, {
      preview: true
    });
  } catch (error) {
    await vscode.window.showErrorMessage(toOperationError('Could not open the selected commit.', error));
  }
}

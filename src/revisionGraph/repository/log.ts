import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { RevisionGraphBackend } from '../backend';

export async function openUnifiedDiffDocument(
  repository: Repository,
  left: string,
  right: string,
  backend: RevisionGraphBackend
): Promise<void> {
  try {
    const stdout = await backend.loadUnifiedDiff(repository, left, right);

    if (stdout.trim().length === 0) {
      void vscode.window.showInformationMessage(`No unified diff found between ${left.slice(0, 8)} and ${right.slice(0, 8)}.`);
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
    await vscode.window.showErrorMessage(toOperationError('Could not open the unified diff.', error));
  }
}

export async function openCommitDetails(
  repository: Repository,
  commitHash: string,
  backend: RevisionGraphBackend
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

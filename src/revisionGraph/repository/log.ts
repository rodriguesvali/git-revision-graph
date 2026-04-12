import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { RevisionLogEntry } from '../../revisionGraphTypes';
import { RevisionGraphBackend } from '../backend';

interface RevisionLogQuickPickItem extends vscode.QuickPickItem {
  readonly entry: RevisionLogEntry;
}

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

export async function showRevisionLogQuickPick(
  repository: Repository,
  left: string,
  right: string,
  limit: number,
  backend: RevisionGraphBackend
): Promise<RevisionLogEntry | undefined> {
  try {
    const entries = await backend.loadRevisionLog(repository, left, right, limit);
    if (entries.length === 0) {
      void vscode.window.showInformationMessage(`No commits found between ${left} and ${right}.`);
      return undefined;
    }

    const picked = await vscode.window.showQuickPick<RevisionLogQuickPickItem>(
      entries.map((entry) => ({
        label: `${entry.shortHash} ${entry.subject}`,
        description: `${entry.author} on ${entry.date}`,
        detail: entry.hash,
        entry
      })),
      {
        title: 'Show Log',
        placeHolder: `Commits in ${left}..${right}`,
        matchOnDescription: true,
        matchOnDetail: true
      }
    );

    if (!picked) {
      return undefined;
    }

    return picked.entry;
  } catch (error) {
    await vscode.window.showErrorMessage(toOperationError('Could not show the revision log.', error));
    return undefined;
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

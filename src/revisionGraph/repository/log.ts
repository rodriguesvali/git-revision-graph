import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { RevisionLogEntry } from '../../revisionGraphTypes';
import { execGit } from './gitExec';

interface RevisionLogQuickPickItem extends vscode.QuickPickItem {
  readonly entry: RevisionLogEntry;
}

export async function openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void> {
  try {
    const stdout = await execGit(
      repository.rootUri.fsPath,
      ['diff', '--no-color', left, right]
    );

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

export async function showRevisionLog(repository: Repository, left: string, right: string, limit: number): Promise<void> {
  try {
    const entries = await loadRevisionLogEntries(repository.rootUri.fsPath, left, right, limit);
    if (entries.length === 0) {
      void vscode.window.showInformationMessage(`No commits found between ${left} and ${right}.`);
      return;
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
      return;
    }

    await openCommitLogEntry(repository, picked.entry.hash);
  } catch (error) {
    await vscode.window.showErrorMessage(toOperationError('Could not show the revision log.', error));
  }
}

async function openCommitLogEntry(repository: Repository, commitHash: string): Promise<void> {
  try {
    const stdout = await execGit(
      repository.rootUri.fsPath,
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', commitHash]
    );

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

async function loadRevisionLogEntries(
  repositoryPath: string,
  left: string,
  right: string,
  limit: number
): Promise<RevisionLogEntry[]> {
  const fieldSeparator = '\u001f';
  const recordSeparator = '\u001e';
  const stdout = await execGit(
    repositoryPath,
    [
      'log',
      '--date=short',
      `--max-count=${limit}`,
      `--pretty=format:%H${fieldSeparator}%h${fieldSeparator}%ad${fieldSeparator}%an${fieldSeparator}%s${recordSeparator}`,
      `${left}..${right}`
    ]
  );

  return stdout
    .split(recordSeparator)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash, shortHash, date, author, ...subjectParts] = line.split(fieldSeparator);
      return {
        hash,
        shortHash,
        date,
        author,
        subject: subjectParts.join(fieldSeparator)
      };
    });
}

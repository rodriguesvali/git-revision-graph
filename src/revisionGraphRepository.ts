import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { toErrorDetail, toOperationError } from './errorDetail';
import { API, Repository } from './git';
import { RevisionGraphProjectionOptions } from './revisionGraphData';
import { RevisionGraphSnapshot } from './revisionGraph/source/graphSnapshot';
import { buildCommitGraphFromGitLog, buildRevisionGraphGitLogArgs } from './revisionGraph/source/graphGit';
import { buildRevisionGraphRefKinds } from './revisionGraph/source/refIndex';
import { sortRepositoriesByPath } from './repositorySelection';
import { RevisionLogEntry } from './revisionGraphTypes';

const execFile = promisify(execFileCallback);

interface RevisionLogQuickPickItem extends vscode.QuickPickItem {
  readonly entry: RevisionLogEntry;
}

export async function loadRevisionGraphSnapshot(
  repository: Repository,
  limit: number,
  options: RevisionGraphProjectionOptions
): Promise<RevisionGraphSnapshot> {
  const refKindsByName = buildRevisionGraphRefKinds(await repository.getRefs());
  const { stdout } = await execFile(
    'git',
    buildRevisionGraphGitLogArgs(limit, options),
    {
      cwd: repository.rootUri.fsPath,
      maxBuffer: 8 * 1024 * 1024
    }
  );

  return {
    graph: buildCommitGraphFromGitLog(stdout, refKindsByName, 'git-decoration'),
    loadedAt: Date.now(),
    requestedLimit: limit
  };
}

export async function pickRevisionGraphRepository(git: API, alwaysPrompt: boolean): Promise<Repository | undefined> {
  if (!alwaysPrompt && git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    void vscode.window.showInformationMessage('No Git repository is open in the workspace.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    sortRepositoriesByPath(git.repositories)
      .map((repository) => ({
        label: vscode.workspace.asRelativePath(repository.rootUri, false),
        description: repository.rootUri.fsPath,
        repository
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    {
      placeHolder: 'Choose the Repository for the Revision Graph'
    }
  );

  return picked?.repository;
}

export async function openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void> {
  try {
    const { stdout } = await execFile(
      'git',
      ['diff', '--no-color', left, right],
      {
        cwd: repository.rootUri.fsPath,
        maxBuffer: 8 * 1024 * 1024
      }
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

export async function isRefAncestorOfHead(
  repository: Repository,
  refName: string,
  headRefName: string
): Promise<boolean> {
  try {
    await execFile(
      'git',
      ['merge-base', '--is-ancestor', refName, headRefName],
      {
        cwd: repository.rootUri.fsPath,
        maxBuffer: 8 * 1024 * 1024
      }
    );
    return true;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;

    if (code === 1) {
      return false;
    }

    throw error;
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
    const { stdout } = await execFile(
      'git',
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', commitHash],
      {
        cwd: repository.rootUri.fsPath,
        maxBuffer: 8 * 1024 * 1024
      }
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
  const { stdout } = await execFile(
    'git',
    [
      'log',
      '--date=short',
      `--max-count=${limit}`,
      `--pretty=format:%H${fieldSeparator}%h${fieldSeparator}%ad${fieldSeparator}%an${fieldSeparator}%s${recordSeparator}`,
      `${left}..${right}`
    ],
    {
      cwd: repositoryPath,
      maxBuffer: 8 * 1024 * 1024
    }
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

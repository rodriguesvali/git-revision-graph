import * as vscode from 'vscode';

import { API, Repository } from '../../git';
import { sortRepositoriesByPath } from '../../repositorySelection';

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

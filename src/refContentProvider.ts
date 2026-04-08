import * as path from 'node:path';
import * as vscode from 'vscode';

import { API } from './git';

export const EMPTY_SCHEME = 'git-ext-empty';
export const REF_SCHEME = 'git-ext-ref';

export class EmptyContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(): string {
    return '';
  }
}

export class RefContentProvider implements vscode.TextDocumentContentProvider {
  constructor(private readonly git: API) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = new URLSearchParams(uri.query);
    const repositoryPath = params.get('repo');
    const ref = params.get('ref');
    const filePath = params.get('path');

    if (!repositoryPath || !ref || !filePath) {
      return '';
    }

    const repository = this.git.repositories.find((candidate) => candidate.rootUri.fsPath === repositoryPath);
    if (!repository) {
      return '';
    }

    const relativePath = path.relative(repository.rootUri.fsPath, filePath);
    if (!relativePath || relativePath.startsWith('..')) {
      return '';
    }

    try {
      return await repository.show(ref, relativePath);
    } catch {
      return '';
    }
  }
}

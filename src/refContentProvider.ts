import * as vscode from 'vscode';

import { API } from './git';
import { loadRefContent } from './refContentLoader';

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
      throw new Error('The revision document URI is incomplete.');
    }

    return loadRefContent(
      { repositoryPath, ref, filePath },
      this.git.repositories
    );
  }
}

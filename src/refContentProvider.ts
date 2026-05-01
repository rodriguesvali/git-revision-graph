import * as path from 'node:path';
import * as vscode from 'vscode';

import { API } from './git';
import { execGit } from './gitExec';

export const EMPTY_SCHEME = 'git-ext-empty';
export const REF_SCHEME = 'git-ext-ref';
const REF_CONTENT_MAX_OUTPUT_BYTES = 24 * 1024 * 1024;
const REF_CONTENT_TIMEOUT_MS = 15000;

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
    if (
      !relativePath
      || relativePath === '..'
      || relativePath.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativePath)
    ) {
      return '';
    }

    try {
      return await execGit(
        repository.rootUri.fsPath,
        ['show', '--end-of-options', `${ref}:${relativePath.split(path.sep).join('/')}`],
        {
          maxOutputBytes: REF_CONTENT_MAX_OUTPUT_BYTES,
          timeoutMs: REF_CONTENT_TIMEOUT_MS
        }
      );
    } catch {
      return '';
    }
  }
}

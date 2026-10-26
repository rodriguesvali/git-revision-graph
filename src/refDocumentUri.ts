import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Repository } from './git';

export function buildRefUri(repository: Repository, ref: string, filePath: string, textOnly = false): vscode.Uri {
  const extension = path.extname(filePath);
  const displayPath = textOnly
    ? path.join(path.dirname(filePath), `${path.basename(filePath, extension)} (${ref.slice(0, 8)})${extension}`)
    : filePath;
  return vscode.Uri.from({
    scheme: 'git-ext-ref',
    path: displayPath,
    query: new URLSearchParams({ repo: repository.rootUri.fsPath, ref, path: filePath,
      ...(textOnly ? { textOnly: 'true' } : {}) }).toString()
  });
}

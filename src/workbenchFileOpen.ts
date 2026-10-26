import * as vscode from 'vscode';
import type { Repository } from './git';
import { buildRefUri } from './refDocumentUri';

export async function isAvailable(uri: vscode.Uri): Promise<boolean> {
  if (vscode.workspace.textDocuments.some(doc => doc.isDirty && doc.uri.toString() === uri.toString())) return true;
  try {
    return ((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.File) !== 0;
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return false;
    throw error;
  }
}

export async function openWorktree(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
}

export async function openRevision(repository: Repository, uri: vscode.Uri, revision: string, isCurrent: () => boolean): Promise<void> {
  const document = await vscode.workspace.openTextDocument(buildRefUri(repository, revision, uri.fsPath, true));
  if (!isCurrent()) return;
  await vscode.window.showTextDocument(document, { preview: false });
}

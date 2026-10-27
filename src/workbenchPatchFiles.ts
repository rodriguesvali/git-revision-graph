import * as vscode from 'vscode';
import * as path from 'node:path';
import { writeCommitPatchFiles } from './patches/files';
import { loadCommitPatch, loadComparisonPatch } from './patches/exportGit';
import type { PatchExportServices } from './patches/exportWorkflow';
import type { RevisionGraphViewHostMessage } from './revisionGraphTypes';
import { ComparisonPatchNames } from './patches/comparisonNames';

const comparisonPatchNames = new ComparisonPatchNames();

export function hasDirtyPatchEditors(root: string): boolean {
  return vscode.workspace.textDocuments.some(document => {
    if (!document.isDirty || document.uri.scheme !== 'file') return false;
    const relative = path.relative(root, document.uri.fsPath);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });
}

export function createPatchExportServices(root: vscode.Uri): PatchExportServices {
  let suggestion: ReturnType<ComparisonPatchNames['prepare']> | undefined;
  return {
    async suggestComparisonFileName(source, target) {
      const entries = await vscode.workspace.fs.readDirectory(root);
      suggestion = comparisonPatchNames.prepare(root.toString(), source, target, entries.map(([name]) => name));
      return suggestion.name;
    },
    async chooseDirectory() {
      return (await vscode.window.showOpenDialog({ defaultUri: root, canSelectFiles: false,
        canSelectFolders: true, canSelectMany: false, openLabel: 'Save Patches', title: 'Choose Folder for Commit Patches' }))?.[0].toString();
    },
    async writeCommitPatches(directory, files, isCurrent) {
      const uri = vscode.Uri.parse(directory);
      if (uri.scheme !== 'file') throw new Error('Choose a local folder for commit patches.');
      await writeCommitPatchFiles(uri.fsPath, files, isCurrent);
    },
    loadCommit: loadCommitPatch, loadComparison: loadComparisonPatch, hasDirtyEditors: hasDirtyPatchEditors,
    async chooseDestination(name) {
      return (await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(root, name),
        filters: { Patch: ['patch', 'diff'] }, saveLabel: 'Save Patch' }))?.toString();
    },
    async writeFile(destination, bytes) {
      await vscode.workspace.fs.writeFile(vscode.Uri.parse(destination), bytes);
      suggestion?.saved();
    }
  };
}

export function withPatchEditorState(message: RevisionGraphViewHostMessage): RevisionGraphViewHostMessage {
  if (message.type === 'init-state' || message.type === 'update-state') {
    return { ...message, state: { ...message.state,
      hasUnsavedChanges: !!message.state.repositoryPath && hasDirtyPatchEditors(message.state.repositoryPath) } };
  }
  if (message.type === 'update-repository-status') {
    return { ...message, status: { ...message.status, hasUnsavedChanges: hasDirtyPatchEditors(message.status.repositoryPath) } };
  }
  return message;
}

export function watchPatchEditors(notify: () => void): vscode.Disposable {
  let previous = '';
  const changed = () => {
    const next = JSON.stringify(vscode.workspace.textDocuments.filter(doc => doc.isDirty).map(doc => doc.uri.toString()).sort());
    if (next !== previous) { previous = next; notify(); }
  };
  return vscode.Disposable.from(vscode.workspace.onDidChangeTextDocument(changed),
    vscode.workspace.onDidSaveTextDocument(changed), vscode.workspace.onDidCloseTextDocument(changed));
}

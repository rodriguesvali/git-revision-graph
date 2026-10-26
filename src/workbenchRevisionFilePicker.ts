import * as vscode from 'vscode';
import type { Repository } from './git';
import { openFileTarget } from './fileOpen';
import { loadRevisionTreeFiles } from './revisionGraph/source/revisionTreeFiles';

export const loadFiles = loadRevisionTreeFiles;

interface RevisionFileItem extends vscode.QuickPickItem { readonly file: string }

export function pickFile(files: Promise<string[]>, commit: string, signal: AbortSignal): Promise<string | undefined> {
  const picker = vscode.window.createQuickPick<RevisionFileItem>();
  picker.title = `Open File at ${commit.slice(0, 8)} (read-only)`;
  picker.placeholder = 'Search files in this revision by name or path';
  picker.matchOnDescription = true;
  picker.busy = true;
  return new Promise((resolve, reject) => {
    let finished = false;
    const disposables: vscode.Disposable[] = [];
    const finish = (file?: string, error?: unknown) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener('abort', cancel);
      disposables.forEach(item => item.dispose());
      picker.dispose();
      error ? reject(error) : resolve(file);
    };
    const cancel = () => finish();
    disposables.push(picker.onDidHide(cancel), picker.onDidAccept(() => {
      if (picker.selectedItems[0]) finish(picker.selectedItems[0].file);
    }));
    signal.addEventListener('abort', cancel, { once: true });
    files.then(paths => {
      if (finished) return;
      picker.items = paths.map(file => ({ label: escapePickerLabel(file), file }));
      picker.busy = false;
      if (!paths.length) picker.placeholder = 'No files exist in this revision';
    }, error => finish(undefined, error));
    if (signal.aborted) finish(); else picker.show();
  });
}

function escapePickerLabel(file: string): string {
  return file.replace(/\$\(/g, '\\$(').replace(/[\t\r\n]/g, char =>
    ({ '\t': '\\t', '\r': '\\r', '\n': '\\n' })[char]!);
}

export async function openFile(repository: Repository, file: string, commit: string, isCurrent: () => boolean): Promise<void> {
  await openFileTarget(repository, { uri: vscode.Uri.joinPath(repository.rootUri, ...file.split('/')), revision: commit }, isCurrent);
}

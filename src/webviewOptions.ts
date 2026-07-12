import type * as vscode from 'vscode';

export function createScriptOnlyWebviewOptions(
  localResourceRoots: readonly vscode.Uri[] = []
): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [...localResourceRoots]
  };
}

export function createRetainedScriptWebviewPanelOptions(
  localResourceRoots: readonly vscode.Uri[] = []
): vscode.WebviewPanelOptions & vscode.WebviewOptions {
  return {
    ...createScriptOnlyWebviewOptions(localResourceRoots),
    retainContextWhenHidden: true
  };
}

import type * as vscode from 'vscode';

export function createScriptOnlyWebviewOptions(): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: []
  };
}

export function createRetainedScriptWebviewPanelOptions(): vscode.WebviewPanelOptions & vscode.WebviewOptions {
  return {
    ...createScriptOnlyWebviewOptions(),
    retainContextWhenHidden: true
  };
}

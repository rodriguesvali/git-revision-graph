import type * as vscode from 'vscode';

export async function showModalErrorMessage(
  message: string,
  options?: vscode.MessageOptions
): Promise<void> {
  const vscode = await import('vscode');
  await vscode.window.showErrorMessage(message, {
    ...options,
    modal: true
  });
}

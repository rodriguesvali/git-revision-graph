export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export async function getDefaultClipboardWriter(): Promise<ClipboardWriter> {
  const vscode = await import('vscode');
  return {
    async writeText(text) {
      await vscode.env.clipboard.writeText(text);
    }
  };
}

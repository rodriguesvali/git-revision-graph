import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ObservedPanel, waitFor } from './webviewBridge';
/** Decorate real APIs at the test boundary; production commands and listeners remain intact. */
export class SafetyHarness implements vscode.Disposable {
  readonly panels: ObservedPanel[] = [];
  readonly errors: string[] = [];
  readonly confirmations: string[] = [];
  readonly allowedConfirmations = new Set(['Revert File', 'Checkout to: other']);
  selectedRoot: string;
  private readonly restores: (() => void)[] = [];
  constructor(readonly roots: readonly string[], extensionPath: string) {
    const api = createRequire(path.join(extensionPath, 'out', 'extension.js'))('vscode') as typeof vscode;
    this.selectedRoot = roots[0];
    const createPanel = api.window.createWebviewPanel;
    this.replace(api.window, 'createWebviewPanel', ((...args: Parameters<typeof createPanel>) => {
      const observed = new ObservedPanel(createPanel(...args), args[0]);
      this.panels.push(observed);
      return observed.proxy;
    }) as typeof createPanel);
    this.replace(api.window, 'showQuickPick', (async (items: unknown) => {
      const resolved = await items as readonly {
        repository?: {
          rootUri: vscode.Uri;
        };
      }[];
      const picked = resolved.find(item => item.repository?.rootUri.fsPath === this.selectedRoot);
      assert.ok(picked, `Unexpected QuickPick outside fixture repositories: ${this.selectedRoot}`);
      return picked;
    }));
    this.replace(api.window, 'showWarningMessage', (async (message: string, _options: unknown, action: string) => {
      assert.ok(this.allowedConfirmations.has(action), `Unexpected warning: ${message}`);
      this.confirmations.push(message);
      return action;
    }));
    this.replace(api.window, 'showErrorMessage', (async (message: string) => {
      this.errors.push(message);
      return undefined;
    }));
  }
  async panel(viewType: string): Promise<ObservedPanel> {
    await waitFor(() => this.panels.some(panel => panel.viewType === viewType && !panel.disposed), viewType);
    const panel = this.panels.filter(panel => panel.viewType === viewType && !panel.disposed).at(-1)!;
    panel.panel.reveal();
    await panel.ready();
    return panel;
  }
  private replace<T extends object, K extends keyof T>(object: T, key: K, value: unknown): void {
    const original = Object.getOwnPropertyDescriptor(object, key);
    assert.ok(original?.writable, `E2E cannot instrument readonly API ${String(key)}`);
    Object.defineProperty(object, key, { ...original, value });
    this.restores.push(() => Object.defineProperty(object, key, original));
  }
  dispose(): void {
    this.panels.forEach(panel => { if (!panel.disposed)
      panel.panel.dispose(); });
    this.restores.reverse().forEach(restore => restore());
  }
}

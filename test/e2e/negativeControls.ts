import assert from 'node:assert/strict';
import * as path from 'node:path';
/** Optional destructive-to-the-guard controls, confined to the disposable test host. */
export function installNegativeControl(extensionPath: string): () => void {
  const control = process.env.VSCODE_E2E_NEGATIVE_CONTROL;
  if (!control)
    return () => { };
  let target: object, property: string, replacement: unknown;
  if (control === 'allow-stale') {
    target = require(path.join(extensionPath, 'out', 'webviewMessageOrigin.js'));
    property = 'matchesWebviewMessageOrigin';
    replacement = () => true;
  }
  else if (control === 'skip-recovery') {
    target = (require(path.join(extensionPath, 'out', 'compareResultRestoreBackup.js')) as {
      CompareResultRestoreBackup: {
        prototype: object;
      };
    }).CompareResultRestoreBackup.prototype;
    property = 'recover';
    replacement = async function (this: { dispose(): Promise<void> }, error: unknown) {
      await this.dispose();
      throw error;
    };
  }
  else {
    throw new Error(`Unsupported E2E negative control: ${control}`);
  }
  const original = Object.getOwnPropertyDescriptor(target, property);
  assert.ok(original?.writable);
  Object.defineProperty(target, property, { ...original, value: replacement });
  console.log(`[e2e:safety] negative control enabled: ${control}; this run MUST fail`);
  return () => Object.defineProperty(target, property, original);
}

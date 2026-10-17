import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { renderScopedWebviewPostMessage } from '../src/webviewMessageOrigin';
test('inline scoped emitter preserves native window.postMessage for inbound VS Code delivery', () => {
  const inbound: unknown[] = [], outbound: unknown[] = [];
  const nativePostMessage = (message: unknown): void => { inbound.push(message); };
  const origin = { repositoryPath: '/repo', contextId: 'current' };
  const context = { postMessage: nativePostMessage, send: (message: unknown) => outbound.push(message), origin };
  runInNewContext(`
  const vscode = { postMessage: send };
  const currentState = { messageOrigin: origin };
  ${renderScopedWebviewPostMessage()}
  postMessage({ type: 'ready' });
  postMessage({ type: 'revert', itemId: 'file' });
 `, context);
  assert.equal(context.postMessage, nativePostMessage);
  context.postMessage({ type: 'state' });
  assert.deepEqual(inbound, [{ type: 'state' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(outbound)), [
    { type: 'ready' }, { type: 'revert', itemId: 'file', origin }
  ]);
});

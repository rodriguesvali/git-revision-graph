import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchCompareResultsWebviewMessage,
  type CompareResultsMessageHandlers
} from '../src/compareResults/messageHandler';

test('dispatchCompareResultsWebviewMessage ignores malformed messages', async () => {
  const calls: string[] = [];
  const handled = await dispatchCompareResultsWebviewMessage(
    { type: 'base', itemId: '' },
    createHandlers(calls)
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});

test('dispatchCompareResultsWebviewMessage routes compare results commands', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'ready' }, handlers), true);
  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'base', itemId: 'src/app.ts:0' }, handlers), true);
  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'copyFileName', itemIds: ['src/app.ts:0', 'src/util.ts:1'] }, handlers), true);
  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'copyFullPath', itemIds: ['src/app.ts:0'] }, handlers), true);
  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'worktree', itemId: 'src/app.ts:0' }, handlers), true);
  assert.equal(await dispatchCompareResultsWebviewMessage({ type: 'revert', itemId: 'src/app.ts:0' }, handlers), true);

  assert.deepEqual(calls, [
    'ready',
    'base:src/app.ts:0',
    'copyFileName:src/app.ts:0,src/util.ts:1',
    'copyFullPath:src/app.ts:0',
    'worktree:src/app.ts:0',
    'revert:src/app.ts:0'
  ]);
});

function createHandlers(calls: string[]): CompareResultsMessageHandlers {
  return {
    ready() {
      calls.push('ready');
    },
    base(itemId) {
      calls.push(`base:${itemId}`);
    },
    copyFileName(itemIds) {
      calls.push(`copyFileName:${itemIds.join(',')}`);
    },
    copyFullPath(itemIds) {
      calls.push(`copyFullPath:${itemIds.join(',')}`);
    },
    worktree(itemId) {
      calls.push(`worktree:${itemId}`);
    },
    revert(itemId) {
      calls.push(`revert:${itemId}`);
    }
  };
}

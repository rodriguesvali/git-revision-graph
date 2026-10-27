import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchCompareResultsWebviewMessage as dispatchRaw,
  type CompareResultsMessageHandlers
} from '../src/compareResults/messageHandler';

test('dispatchCompareResultsWebviewMessage ignores malformed messages', async () => {
  const calls: string[] = [];
  const handled = await dispatchCurrent(
    { type: 'base', itemId: '' },
    createHandlers(calls)
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});

test('dispatchCompareResultsWebviewMessage routes compare results commands', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchCurrent({ type: 'ready' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'base', itemId: 'src/app.ts:0' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyFileName', itemIds: ['src/app.ts:0', 'src/util.ts:1'] }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyFullPath', itemIds: ['src/app.ts:0'] }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyBriefing' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'cancelBriefing' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'generateBriefing' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'unifiedDiff' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'savePatch' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'worktree', itemId: 'src/app.ts:0' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'revert', itemId: 'src/app.ts:0' }, handlers), true);

  assert.deepEqual(calls, [
    'ready',
    'base:src/app.ts:0',
    'copyFileName:src/app.ts:0,src/util.ts:1',
    'copyFullPath:src/app.ts:0',
    'copyBriefing',
    'cancelBriefing',
    'generateBriefing',
    'unifiedDiff',
    'savePatch',
    'worktree:src/app.ts:0',
    'revert:src/app.ts:0'
  ]);
});

function createHandlers(calls: string[]): CompareResultsMessageHandlers {
  return {
    savePatch() { calls.push('savePatch'); },
    openFileVersion(itemId, side) { calls.push(`openFileVersion:${itemId}:${side}`); },
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
    copyBriefing() {
      calls.push('copyBriefing');
    },
    cancelBriefing() {
      calls.push('cancelBriefing');
    },
    generateBriefing() {
      calls.push('generateBriefing');
    },
    unifiedDiff() {
      calls.push('unifiedDiff');
    },
    worktree(itemId) {
      calls.push(`worktree:${itemId}`);
    },
    revert(itemId) {
      calls.push(`revert:${itemId}`);
    }
  };
}

const currentOrigin = { repositoryPath: '/workspace/repo', contextId: 'current' };
function dispatchCurrent(message: object, handlers: CompareResultsMessageHandlers): Promise<boolean> {
  return dispatchRaw({ ...message, origin: currentOrigin }, handlers, currentOrigin);
}

test('rejects missing, malformed, cross-repository and superseded origins without invoking handlers', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);
  const message = { type: 'revert', itemId: 'same-file' };
  for (const origin of [undefined, {}, [], { ...currentOrigin, repositoryPath: '/other' },
    { ...currentOrigin, contextId: 'previous' }, { ...currentOrigin, contextId: '' }]) {
    assert.equal(await dispatchRaw({ ...message, origin }, handlers, currentOrigin), false);
  }
  assert.equal(await dispatchRaw({ ...message, origin: currentOrigin }, handlers), false);
  assert.deepEqual(calls, []);
  assert.equal(await dispatchRaw({ ...message, origin: currentOrigin }, handlers, currentOrigin), true);
  assert.equal(calls.length, 1);
});

test('file opening actions route their exact side and reject stale origins', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);
  for (const type of ['openWorktreeFile', 'openSourceFile', 'openTargetFile']) {
    const message = { type, itemId: 'file' };
    assert.equal(await dispatchCurrent(message, handlers), true);
    assert.equal(await dispatchRaw({ ...message, origin: { ...currentOrigin, contextId: 'stale' } }, handlers, currentOrigin), false);
  }
  assert.equal(calls.length, 3);
  assert.ok(calls[0].endsWith(':worktree'));
  assert.ok(calls[1].endsWith(':source'));
  assert.ok(calls[2].endsWith(':target'));
});

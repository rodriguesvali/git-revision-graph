import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchShowLogWebviewMessage as dispatchRaw,
  type ShowLogMessageHandlers
} from '../src/showLog/messageHandler';

test('dispatchShowLogWebviewMessage ignores malformed messages', async () => {
  const calls: string[] = [];
  const handled = await dispatchCurrent(
    { type: 'toggleCommit', commitHash: '' },
    createHandlers(calls)
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});

test('dispatchShowLogWebviewMessage routes simple show log commands', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchCurrent({ type: 'ready' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'toggleCommit', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'toggleShowAllBranches', value: true }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'setFilterText', value: 'fix', sourceToken: '2' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'setCommitFileFilter', commitHash: 'abc123', value: 'change:fix', sourceToken: '2' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'loadMore' }, handlers), true);

  assert.deepEqual(calls, [
    'ready',
    'toggleCommit:abc123',
    'toggleShowAllBranches:true',
    'setFilterText:fix:2',
    'setCommitFileFilter:abc123:change:fix:2',
    'loadMore'
  ]);
});

test('dispatchShowLogWebviewMessage routes file and commit actions', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchCurrent({ type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'compareWithWorktree', commitHash: 'abc123', changeId: 'abc123:1' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'revertFileToCommit', commitHash: 'abc123', changeId: 'abc123:2' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyFileName', commitHash: 'abc123', changeId: 'abc123:2' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyFullPath', commitHash: 'abc123', changeId: 'abc123:3' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyCommitHash', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'copyReferenceName', commitHash: 'abc123', refName: 'origin/main' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'openCommitOnRemote', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'openCommitDetails', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'compareCommitWithWorktree', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'cherryPickCommits', commitHashes: ['abc123', 'def456'] }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'checkoutCommit', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'createTagFromCommit', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchCurrent({ type: 'resetToCommit', commitHash: 'abc123' }, handlers), true);

  assert.deepEqual(calls, [
    'openFile:abc123:abc123:0',
    'compareWithWorktree:abc123:abc123:1',
    'revertFileToCommit:abc123:abc123:2',
    'copyFileName:abc123:abc123:2',
    'copyFullPath:abc123:abc123:3',
    'copyCommitHash:abc123',
    'copyReferenceName:abc123:origin/main',
    'openCommitOnRemote:abc123',
    'openCommitDetails:abc123',
    'compareCommits:abc123:def456',
    'compareCommitWithWorktree:abc123',
    'cherryPickCommits:abc123,def456',
    'checkoutCommit:abc123',
    'createTagFromCommit:abc123',
    'resetToCommit:abc123'
  ]);
});

function createHandlers(calls: string[]): ShowLogMessageHandlers {
  return {
    ready() {
      calls.push('ready');
    },
    toggleCommit(commitHash) {
      calls.push(`toggleCommit:${commitHash}`);
    },
    toggleShowAllBranches(value) {
      calls.push(`toggleShowAllBranches:${String(value)}`);
    },
    setFilterText(value, sourceToken) {
      calls.push(`setFilterText:${value}:${sourceToken}`);
    },
    setCommitFileFilter(commitHash, value, sourceToken) {
      calls.push(`setCommitFileFilter:${commitHash}:${value}:${sourceToken}`);
    },
    loadMore() {
      calls.push('loadMore');
    },
    openFile(commitHash, changeId) {
      calls.push(`openFile:${commitHash}:${changeId}`);
    },
    compareWithWorktree(commitHash, changeId) {
      calls.push(`compareWithWorktree:${commitHash}:${changeId}`);
    },
    revertFileToCommit(commitHash, changeId) {
      calls.push(`revertFileToCommit:${commitHash}:${changeId}`);
    },
    copyFileName(commitHash, changeId) {
      calls.push(`copyFileName:${commitHash}:${changeId}`);
    },
    copyFullPath(commitHash, changeId) {
      calls.push(`copyFullPath:${commitHash}:${changeId}`);
    },
    copyCommitHash(commitHash) {
      calls.push(`copyCommitHash:${commitHash}`);
    },
    copyReferenceName(commitHash, refName) {
      calls.push(`copyReferenceName:${commitHash}:${refName}`);
    },
    openCommitOnRemote(commitHash) {
      calls.push(`openCommitOnRemote:${commitHash}`);
    },
    openCommitDetails(commitHash) {
      calls.push(`openCommitDetails:${commitHash}`);
    },
    compareCommits(baseCommitHash, compareCommitHash) {
      calls.push(`compareCommits:${baseCommitHash}:${compareCommitHash}`);
    },
    compareCommitWithWorktree(commitHash) {
      calls.push(`compareCommitWithWorktree:${commitHash}`);
    },
    cherryPickCommits(commitHashes) {
      calls.push(`cherryPickCommits:${commitHashes.join(',')}`);
    },
    checkoutCommit(commitHash) {
      calls.push(`checkoutCommit:${commitHash}`);
    },
    createTagFromCommit(commitHash) {
      calls.push(`createTagFromCommit:${commitHash}`);
    },
    resetToCommit(commitHash) {
      calls.push(`resetToCommit:${commitHash}`);
    }
  };
}

test('file filter messages reject missing scope, malformed values and unbounded payloads', async () => {
  const calls: string[] = [];
  for (const message of [
    {type:'setCommitFileFilter',commitHash:'abc',value:'change:needle'},
    {type:'setCommitFileFilter',commitHash:'',value:'',sourceToken:'a'},
    {type:'setCommitFileFilter',commitHash:'abc',value:42,sourceToken:'a'},
    {type:'setCommitFileFilter',commitHash:'abc',value:'x'.repeat(100_000),sourceToken:'a'}
  ]) assert.equal(await dispatchCurrent(message, createHandlers(calls)), false);
  assert.deepEqual(calls, []);
});

const currentOrigin = { repositoryPath: '/workspace/repo', contextId: 'current' };
function dispatchCurrent(message: object, handlers: ShowLogMessageHandlers): Promise<boolean> {
  return dispatchRaw({ ...message, origin: currentOrigin }, handlers, currentOrigin);
}

test('rejects missing, malformed, cross-repository and superseded origins without invoking handlers', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);
  const message = { type: 'createTagFromCommit', commitHash: 'same-hash' };
  for (const origin of [undefined, {}, [], { ...currentOrigin, repositoryPath: '/other' },
    { ...currentOrigin, contextId: 'previous' }, { ...currentOrigin, contextId: '' }]) {
    assert.equal(await dispatchRaw({ ...message, origin }, handlers, currentOrigin), false);
  }
  assert.equal(await dispatchRaw({ ...message, origin: currentOrigin }, handlers), false);
  assert.deepEqual(calls, []);
  assert.equal(await dispatchRaw({ ...message, origin: currentOrigin }, handlers, currentOrigin), true);
  assert.equal(calls.length, 1);
});

test('file action captures the validated context before the next microtask can change it', async () => {
  const calls: string[] = [];
  let context = 'original';
  queueMicrotask(() => { context = 'replacement'; });
  const pending = dispatchRaw({ type: 'revertFileToCommit', commitHash: 'same', changeId: 'same:0', origin: currentOrigin },
    { ...createHandlers(calls), revertFileToCommit: () => { calls.push(context); } }, currentOrigin);
  await pending;
  assert.deepEqual(calls, ['original']);
});

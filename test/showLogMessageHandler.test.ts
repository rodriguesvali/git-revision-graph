import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchShowLogWebviewMessage,
  type ShowLogMessageHandlers
} from '../src/showLog/messageHandler';

test('dispatchShowLogWebviewMessage ignores malformed messages', async () => {
  const calls: string[] = [];
  const handled = await dispatchShowLogWebviewMessage(
    { type: 'toggleCommit', commitHash: '' },
    createHandlers(calls)
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});

test('dispatchShowLogWebviewMessage routes simple show log commands', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchShowLogWebviewMessage({ type: 'ready' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'toggleCommit', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'toggleShowAllBranches', value: true }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'setFilterText', value: 'fix', sourceToken: '2' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'loadMore' }, handlers), true);

  assert.deepEqual(calls, [
    'ready',
    'toggleCommit:abc123',
    'toggleShowAllBranches:true',
    'setFilterText:fix:2',
    'loadMore'
  ]);
});

test('dispatchShowLogWebviewMessage routes file and commit actions', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  assert.equal(await dispatchShowLogWebviewMessage({ type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'compareWithWorktree', commitHash: 'abc123', changeId: 'abc123:1' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'revertFileToCommit', commitHash: 'abc123', changeId: 'abc123:2' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'copyFileName', commitHash: 'abc123', changeId: 'abc123:2' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'copyFullPath', commitHash: 'abc123', changeId: 'abc123:3' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'copyCommitHash', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'copyReferenceName', commitHash: 'abc123', refName: 'origin/main' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'openCommitOnRemote', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'openCommitDetails', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'compareCommitWithWorktree', commitHash: 'abc123' }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'cherryPickCommits', commitHashes: ['abc123', 'def456'] }, handlers), true);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'resetToCommit', commitHash: 'abc123' }, handlers), true);

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
    resetToCommit(commitHash) {
      calls.push(`resetToCommit:${commitHash}`);
    }
  };
}

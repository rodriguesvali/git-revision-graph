import test from 'node:test';
import assert from 'node:assert/strict';

import {
  copyShowLogChangeFileName,
  copyShowLogChangeFullPath,
  copyShowLogCommitHash
} from '../src/showLog/clipboardActions';
import type { ShowLogState } from '../src/showLogShared';
import { createChange, createRepository, createRevisionLogEntry } from './fakes';

test('copyShowLogChangeFileName writes the selected file name', async () => {
  const writes: string[] = [];
  const copied = await copyShowLogChangeFileName(
    createVisibleState(),
    'abc123',
    'abc123:0',
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ['new-name.ts']);
});

test('copyShowLogChangeFullPath writes the selected full path', async () => {
  const writes: string[] = [];
  const copied = await copyShowLogChangeFullPath(
    createVisibleState(),
    'abc123',
    'abc123:0',
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ['/workspace/repo/src/new-name.ts']);
});

test('copyShowLogCommitHash writes loaded commit hashes', async () => {
  const writes: string[] = [];
  const copied = await copyShowLogCommitHash(
    createVisibleState(),
    'abc123',
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ['abc123']);
});

test('show log clipboard actions ignore stale selections', async () => {
  const writes: string[] = [];
  const services = {
    async writeText(text: string) {
      writes.push(text);
    }
  };

  assert.equal(await copyShowLogChangeFileName(createVisibleState(), 'missing', 'missing:0', services), false);
  assert.equal(await copyShowLogChangeFullPath(createVisibleState(), 'abc123', 'missing', services), false);
  assert.equal(await copyShowLogCommitHash(createVisibleState(), 'missing', services), false);
  assert.deepEqual(writes, []);
});

function createVisibleState(): ShowLogState {
  const repository = createRepository({ root: '/workspace/repo' });
  return {
    kind: 'visible',
    sourceToken: '1',
    repository,
    source: { kind: 'target', revision: 'main', label: 'main' },
    showAllBranches: false,
    filterText: '',
    entries: [createRevisionLogEntry({ hash: 'abc123' })],
    hasMore: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: 'abc123',
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {
      abc123: [
        createChange({
          uriPath: '/workspace/repo/src/old-name.ts',
          renamePath: '/workspace/repo/src/new-name.ts'
        })
      ]
    }
  };
}

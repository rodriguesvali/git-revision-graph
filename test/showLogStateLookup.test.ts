import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findShowLogChange,
  getVisibleShowLogRepository,
  isLoadedShowLogCommitHash,
  parseShowLogChangeIndex
} from '../src/showLog/stateLookup';
import { createHiddenShowLogState } from '../src/showLogShared';
import { createChange, createRepository } from './fakes';

test('getVisibleShowLogRepository returns only visible repositories', () => {
  const repository = createRepository({ root: '/workspace/repo' });

  assert.equal(getVisibleShowLogRepository(createHiddenShowLogState()), undefined);
  assert.equal(getVisibleShowLogRepository(createVisibleState(repository)), repository);
});

test('isLoadedShowLogCommitHash checks visible loaded commits', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createVisibleState(repository);

  assert.equal(isLoadedShowLogCommitHash(createHiddenShowLogState(), 'abc123'), false);
  assert.equal(isLoadedShowLogCommitHash(state, 'abc123'), true);
  assert.equal(isLoadedShowLogCommitHash(state, 'missing'), false);
});

test('findShowLogChange resolves cached changes by webview change id', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const first = createChange({ uriPath: '/workspace/repo/src/a.ts' });
  const second = createChange({ uriPath: '/workspace/repo/src/b.ts' });
  const state = {
    ...createVisibleState(repository),
    cachedChanges: {
      abc123: [first, second]
    }
  };

  assert.equal(findShowLogChange(state, 'abc123', 'abc123:0'), first);
  assert.equal(findShowLogChange(state, 'abc123', 'abc123:1'), second);
  assert.equal(findShowLogChange(state, 'abc123', 'abc123:2'), undefined);
  assert.equal(findShowLogChange(state, 'missing', 'missing:0'), undefined);
  assert.equal(findShowLogChange(createHiddenShowLogState(), 'abc123', 'abc123:0'), undefined);
});

test('parseShowLogChangeIndex accepts numeric suffixes', () => {
  assert.equal(parseShowLogChangeIndex('abc123:0'), 0);
  assert.equal(parseShowLogChangeIndex('abc123:12'), 12);
  assert.equal(parseShowLogChangeIndex('abc123'), undefined);
  assert.equal(parseShowLogChangeIndex('abc123:'), undefined);
  assert.equal(parseShowLogChangeIndex('abc123:-1'), undefined);
  assert.equal(parseShowLogChangeIndex('abc123:1.2'), undefined);
});

function createVisibleState(repository: ReturnType<typeof createRepository>) {
  return {
    kind: 'visible' as const,
    sourceToken: '1',
    repository,
    source: { kind: 'target' as const, revision: 'main', label: 'main' },
    showAllBranches: false,
    filterText: '',
    entries: [
      {
        hash: 'abc123',
        shortHash: 'abc123',
        author: 'Ada',
        date: '2026-06-06',
        subject: 'Change',
        message: 'Change',
        parentHashes: [],
        references: [],
        shortStat: undefined
      }
    ],
    hasMore: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: undefined,
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {}
  };
}

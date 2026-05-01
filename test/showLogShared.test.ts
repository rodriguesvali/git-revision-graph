import test from 'node:test';
import assert from 'node:assert/strict';

import { createChange, createRepository } from './fakes';
import {
  addShowLogCachedChanges,
  buildShowLogCommitLabel,
  getShowLogSourceLabel,
  buildShowLogWebviewState,
  createHiddenShowLogState
} from '../src/showLogShared';

test('builds show log summaries for target and range sources', () => {
  assert.equal(
    getShowLogSourceLabel({ kind: 'target', revision: 'main', label: 'main' }),
    'main'
  );
  assert.equal(
    getShowLogSourceLabel(
      {
        kind: 'range',
        baseRevision: 'main',
        baseLabel: 'main',
        compareRevision: 'feature/demo',
        compareLabel: 'feature/demo'
      }
    ),
    'Base: main -> Compare: feature/demo'
  );
  assert.equal(buildShowLogCommitLabel(50, true), '50+ commits');
  assert.equal(buildShowLogCommitLabel(1, false), '1 commit');
});

test('builds expanded show log webview commits with inline file changes and lane topology', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = {
    kind: 'visible' as const,
    repository,
    source: { kind: 'target' as const, revision: 'main', label: 'main' },
    showAllBranches: false,
    entries: [
      {
        hash: 'a'.repeat(40),
        shortHash: 'aaaaaaa',
        author: 'Ada',
        date: '2026-04-18',
        subject: 'Tip commit',
        message: 'Tip commit',
        parentHashes: ['b'.repeat(40)],
        references: [{ name: 'main', kind: 'head' as const }],
        shortStat: { files: 1, insertions: 3, deletions: 1 }
      },
      {
        hash: 'b'.repeat(40),
        shortHash: 'bbbbbbb',
        author: 'Linus',
        date: '2026-04-17',
        subject: 'Base commit',
        message: 'Base commit',
        parentHashes: [],
        references: [{ name: 'origin/main', kind: 'remote' as const }],
        shortStat: undefined
      }
    ],
    hasMore: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: 'a'.repeat(40),
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {
      ['a'.repeat(40)]: [
        createChange({ uriPath: '/workspace/repo/src/demo.ts' })
      ]
    }
  };

  const webviewState = buildShowLogWebviewState(state);

  assert.equal(webviewState.kind, 'visible');
  assert.equal(webviewState.summary, 'main');
  assert.equal(webviewState.summaryCount, '2 commits');
  assert.equal(webviewState.showAllBranches, false);
  assert.equal(webviewState.canToggleAllBranches, true);
  assert.equal(webviewState.commits[0]?.expanded, true);
  assert.equal(webviewState.commits[0]?.changes[0]?.path, 'src/demo.ts');
  assert.equal(webviewState.commits[0]?.changes[0]?.status, 'Modified');
  assert.equal(webviewState.commits[0]?.topology.nodeLane, 0);
  assert.deepEqual(webviewState.commits[0]?.topology.continuingLanes, [0]);
  assert.deepEqual(webviewState.commits[0]?.topology.secondaryParentLanes, []);
  assert.equal(webviewState.commits[0]?.topology.colorByLane[0], 0);
  assert.deepEqual(webviewState.commits[0]?.refs, ['HEAD → main']);
});

test('updates the summary count when more commits are appended', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const baseState = {
    kind: 'visible' as const,
    repository,
    source: { kind: 'range' as const, baseRevision: 'origin/jch', baseLabel: 'origin/jch', compareRevision: 'origin/seen', compareLabel: 'origin/seen' },
    showAllBranches: false,
    entries: [
      {
        hash: 'a'.repeat(40),
        shortHash: 'aaaaaaa',
        author: 'Ada',
        date: '2026-04-18',
        subject: 'Commit A',
        message: 'Commit A',
        parentHashes: [],
        references: [],
        shortStat: undefined
      }
    ],
    hasMore: true,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: undefined,
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {}
  };

  const initial = buildShowLogWebviewState(baseState);
  const afterLoadMore = buildShowLogWebviewState({
    ...baseState,
    entries: [
      ...baseState.entries,
      {
        hash: 'b'.repeat(40),
        shortHash: 'bbbbbbb',
        author: 'Linus',
        date: '2026-04-17',
        subject: 'Commit B',
        message: 'Commit B',
        parentHashes: ['a'.repeat(40)],
        references: [],
        shortStat: undefined
      }
    ]
  });

  assert.equal(initial.summary, 'Base: origin/jch -> Compare: origin/seen');
  assert.equal(initial.summaryCount, '1+ commits');
  assert.equal(afterLoadMore.summaryCount, '2+ commits');
});

test('keeps a hidden default state before any show log request', () => {
  const state = buildShowLogWebviewState(createHiddenShowLogState());

  assert.equal(state.kind, 'hidden');
  assert.equal(state.commits.length, 0);
  assert.equal(state.summaryCount, '');
  assert.match(state.emptyMessage ?? '', /Show Log/);
});

test('bounds show log cached changes and refreshes recently used commits', () => {
  const changeA = createChange({ uriPath: '/workspace/repo/a.ts' });
  const changeB = createChange({ uriPath: '/workspace/repo/b.ts' });
  const changeC = createChange({ uriPath: '/workspace/repo/c.ts' });
  const changeD = createChange({ uriPath: '/workspace/repo/d.ts' });

  const initial = addShowLogCachedChanges(
    addShowLogCachedChanges(
      addShowLogCachedChanges({}, 'a', [changeA], 3),
      'b',
      [changeB],
      3
    ),
    'c',
    [changeC],
    3
  );
  const refreshed = addShowLogCachedChanges(initial, 'a', [changeA], 3);
  const bounded = addShowLogCachedChanges(refreshed, 'd', [changeD], 3);

  assert.deepEqual(Object.keys(initial), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(refreshed), ['b', 'c', 'a']);
  assert.deepEqual(Object.keys(bounded), ['c', 'a', 'd']);
  assert.equal(bounded.a?.[0], changeA);
  assert.equal(bounded.b, undefined);
});

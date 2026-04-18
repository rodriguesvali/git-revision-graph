import test from 'node:test';
import assert from 'node:assert/strict';

import { createChange, createRepository } from './fakes';
import { buildShowLogSummary, buildShowLogWebviewState, createHiddenShowLogState } from '../src/showLogShared';

test('builds show log summaries for target and range sources', () => {
  assert.equal(
    buildShowLogSummary({ kind: 'target', revision: 'main', label: 'main' }, 50, true),
    'main • 50+ commits'
  );
  assert.equal(
    buildShowLogSummary(
      {
        kind: 'range',
        baseRevision: 'main',
        baseLabel: 'main',
        compareRevision: 'feature/demo',
        compareLabel: 'feature/demo'
      },
      7,
      false
    ),
    'main..feature/demo • 7 commits'
  );
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
  assert.equal(webviewState.summary, 'main • 2 commits');
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

test('keeps a hidden default state before any show log request', () => {
  const state = buildShowLogWebviewState(createHiddenShowLogState());

  assert.equal(state.kind, 'hidden');
  assert.equal(state.commits.length, 0);
  assert.match(state.emptyMessage ?? '', /Show Log/);
});

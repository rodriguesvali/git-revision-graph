import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCompareResultsWebviewState,
  getCompareResultItems
} from '../src/compareResults/viewState';
import { Status } from '../src/git';
import { createChange, createRepository } from './fakes';

test('createCompareResultsWebviewState builds an empty compare results state', () => {
  assert.deepEqual(createCompareResultsWebviewState({ kind: 'empty' }), {
    kind: 'empty',
    summary: '',
    emptyMessage: 'Run a compare from the revision graph or Command Palette to keep the changed files here.',
    canOpenUnifiedDiff: false,
    items: []
  });
});

test('createCompareResultsWebviewState builds a loading compare results state', () => {
  const repository = createRepository({ root: '/workspace/repo' });

  assert.deepEqual(createCompareResultsWebviewState({
    kind: 'loading',
    repository,
    sourceLabel: 'main',
    targetLabel: 'release/2026',
    previousState: { kind: 'empty' }
  }), {
    kind: 'loading',
    summary: 'Loading results...',
    sourceLabel: 'main',
    targetLabel: 'release/2026',
    canOpenUnifiedDiff: false,
    items: []
  });
});

test('createCompareResultsWebviewState builds between-ref labels and items', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createCompareResultsWebviewState({
    kind: 'between',
    repository,
    left: { refName: 'main', label: 'main' },
    right: { refName: 'release/2026', label: 'release/2026' },
    changes: [
      createChange({ uriPath: '/workspace/repo/src/b.ts', status: Status.MODIFIED }),
      createChange({ uriPath: '/workspace/repo/src/a.ts', status: Status.INDEX_ADDED })
    ]
  });

  assert.equal(state.kind, 'results');
  assert.equal(state.summary, 'main <-> release/2026 • 2 files changed');
  assert.equal(state.sourceLabel, 'main');
  assert.equal(state.targetLabel, 'release/2026');
  assert.equal(state.canOpenUnifiedDiff, true);
  assert.deepEqual(
    state.items.map((item) => item.path),
    ['src/a.ts', 'src/b.ts']
  );
  assert.equal(state.items[0].leftRef, 'main');
  assert.equal(state.items[0].rightRef, 'release/2026');
  assert.equal(state.items[0].worktreeRef, undefined);
});

test('createCompareResultsWebviewState builds worktree item display paths', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const state = createCompareResultsWebviewState({
    kind: 'worktree',
    repository,
    target: { refName: 'feature', label: 'feature' },
    changes: [
      createChange({
        uriPath: '/workspace/repo/src/new-name.ts',
        originalPath: '/workspace/repo/src/old-name.ts',
        renamePath: '/workspace/repo/src/new-name.ts',
        status: Status.INDEX_RENAMED
      })
    ]
  });

  assert.equal(state.kind, 'results');
  assert.equal(state.summary, 'feature <-> worktree • 1 file changed');
  assert.equal(state.sourceLabel, 'feature');
  assert.equal(state.targetLabel, 'Worktree');
  assert.equal(state.canOpenUnifiedDiff, true);
  assert.equal(state.items[0].path, 'src/new-name.ts');
  assert.equal(state.items[0].originalPath, 'src/old-name.ts');
  assert.equal(state.items[0].name, 'new-name.ts');
  assert.equal(state.items[0].directory, 'src');
  assert.equal(state.items[0].fullPath, '/workspace/repo/src/new-name.ts');
  assert.equal(state.items[0].worktreeRef, 'feature');
  assert.equal(state.items[0].worktreeLabel, 'feature');
});

test('getCompareResultItems returns item ids for provider lookup', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const items = getCompareResultItems({
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [createChange({ uriPath: '/workspace/repo/src/app.ts', status: Status.MODIFIED })]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'src/app.ts::Modified::::::main');
});

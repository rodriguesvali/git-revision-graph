import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCompareResultsWorktreeRefresh,
  buildCompareResultItems,
  buildCompareResultsMessage,
  isCompareResultsStateForRepository
} from '../src/compareResultsShared';
import { createChange, createRepository } from './fakes';
import { Status } from '../src/git';

test('identical compare paths and refs in different repositories have different item identities', () => {
  const items = ['/workspace/one', '/workspace/two'].map((root) => buildCompareResultItems(
    createRepository({ root }), [createChange({ uriPath: `${root}/same.ts`, status: Status.MODIFIED })],
    'main', 'feature', undefined, undefined
  )[0]);
  assert.notEqual(items[0].id, items[1].id);
});

test('matches Compare Results state only to its owning repository', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const otherRepository = createRepository({ root: '/workspace/other' });
  const state = {
    kind: 'between' as const,
    repository,
    left: { refName: 'main', label: 'main' },
    right: { refName: 'feature', label: 'feature' },
    changes: []
  };

  assert.equal(isCompareResultsStateForRepository(state, repository), true);
  assert.equal(isCompareResultsStateForRepository(state, otherRepository), false);
  assert.equal(isCompareResultsStateForRepository({ kind: 'empty' }, repository), false);
});

test('buildCompareResultItems marks ref-to-ref entries with the between context value', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const items = buildCompareResultItems(
    repository,
    [createChange({ uriPath: '/workspace/repo/src/b.ts', status: Status.MODIFIED })],
    'main',
    'release/2026',
    undefined,
    undefined
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].label, 'src/b.ts');
  assert.deepEqual(JSON.parse(items[0].id), ['/workspace/repo', 'src/b.ts', 'Modified', 'main', 'release/2026', '']);
});

test('buildCompareResultItems marks worktree entries with the worktree context value', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const items = buildCompareResultItems(
    repository,
    [createChange({ uriPath: '/workspace/repo/src/a.ts', status: Status.MODIFIED })],
    undefined,
    undefined,
    'main',
    'main'
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].worktreeLabel, 'main');
  assert.deepEqual(JSON.parse(items[0].id), ['/workspace/repo', 'src/a.ts', 'Modified', '', '', 'main']);
});

test('applyCompareResultsWorktreeRefresh clears the view state when the worktree becomes aligned', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const outcome = applyCompareResultsWorktreeRefresh(
    {
      kind: 'worktree',
      repository,
      target: { refName: 'main', label: 'main' },
      changes: [createChange({ uriPath: '/workspace/repo/src/a.ts', status: Status.MODIFIED })]
    },
    repository,
    'main',
    []
  );

  assert.deepEqual(outcome, {
    nextState: { kind: 'empty' },
    infoMessage: 'The worktree is now aligned with main.'
  });
});

test('applyCompareResultsWorktreeRefresh preserves the worktree state when changes remain', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const changes = [createChange({ uriPath: '/workspace/repo/src/a.ts', status: Status.MODIFIED })];
  const outcome = applyCompareResultsWorktreeRefresh(
    {
      kind: 'worktree',
      repository,
      target: { refName: 'main', label: 'main' },
      changes
    },
    repository,
    'main',
    changes
  );

  assert.deepEqual(outcome, {
    nextState: {
      kind: 'worktree',
      repository,
      target: { refName: 'main', label: 'main' },
      changes
    },
    infoMessage: undefined
  });
});

test('buildCompareResultsMessage reflects worktree comparisons', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const message = buildCompareResultsMessage({
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [createChange({ uriPath: '/workspace/repo/src/file.ts', status: Status.MODIFIED })]
  });

  assert.equal(message, 'main <-> worktree • 1 file changed');
});

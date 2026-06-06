import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshCompareResultsWorktreeComparison } from '../src/compareResults/worktreeRefresh';
import type { CompareResultsState } from '../src/compareResultsShared';
import { createChange, createRepository } from './fakes';

test('refreshCompareResultsWorktreeComparison loads worktree changes and updates matching state', async () => {
  const change = createChange({ uriPath: '/workspace/repo/src/demo.ts' });
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: [change]
  });
  const state: CompareResultsState = {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: []
  };

  const outcome = await refreshCompareResultsWorktreeComparison(state, repository, 'main');

  assert.deepEqual(outcome, {
    nextState: {
      ...state,
      changes: [change]
    },
    infoMessage: undefined
  });
});

test('refreshCompareResultsWorktreeComparison clears matching state when the worktree is aligned', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: []
  });
  const state: CompareResultsState = {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [createChange({ uriPath: '/workspace/repo/src/demo.ts' })]
  };

  const outcome = await refreshCompareResultsWorktreeComparison(state, repository, 'main');

  assert.deepEqual(outcome, {
    nextState: { kind: 'empty' },
    infoMessage: 'The worktree is now aligned with main.'
  });
});

test('refreshCompareResultsWorktreeComparison ignores stale state after loading changes', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: [createChange({ uriPath: '/workspace/repo/src/demo.ts' })]
  });
  const state: CompareResultsState = {
    kind: 'between',
    repository,
    left: { refName: 'main', label: 'main' },
    right: { refName: 'feature', label: 'feature' },
    changes: []
  };

  const outcome = await refreshCompareResultsWorktreeComparison(state, repository, 'main');

  assert.equal(outcome, undefined);
});

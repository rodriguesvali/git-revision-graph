import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prepareCompareResultsWorktreeUnifiedDiff,
  refreshCompareResultsWorktreeComparison
} from '../src/compareResults/worktreeRefresh';
import type { CompareResultsState } from '../src/compareResultsShared';
import { Status } from '../src/git';
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

test('refreshCompareResultsWorktreeComparison discards a response when the panel state changes in flight', async () => {
  let currentState: CompareResultsState;
  const repository = {
    ...createRepository({ root: '/workspace/repo' }),
    async diffWith() {
      currentState = { kind: 'empty' };
      return [createChange({ uriPath: '/workspace/repo/src/demo.ts' })];
    }
  };
  const state: CompareResultsState = {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: []
  };
  currentState = state;

  const outcome = await refreshCompareResultsWorktreeComparison(
    state,
    repository,
    'main',
    () => currentState
  );

  assert.equal(outcome, undefined);
});

test('prepareCompareResultsWorktreeUnifiedDiff uses freshly loaded untracked paths', async () => {
  const refreshedChanges = [
    createChange({ uriPath: '/workspace/repo/src/tracked.ts', status: Status.MODIFIED }),
    createChange({ uriPath: '/workspace/repo/src/new file.ts', status: Status.UNTRACKED })
  ];
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: refreshedChanges
  });
  const state: Extract<CompareResultsState, { readonly kind: 'worktree' }> = {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [createChange({ uriPath: '/workspace/repo/stale.txt', status: Status.UNTRACKED })]
  };

  const preparation = await prepareCompareResultsWorktreeUnifiedDiff(state, () => state);

  assert.deepEqual(preparation, {
    nextState: {
      ...state,
      changes: refreshedChanges
    },
    infoMessage: undefined,
    request: {
      repository,
      refName: 'main',
      label: 'main',
      untrackedPaths: ['src/new file.ts']
    }
  });
});

test('prepareCompareResultsWorktreeUnifiedDiff skips generation when the worktree is aligned', async () => {
  const repository = createRepository({ root: '/workspace/repo', diffWith: [] });
  const state: Extract<CompareResultsState, { readonly kind: 'worktree' }> = {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [createChange({ uriPath: '/workspace/repo/src/demo.ts' })]
  };

  const preparation = await prepareCompareResultsWorktreeUnifiedDiff(state, () => state);

  assert.deepEqual(preparation, {
    nextState: { kind: 'empty' },
    infoMessage: 'The worktree is now aligned with main.',
    request: undefined
  });
});

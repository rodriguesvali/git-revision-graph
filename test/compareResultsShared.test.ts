import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCompareResultsWorktreeRefresh,
  buildCompareResultItems,
  buildCompareResultsMessage
} from '../src/compareResultsShared';
import { createChange, createRepository } from './fakes';
import { Status } from '../src/git';

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
  assert.match(items[0].id, /^src\/b\.ts::Modified::main::release\/2026::$/);
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
  assert.match(items[0].id, /^src\/a\.ts::Modified::::::main$/);
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

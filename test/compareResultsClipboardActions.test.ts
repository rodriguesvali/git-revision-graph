import test from 'node:test';
import assert from 'node:assert/strict';

import {
  copyCompareBriefingToClipboard,
  copyCompareResultFileNames,
  copyCompareResultFullPaths
} from '../src/compareResults/clipboardActions';
import { getCompareResultItems } from '../src/compareResults/viewState';
import type { CompareResultsState } from '../src/compareResultsShared';
import { createChange, createRepository } from './fakes';

test('copyCompareResultFileNames writes selected file names in view order', async () => {
  const state = createWorktreeState();
  const items = getCompareResultItems(state);
  const writes: string[] = [];

  const copied = await copyCompareResultFileNames(
    state,
    [
      items.find((item) => item.label === 'src/b.ts')?.id ?? '',
      items.find((item) => item.label === 'src/a.ts')?.id ?? ''
    ],
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ['a.ts\nb.ts']);
});

test('copyCompareResultFullPaths writes selected full paths', async () => {
  const state = createWorktreeState();
  const items = getCompareResultItems(state);
  const writes: string[] = [];

  const copied = await copyCompareResultFullPaths(
    state,
    [items.find((item) => item.label === 'src/a.ts')?.id ?? ''],
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ['/workspace/repo/src/a.ts']);
});

test('copyCompareResultFileNames ignores empty or stale selections', async () => {
  const writes: string[] = [];

  const copied = await copyCompareResultFileNames(
    createWorktreeState(),
    ['missing'],
    {
      async writeText(text) {
        writes.push(text);
      }
    }
  );

  assert.equal(copied, false);
  assert.deepEqual(writes, []);
});

test('copyCompareBriefingToClipboard writes only a ready briefing', async () => {
  const writes: string[] = [];
  const clipboard = {
    async writeText(text: string) {
      writes.push(text);
    }
  };

  assert.equal(await copyCompareBriefingToClipboard({ kind: 'idle' }, clipboard), false);
  assert.equal(await copyCompareBriefingToClipboard({
    kind: 'ready',
    content: 'Summary\nReview the authentication changes.'
  }, clipboard), true);
  assert.deepEqual(writes, ['Summary\nReview the authentication changes.']);
});

function createWorktreeState(): CompareResultsState {
  const repository = createRepository({ root: '/workspace/repo' });
  return {
    kind: 'worktree',
    repository,
    target: { refName: 'main', label: 'main' },
    changes: [
      createChange({ uriPath: '/workspace/repo/src/a.ts' }),
      createChange({ uriPath: '/workspace/repo/src/b.ts' })
    ]
  };
}

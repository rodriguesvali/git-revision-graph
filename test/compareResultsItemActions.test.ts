import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareCompareResultItemWithWorktree,
  getCompareResultItemFileName,
  getCompareResultItemFileNameList,
  getCompareResultItemFullPath,
  getCompareResultItemFullPathList,
  getCompareResultItemWorktreeComparisonRef,
  openCompareResultItem
} from '../src/compareResults/itemActions';
import type { CompareResultItem } from '../src/compareResultsShared';
import type { Change, Repository } from '../src/git';
import { createChange, createRepository } from './fakes';

test('openCompareResultItem opens between-ref items against both refs', async () => {
  const item = createItem({ leftRef: 'main', rightRef: 'feature' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly leftRef: string; readonly rightRef: string }> = [];

  await openCompareResultItem(item, {
    async openChangeDiffBetweenRefs(repository, change, leftRef, rightRef) {
      calls.push({ repository, change, leftRef, rightRef });
    },
    async openChangeDiffWithWorktree() {
      throw new Error('Unexpected worktree diff.');
    }
  });

  assert.deepEqual(calls, [
    { repository: item.repository, change: item.change, leftRef: 'main', rightRef: 'feature' }
  ]);
});

test('openCompareResultItem opens worktree items against the worktree ref', async () => {
  const item = createItem({ worktreeRef: 'main' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly ref: string }> = [];

  await openCompareResultItem(item, {
    async openChangeDiffBetweenRefs() {
      throw new Error('Unexpected ref diff.');
    },
    async openChangeDiffWithWorktree(repository, change, ref) {
      calls.push({ repository, change, ref });
    }
  });

  assert.deepEqual(calls, [
    { repository: item.repository, change: item.change, ref: 'main' }
  ]);
});

test('compareCompareResultItemWithWorktree prefers worktree, right, then left refs', async () => {
  const refs = [
    createItem({ worktreeRef: 'worktree-ref', rightRef: 'right', leftRef: 'left' }),
    createItem({ rightRef: 'right', leftRef: 'left' }),
    createItem({ leftRef: 'left' })
  ];
  const calls: string[] = [];

  for (const item of refs) {
    await compareCompareResultItemWithWorktree(item, {
      async openChangeDiffBetweenRefs() {
        throw new Error('Unexpected ref diff.');
      },
      async openChangeDiffWithWorktree(_repository, _change, ref) {
        calls.push(ref);
      }
    });
  }

  assert.deepEqual(calls, ['worktree-ref', 'right', 'left']);
});

test('compareCompareResultItemWithWorktree ignores items without refs', async () => {
  await compareCompareResultItemWithWorktree(createItem({}), {
    async openChangeDiffBetweenRefs() {
      throw new Error('Unexpected ref diff.');
    },
    async openChangeDiffWithWorktree() {
      throw new Error('Unexpected worktree diff.');
    }
  });
});

test('compare result item paths prefer rename targets', () => {
  const item = createItem({
    change: createChange({
      uriPath: '/workspace/repo/src/old-name.ts',
      renamePath: '/workspace/repo/src/new-name.ts'
    })
  });

  assert.equal(getCompareResultItemFileName(item), 'new-name.ts');
  assert.equal(getCompareResultItemFullPath(item), '/workspace/repo/src/new-name.ts');
});

test('compare result item path lists preserve item order', () => {
  const items = [
    createItem({ change: createChange({ uriPath: '/workspace/repo/src/a.ts' }) }),
    createItem({ change: createChange({ uriPath: '/workspace/repo/src/b.ts' }) })
  ];

  assert.equal(getCompareResultItemFileNameList(items), 'a.ts\nb.ts');
  assert.equal(getCompareResultItemFullPathList(items), '/workspace/repo/src/a.ts\n/workspace/repo/src/b.ts');
});

test('getCompareResultItemWorktreeComparisonRef exposes the selected fallback ref', () => {
  assert.equal(getCompareResultItemWorktreeComparisonRef(createItem({ worktreeRef: 'main', rightRef: 'right', leftRef: 'left' })), 'main');
  assert.equal(getCompareResultItemWorktreeComparisonRef(createItem({ rightRef: 'right', leftRef: 'left' })), 'right');
  assert.equal(getCompareResultItemWorktreeComparisonRef(createItem({ leftRef: 'left' })), 'left');
  assert.equal(getCompareResultItemWorktreeComparisonRef(createItem({})), undefined);
});

function createItem(overrides: {
  readonly change?: Change;
  readonly leftRef?: string;
  readonly rightRef?: string;
  readonly worktreeRef?: string;
}): CompareResultItem {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = overrides.change ?? createChange({ uriPath: '/workspace/repo/src/app.ts' });
  return {
    id: 'src/app.ts::Modified::main::feature::',
    repository,
    change,
    label: 'src/app.ts',
    description: 'src/app.ts',
    detail: 'Modified',
    leftRef: overrides.leftRef,
    rightRef: overrides.rightRef,
    worktreeRef: overrides.worktreeRef,
    worktreeLabel: overrides.worktreeRef
  };
}

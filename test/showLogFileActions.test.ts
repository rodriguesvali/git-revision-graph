import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareShowLogFileChangeWithWorktree,
  getShowLogChangeFileName,
  getShowLogChangeFullPath,
  getShowLogFileChangeParentHash,
  openShowLogFileChange,
  SHOW_LOG_EMPTY_TREE_HASH
} from '../src/showLog/fileActions';
import type { Change, Repository } from '../src/git';
import { createChange, createRepository, createRevisionLogEntry } from './fakes';

test('getShowLogFileChangeParentHash returns the first parent for a commit', () => {
  assert.equal(
    getShowLogFileChangeParentHash(
      [
        createRevisionLogEntry({
          hash: 'abc123',
          parentHashes: ['parent1', 'parent2']
        })
      ],
      'abc123'
    ),
    'parent1'
  );
});

test('getShowLogFileChangeParentHash falls back to the empty tree hash', () => {
  assert.equal(getShowLogFileChangeParentHash([], 'root'), SHOW_LOG_EMPTY_TREE_HASH);
});

test('show log file action paths prefer rename targets', () => {
  const change = createChange({
    uriPath: '/workspace/repo/src/old-name.ts',
    renamePath: '/workspace/repo/src/new-name.ts'
  });

  assert.equal(getShowLogChangeFullPath(change), '/workspace/repo/src/new-name.ts');
  assert.equal(getShowLogChangeFileName(change), 'new-name.ts');
});

test('show log file action paths use the change uri when not renamed', () => {
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });

  assert.equal(getShowLogChangeFullPath(change), '/workspace/repo/src/app.ts');
  assert.equal(getShowLogChangeFileName(change), 'app.ts');
});

test('openShowLogFileChange opens the diff against the first parent', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly leftRef: string; readonly rightRef: string }> = [];

  await openShowLogFileChange(
    repository,
    [createRevisionLogEntry({ hash: 'abc123', parentHashes: ['parent1'] })],
    'abc123',
    change,
    {
      async openChangeDiffBetweenRefs(repository, change, leftRef, rightRef) {
        calls.push({ repository, change, leftRef, rightRef });
      },
      async openChangeDiffWithWorktree() {
        throw new Error('Unexpected worktree diff.');
      }
    }
  );

  assert.deepEqual(calls, [
    { repository, change, leftRef: 'parent1', rightRef: 'abc123' }
  ]);
});

test('compareShowLogFileChangeWithWorktree opens the worktree diff', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly ref: string }> = [];

  await compareShowLogFileChangeWithWorktree(
    repository,
    'abc123',
    change,
    {
      async openChangeDiffBetweenRefs() {
        throw new Error('Unexpected ref diff.');
      },
      async openChangeDiffWithWorktree(repository, change, ref) {
        calls.push({ repository, change, ref });
      }
    }
  );

  assert.deepEqual(calls, [
    { repository, change, ref: 'abc123' }
  ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareShowLogFileChangeWithWorktree,
  getShowLogChangeFileName,
  getShowLogChangeFullPath,
  getShowLogFileChangeParentHash,
  openShowLogFileChange
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
  assert.equal(getShowLogFileChangeParentHash([], 'a'.repeat(40)), '4b825dc642cb6eb9a060e54bf8d69288fbee4904');
});

test('root file diff uses the SHA-256 empty tree for SHA-256 commits', () => {
  const hash = 'a'.repeat(64);
  assert.equal(getShowLogFileChangeParentHash([createRevisionLogEntry({ hash, parentHashes: [] })], hash),
    '6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321');
});

test('root file diff rejects malformed commit object IDs', () => {
  assert.throws(() => getShowLogFileChangeParentHash([], 'root'), /full SHA-1 or SHA-256/);
});

test('opening a SHA-256 root file passes the corresponding empty tree to the diff', async () => {
  const hash = 'a'.repeat(64);
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/file' });
  let left = '';
  await openShowLogFileChange(repository, [createRevisionLogEntry({ hash, parentHashes: [] })], hash, change, {
    async openChangeDiffBetweenRefs(_repository, _change, leftRef) { left = leftRef; },
    async openChangeDiffWithWorktree() { throw new Error('Unexpected worktree diff.'); }
  });
  assert.equal(left, '6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321');
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

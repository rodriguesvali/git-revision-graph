import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCompareResultRestorePlanInsideRepository,
  buildCompareResultRestorePlan,
  isPathInsideRepository
} from '../src/compareResultRestore';
import { Status } from '../src/git';
import { createChange } from './fakes';

test('buildCompareResultRestorePlan deletes added worktree files', () => {
  const plan = buildCompareResultRestorePlan(
    createChange({ uriPath: '/workspace/repo/src/new.ts', status: Status.UNTRACKED })
  );

  assert.deepEqual(plan, [
    {
      kind: 'delete',
      targetPath: '/workspace/repo/src/new.ts'
    }
  ]);
});

test('buildCompareResultRestorePlan restores modified files from the compared ref', () => {
  const plan = buildCompareResultRestorePlan(
    createChange({ uriPath: '/workspace/repo/src/file.ts', status: Status.MODIFIED })
  );

  assert.deepEqual(plan, [
    {
      kind: 'write-ref',
      refPath: '/workspace/repo/src/file.ts',
      targetPath: '/workspace/repo/src/file.ts'
    }
  ]);
});

test('buildCompareResultRestorePlan restores renames back to the ref path', () => {
  const plan = buildCompareResultRestorePlan(
    createChange({
      uriPath: '/workspace/repo/src/new-name.ts',
      originalPath: '/workspace/repo/src/old-name.ts',
      renamePath: '/workspace/repo/src/new-name.ts',
      status: Status.INDEX_RENAMED
    })
  );

  assert.deepEqual(plan, [
    {
      kind: 'delete',
      targetPath: '/workspace/repo/src/new-name.ts'
    },
    {
      kind: 'write-ref',
      refPath: '/workspace/repo/src/old-name.ts',
      targetPath: '/workspace/repo/src/old-name.ts'
    }
  ]);
});

test('isPathInsideRepository rejects paths outside the repository root', () => {
  assert.equal(isPathInsideRepository('/workspace/repo', '/workspace/repo/src/file.ts'), true);
  assert.equal(isPathInsideRepository('/workspace/repo', '/workspace/repo2/src/file.ts'), false);
  assert.equal(isPathInsideRepository('/workspace/repo', '/workspace/repo'), false);
});

test('assertCompareResultRestorePlanInsideRepository rejects unsafe restore targets', () => {
  assert.throws(
    () => assertCompareResultRestorePlanInsideRepository('/workspace/repo', [
      { kind: 'delete', targetPath: '/workspace/repo2/file.ts' }
    ]),
    /outside the selected repository/
  );

  assert.throws(
    () => assertCompareResultRestorePlanInsideRepository('/workspace/repo', [
      { kind: 'write-ref', refPath: '/workspace/repo/src/file.ts', targetPath: '/workspace/other/file.ts' }
    ]),
    /outside the selected repository/
  );
});

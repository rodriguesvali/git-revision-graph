import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildShowLogFileRevertConfirmationMessage,
  revertShowLogFileChangeToCommit,
  type ShowLogFileRestoreServices
} from '../src/showLog/fileRestoreAction';
import type { Change, Repository } from '../src/git';
import { createChange, createRepository } from './fakes';

test('buildShowLogFileRevertConfirmationMessage uses a repository relative path and short commit hash', () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });

  assert.equal(
    buildShowLogFileRevertConfirmationMessage(repository, 'abcdef1234567890', change),
    'Revert src/app.ts in the worktree to abcdef1?'
  );
});

test('revertShowLogFileChangeToCommit restores from the selected commit side after confirmation', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly ref: string; readonly sourceSide: string }> = [];
  const restored = await revertShowLogFileChangeToCommit(
    repository,
    'abc123',
    change,
    createServices({
      async restoreWorktreeChangeFromRef(repository, change, ref, sourceSide) {
        calls.push({ repository, change, ref, sourceSide });
      }
    })
  );

  assert.equal(restored, true);
  assert.deepEqual(calls, [
    { repository, change, ref: 'abc123', sourceSide: 'right' }
  ]);
});

test('revertShowLogFileChangeToCommit restores without confirmation when the workspace copy is clean', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const restored = await revertShowLogFileChangeToCommit(
    repository,
    'abc123',
    change,
    createServices({
      async hasWorktreeChangeForCompareResultRestore() {
        return false;
      },
      async showWarningMessage() {
        throw new Error('Unexpected confirmation.');
      }
    })
  );

  assert.equal(restored, true);
});

test('revertShowLogFileChangeToCommit cancels when confirmation is dismissed', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const restored = await revertShowLogFileChangeToCommit(
    repository,
    'abc123',
    change,
    createServices({
      async showWarningMessage() {
        return undefined;
      },
      async restoreWorktreeChangeFromRef() {
        throw new Error('Unexpected restore.');
      }
    })
  );

  assert.equal(restored, false);
});

test('revertShowLogFileChangeToCommit reports restore failures', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/src/app.ts' });
  const errors: string[] = [];
  const restored = await revertShowLogFileChangeToCommit(
    repository,
    'abc123',
    change,
    createServices({
      async restoreWorktreeChangeFromRef() {
        throw new Error('Permission denied.');
      },
      async showErrorMessage(message) {
        errors.push(message);
      }
    })
  );

  assert.equal(restored, false);
  assert.deepEqual(errors, [
    'Could not revert the file to the selected commit. Permission denied.'
  ]);
});

function createServices(
  overrides: Partial<ShowLogFileRestoreServices> = {}
): ShowLogFileRestoreServices {
  return {
    async showWarningMessage() {
      return 'Revert File';
    },
    async showErrorMessage() {},
    async hasWorktreeChangeForCompareResultRestore() {
      return true;
    },
    async restoreWorktreeChangeFromRef() {},
    ...overrides
  };
}

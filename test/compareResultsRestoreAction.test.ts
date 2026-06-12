import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCompareResultRestoreConfirmationMessage,
  restoreCompareResultItemToWorktree,
  type CompareResultsRestoreServices
} from '../src/compareResults/restoreAction';
import type { Change, Repository } from '../src/git';
import { createCompareResultItem } from './fakes';

test('buildCompareResultRestoreConfirmationMessage uses the worktree label', () => {
  assert.equal(
    buildCompareResultRestoreConfirmationMessage(
      createCompareResultItem({ worktreeRef: 'refs/heads/main', worktreeLabel: 'main' })
    ),
    'Revert src/app.ts in the worktree to main?'
  );
});

test('buildCompareResultRestoreConfirmationMessage uses the right ref for ref-to-ref items', () => {
  assert.equal(
    buildCompareResultRestoreConfirmationMessage(createCompareResultItem({ leftRef: 'origin/main', rightRef: 'main' })),
    'Revert src/app.ts in the worktree to main?'
  );
});

test('restoreCompareResultItemToWorktree ignores items without a restore ref', async () => {
  const restored = await restoreCompareResultItemToWorktree(createCompareResultItem(), createServices());

  assert.equal(restored, false);
});

test('restoreCompareResultItemToWorktree restores worktree compare items after confirmation when locally changed', async () => {
  const item = createCompareResultItem({ worktreeRef: 'main', worktreeLabel: 'main' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly ref: string; readonly sourceSide: string }> = [];
  const restored = await restoreCompareResultItemToWorktree(
    item,
    createServices({
      async restoreWorktreeChangeFromRef(repository, change, ref, sourceSide) {
        calls.push({ repository, change, ref, sourceSide });
      }
    })
  );

  assert.equal(restored, true);
  assert.deepEqual(calls, [
    { repository: item.repository, change: item.change, ref: 'main', sourceSide: 'left' }
  ]);
});

test('restoreCompareResultItemToWorktree restores ref-to-ref items from the right side', async () => {
  const item = createCompareResultItem({ leftRef: 'origin/main', rightRef: 'main' });
  const calls: Array<{ readonly ref: string; readonly sourceSide: string }> = [];
  const restored = await restoreCompareResultItemToWorktree(
    item,
    createServices({
      async restoreWorktreeChangeFromRef(_repository, _change, ref, sourceSide) {
        calls.push({ ref, sourceSide });
      }
    })
  );

  assert.equal(restored, true);
  assert.deepEqual(calls, [
    { ref: 'main', sourceSide: 'right' }
  ]);
});

test('restoreCompareResultItemToWorktree restores without confirmation when the workspace copy is clean', async () => {
  const item = createCompareResultItem({ rightRef: 'main' });
  const restored = await restoreCompareResultItemToWorktree(
    item,
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

test('restoreCompareResultItemToWorktree cancels when confirmation is dismissed', async () => {
  const item = createCompareResultItem({ worktreeRef: 'main' });
  const restored = await restoreCompareResultItemToWorktree(
    item,
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

test('restoreCompareResultItemToWorktree reports restore failures', async () => {
  const errors: string[] = [];
  const restored = await restoreCompareResultItemToWorktree(
    createCompareResultItem({ worktreeRef: 'main' }),
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
    'Could not revert the file to the selected revision. Permission denied.'
  ]);
});

function createServices(
  overrides: Partial<CompareResultsRestoreServices> = {}
): CompareResultsRestoreServices {
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

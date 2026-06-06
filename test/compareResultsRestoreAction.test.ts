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
    'Restore src/app.ts in the worktree from main?'
  );
});

test('buildCompareResultRestoreConfirmationMessage falls back to the worktree ref', () => {
  assert.equal(
    buildCompareResultRestoreConfirmationMessage(createCompareResultItem({ worktreeRef: 'main' })),
    'Restore src/app.ts in the worktree from main?'
  );
});

test('restoreCompareResultItemToWorktree ignores items without a worktree ref', async () => {
  const restored = await restoreCompareResultItemToWorktree(createCompareResultItem(), createServices());

  assert.equal(restored, false);
});

test('restoreCompareResultItemToWorktree restores after confirmation', async () => {
  const item = createCompareResultItem({ worktreeRef: 'main', worktreeLabel: 'main' });
  const calls: Array<{ readonly repository: Repository; readonly change: Change; readonly ref: string }> = [];
  const restored = await restoreCompareResultItemToWorktree(
    item,
    createServices({
      async restoreWorktreeChangeFromRef(repository, change, ref) {
        calls.push({ repository, change, ref });
      }
    })
  );

  assert.equal(restored, true);
  assert.deepEqual(calls, [
    { repository: item.repository, change: item.change, ref: 'main' }
  ]);
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
      return 'Restore File';
    },
    async showErrorMessage() {},
    async restoreWorktreeChangeFromRef() {},
    ...overrides
  };
}

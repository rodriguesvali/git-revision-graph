import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCompareResultRestoreConfirmationMessage,
  restoreCompareResultItemToWorktree,
  type CompareResultsRestoreServices
} from '../src/compareResults/restoreAction';
import { RefType, type Change, type Repository } from '../src/git';
import { createCompareResultItem, createRepository, createBranch } from './fakes';

test('buildCompareResultRestoreConfirmationMessage uses the worktree label', () => {
  assert.equal(
    buildCompareResultRestoreConfirmationMessage(
      createAttachedItem({ worktreeRef: 'refs/heads/main', worktreeLabel: 'main' })
    ),
    'Revert src/app.ts in the worktree to main?'
  );
});

test('ineligible ref-to-ref items have no restore source', () => {
  assert.equal(
    buildCompareResultRestoreConfirmationMessage(createCompareResultItem({ leftRef: 'origin/main', rightRef: 'main' })),
    'Revert src/app.ts in the worktree to the selected revision?'
  );
});

test('restoreCompareResultItemToWorktree ignores items without a restore ref', async () => {
  const restored = await restoreCompareResultItemToWorktree(createCompareResultItem(), createServices());

  assert.equal(restored, false);
});

test('Compare Results rejects ref-to-ref restore requests before inspection or confirmation', async () => {
  const calls: string[] = [];
  const services = createServices({
    async hasWorktreeChangeForCompareResultRestore() { calls.push('inspect'); return true; },
    async showWarningMessage() { calls.push('confirm'); return 'Revert File'; },
    async restoreWorktreeChangeFromRef() { calls.push('restore'); }
  });
  for (const item of [
    createCompareResultItem({ leftRef: 'main', rightRef: 'feature' }),
    createCompareResultItem({ leftRef: 'main' }),
    createCompareResultItem({ leftRef: 'HEAD', rightRef: 'feature' })
  ]) {
    assert.equal(await restoreCompareResultItemToWorktree(item, services), false);
  }
  assert.deepEqual(calls, []);
});

test('restoreCompareResultItemToWorktree restores worktree compare items after confirmation when locally changed', async () => {
  const item = createAttachedItem({ worktreeRef: 'main', worktreeLabel: 'main' });
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

test('Revert restores the selected tag to the worktree when the workspace is on main', async () => {
  const item = createAttachedItem({ worktreeRef: 'v22.3.0-next.2', worktreeLabel: 'v22.3.0-next.2' });
  const calls: string[] = [];
  assert.equal(await restoreCompareResultItemToWorktree(item, createServices({
    async restoreWorktreeChangeFromRef(_repository, _change, ref, side) { calls.push(ref, side); }
  })), true);
  assert.deepEqual(calls, ['v22.3.0-next.2', 'left']);
});

test('restoreCompareResultItemToWorktree refuses ref-to-ref items', async () => {
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

  assert.equal(restored, false);
  assert.deepEqual(calls, []);
});

test('restoreCompareResultItemToWorktree restores without confirmation when the workspace copy is clean', async () => {
  const item = createAttachedItem({ worktreeRef: 'main' });
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
  const item = createAttachedItem({ worktreeRef: 'main' });
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
    createAttachedItem({ worktreeRef: 'main' }),
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

test('Revert keeps the selected source when the attached branch changes during confirmation', async () => {
  const item = createAttachedItem({ worktreeRef: 'main' });
  let restored = false;
  const outcome = await restoreCompareResultItemToWorktree(item, createServices({
    async showWarningMessage() {
      Object.assign(item.repository.state, { HEAD: createBranch({ type: RefType.Head, name: 'feature' }) });
      return 'Revert File';
    },
    async restoreWorktreeChangeFromRef() { restored = true; }
  }));
  assert.equal(outcome, true);
  assert.equal(restored, true);
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

function createAttachedItem(overrides: Parameters<typeof createCompareResultItem>[0] = {}) {
  return createCompareResultItem({ repository: createRepository({ root: '/workspace/repo', head: createBranch({ type: RefType.Head, name: 'main' }) }), ...overrides });
}

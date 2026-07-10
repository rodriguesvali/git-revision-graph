import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import { withCurrentStateBeforeBlockingMessage } from '../src/revisionGraph/blockingMessageState';

test('Flow Governance clears graph loading before awaiting a modal information result', async () => {
  const events: string[] = [];
  let closeDialog: (() => void) | undefined;
  const services = createServices({
    async showInformationMessage(_message, options) {
      events.push(options?.modal ? 'show-modal-information' : 'show-information');
      await new Promise<void>((resolve) => {
        closeDialog = resolve;
      });
    }
  });
  const guarded = withCurrentStateBeforeBlockingMessage(services, () => {
    events.push('post-current-state');
  });

  const resultPromise = guarded.ui.showInformationMessage('Promotion is ready.', { modal: true });
  const resultBeforeDismissal = await Promise.race([
    Promise.resolve(resultPromise).then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(events, ['post-current-state', 'show-modal-information']);

  closeDialog?.();
  await resultPromise;
});

test('Flow Governance clears graph loading before awaiting a modal warning result', async () => {
  const events: string[] = [];
  const services = createServices({
    async showWarningMessage(_message, options) {
      events.push(options?.modal ? 'show-modal-warning' : 'show-warning');
    }
  });
  const guarded = withCurrentStateBeforeBlockingMessage(services, () => {
    events.push('post-current-state');
  });

  await guarded.ui.showWarningMessage('Promotion is blocked.', { modal: true });

  assert.deepEqual(events, ['post-current-state', 'show-modal-warning']);
});

function createServices(
  ui: Partial<RefActionServices['ui']>
): RefActionServices {
  return {
    ui: {
      showInformationMessage() {},
      showWarningMessage() {},
      async showErrorMessage() {},
      ...ui
    }
  } as unknown as RefActionServices;
}

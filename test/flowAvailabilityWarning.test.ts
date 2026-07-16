import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE,
  showFlowGovernanceUnavailableWarning
} from '../src/revisionGraph/flow/flowAvailabilityWarning';

test('missing Flow Governance configuration blocks the action with an awaited modal warning', async () => {
  const requests: Array<{
    readonly message: string;
    readonly options: { readonly modal?: boolean } | undefined;
  }> = [];
  let dismissWarning: (() => void) | undefined;

  const warningPromise = showFlowGovernanceUnavailableWarning({
    async showWarningMessage(message, options) {
      requests.push({ message, options });
      await new Promise<void>((resolve) => {
        dismissWarning = resolve;
      });
    }
  });
  const resultBeforeDismissal = await Promise.race([
    warningPromise.then(() => 'completed' as const),
    new Promise<'pending'>((resolve) => setImmediate(() => resolve('pending')))
  ]);

  assert.equal(resultBeforeDismissal, 'pending');
  assert.deepEqual(requests, [{
    message: FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE,
    options: { modal: true }
  }]);

  dismissWarning?.();
  await warningPromise;
});

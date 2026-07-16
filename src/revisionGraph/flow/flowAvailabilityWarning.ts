import type { RefActionUi } from '../../refActions/types';

export const FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE = 'Flow Governance is not available for this repository.';

export async function showFlowGovernanceUnavailableWarning(
  ui: Pick<RefActionUi, 'showWarningMessage'>
): Promise<void> {
  await ui.showWarningMessage(FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE, { modal: true });
}

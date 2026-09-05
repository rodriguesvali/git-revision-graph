import type { FlowConfigResolution } from './flowTypes';
import type { RefActionUi } from '../../refActions/types';

export const FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE = 'Flow Governance is not available for this repository.';

export async function showFlowGovernanceUnavailableWarning(
  ui: Pick<RefActionUi, 'showWarningMessage'>,
  resolution?: FlowConfigResolution
): Promise<void> {
  const message = !resolution ? FLOW_GOVERNANCE_UNAVAILABLE_MESSAGE
    : !resolution.ok
      ? `Flow Governance configuration error: ${resolution.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' ')} Open View > Flow Governance > Open Configuration to review it.`
      : 'Flow Governance is disabled. Enable it in the graph View menu to use this action.';
  await ui.showWarningMessage(message, { modal: true });
}

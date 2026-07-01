import { FLOW_BRANCH_KINDS } from './flowDefaults';
import {
  FlowBranchInfo,
  FlowGovernanceFilterState,
  FlowGovernanceViewState,
  FlowConfigResolution
} from './flowTypes';
import { collectFlowBranchDiagnostics, createFlowConfigDiagnostics } from './flowDiagnostics';

export function createFlowGovernanceViewState(
  resolution: FlowConfigResolution,
  references: readonly FlowBranchInfo[]
): FlowGovernanceViewState {
  const config = resolution.config;
  const enabled = resolution.ok && config.enabled;
  const filters: FlowGovernanceFilterState = {
    visibleKinds: FLOW_BRANCH_KINDS,
    hideSyncBranches: config.hideSyncBranchesByDefault,
    highlightProductionTrunk: config.highlightProductionTrunk,
    showUnknownBranches: config.showUnknownBranches
  };

  return {
    enabled,
    configSource: resolution.source,
    diagnostics: [
      ...createFlowConfigDiagnostics(resolution),
      ...collectFlowBranchDiagnostics(references)
    ],
    branchKinds: FLOW_BRANCH_KINDS,
    filters,
    references: enabled ? references : []
  };
}

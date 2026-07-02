import { FLOW_BRANCH_KINDS } from './flowDefaults';
import {
  FlowBranchInfo,
  FlowGovernanceOptionsUpdate,
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

  return {
    enabled,
    configSource: resolution.source,
    diagnostics: [
      ...createFlowConfigDiagnostics(resolution),
      ...collectFlowBranchDiagnostics(references)
    ],
    branchKinds: FLOW_BRANCH_KINDS,
    references: resolution.ok ? references : []
  };
}

export function applyFlowGovernanceOptionsUpdate(
  state: FlowGovernanceViewState,
  update: FlowGovernanceOptionsUpdate
): FlowGovernanceViewState {
  return {
    ...state,
    enabled: update.enabled ?? state.enabled
  };
}

import { FLOW_PATTERN_BRANCH_KINDS } from './flowDefaults';
import {
  FlowBranchInfo,
  FlowBranchKind,
  FlowDiagnostic,
  NormalizedFlowConfig
} from './flowTypes';

export function classifyFlowBranch(refName: string, config: NormalizedFlowConfig): FlowBranchInfo {
  const kind = getFlowBranchKind(refName, config);
  const diagnostics: FlowDiagnostic[] = [];
  if (kind === 'unknown') {
    diagnostics.push({
      code: 'unknown-branch',
      severity: 'info',
      refName,
      message: `Branch '${refName}' does not match the configured Flow Governance model.`
    });
  }

  return {
    refName,
    kind,
    isEphemeral: kind === 'sync',
    diagnostics
  };
}

export function classifyFlowBranches(
  refNames: readonly string[],
  config: NormalizedFlowConfig
): readonly FlowBranchInfo[] {
  return refNames.map((refName) => classifyFlowBranch(refName, config));
}

export function getFlowBranchKind(refName: string, config: NormalizedFlowConfig): FlowBranchKind {
  if (config.mainBranches.includes(refName)) {
    return 'main';
  }

  for (const kind of FLOW_PATTERN_BRANCH_KINDS) {
    if (new RegExp(config.patterns[kind]).test(refName)) {
      return kind;
    }
  }

  return 'unknown';
}

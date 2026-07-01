import {
  FlowBranchInfo,
  FlowConfigResolution,
  FlowDiagnostic
} from './flowTypes';

export function createFlowConfigDiagnostics(resolution: FlowConfigResolution): readonly FlowDiagnostic[] {
  if (resolution.ok) {
    return [];
  }

  return resolution.issues.map((issue) => ({
    code: 'invalid-config',
    severity: 'error',
    message: `${issue.path}: ${issue.message}`
  }));
}

export function collectFlowBranchDiagnostics(branches: readonly FlowBranchInfo[]): readonly FlowDiagnostic[] {
  return branches.flatMap((branch) => branch.diagnostics);
}

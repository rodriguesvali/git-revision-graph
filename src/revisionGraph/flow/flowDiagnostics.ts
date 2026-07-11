import {
  FlowBranchInfo,
  FlowConfigResolution,
  FlowDiagnostic,
  FlowTransitionEvaluation
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

export function createFlowTransitionDiagnostics(
  transition: FlowTransitionEvaluation,
  sourceRefName: string,
  targetRefName: string
): readonly FlowDiagnostic[] {
  if (!transition.requiresPullRequest) {
    return [];
  }

  const severity = transition.directMergeAction === 'block' ? 'error' : 'warning';
  const code = transition.directMergeAction === 'block' ? 'direct-merge-blocked' : 'pr-required';

  return [{
    code,
    severity,
    sourceRefName,
    targetRefName,
    message: transition.message ?? `Final integration from ${sourceRefName} to ${targetRefName} requires a Pull Request.`
  }];
}

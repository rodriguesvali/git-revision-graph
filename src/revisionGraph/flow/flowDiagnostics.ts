import {
  FlowBranchInfo,
  FlowConfigResolution,
  FlowDiagnostic,
  FlowPromotionReadiness,
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

export function createFlowPromotionReadinessDiagnostic(
  readiness: FlowPromotionReadiness
): FlowDiagnostic {
  switch (readiness.status) {
    case 'ready':
      return {
        code: 'release-promotion-ready',
        severity: 'info',
        refName: readiness.releaseBranch,
        sourceRefName: readiness.releaseBranch,
        targetRefName: readiness.productionBranch,
        message: readiness.message
      };
    case 'blocked':
      return {
        code: 'release-promotion-blocked',
        severity: 'warning',
        refName: readiness.releaseBranch,
        sourceRefName: readiness.releaseBranch,
        targetRefName: readiness.productionBranch,
        message: readiness.message
      };
    case 'inconclusive':
      return {
        code: 'release-promotion-inconclusive',
        severity: 'warning',
        refName: readiness.releaseBranch,
        sourceRefName: readiness.releaseBranch,
        targetRefName: readiness.productionBranch,
        message: readiness.detail
          ? `${readiness.message} ${readiness.detail}`
          : readiness.message
      };
  }
}

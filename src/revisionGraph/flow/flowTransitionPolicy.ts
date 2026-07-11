import {
  FlowBranchKind,
  FlowDirectMergeAction,
  FlowDirectMergePolicy,
  FlowTransitionEvaluation,
  FlowTransitionPolicyOptions,
  FlowTransitionRuleId
} from './flowTypes';

interface FlowTransitionRule {
  readonly id: FlowTransitionRuleId;
  readonly sourceKind: FlowBranchKind;
  readonly targetKind: FlowBranchKind;
}

export const DEFAULT_FLOW_DIRECT_MERGE_POLICY: FlowDirectMergePolicy = 'warn';

export const FLOW_GOVERNED_TRANSITION_RULES: readonly FlowTransitionRule[] = [
  { id: 'release-to-main', sourceKind: 'release', targetKind: 'main' },
  { id: 'task-to-feature', sourceKind: 'task', targetKind: 'feature' },
  { id: 'package-to-feature', sourceKind: 'package', targetKind: 'feature' },
  { id: 'hotfix-to-main', sourceKind: 'hotfix', targetKind: 'main' },
  { id: 'feature-to-release', sourceKind: 'feature', targetKind: 'release' },
  { id: 'bug-to-main', sourceKind: 'bug', targetKind: 'main' },
  { id: 'bug-to-release', sourceKind: 'bug', targetKind: 'release' },
  { id: 'bug-to-feature', sourceKind: 'bug', targetKind: 'feature' },
  { id: 'sync-to-release', sourceKind: 'sync', targetKind: 'release' }
];

export function evaluateFlowTransition(
  sourceKind: FlowBranchKind,
  targetKind: FlowBranchKind,
  options: FlowTransitionPolicyOptions = {}
): FlowTransitionEvaluation {
  const rule = findFlowTransitionRule(sourceKind, targetKind);
  const directMergePolicy = options.directMergePolicy ?? DEFAULT_FLOW_DIRECT_MERGE_POLICY;
  const requiresPullRequest = rule !== undefined;
  const directMergeAction = getDirectMergeAction(requiresPullRequest, directMergePolicy);

  return {
    sourceKind,
    targetKind,
    ruleId: rule?.id,
    requiresPullRequest,
    directMergePolicy,
    directMergeAction,
    message: rule
      ? formatFlowTransitionMessage(sourceKind, targetKind)
      : undefined
  };
}

export function isFlowGovernedTransition(sourceKind: FlowBranchKind, targetKind: FlowBranchKind): boolean {
  return findFlowTransitionRule(sourceKind, targetKind) !== undefined;
}

export function findFlowTransitionRule(
  sourceKind: FlowBranchKind,
  targetKind: FlowBranchKind
): FlowTransitionRule | undefined {
  return FLOW_GOVERNED_TRANSITION_RULES.find((rule) =>
    rule.sourceKind === sourceKind && rule.targetKind === targetKind
  );
}

function getDirectMergeAction(
  requiresPullRequest: boolean,
  directMergePolicy: FlowDirectMergePolicy
): FlowDirectMergeAction {
  if (!requiresPullRequest || directMergePolicy === 'off') {
    return 'allow';
  }

  return directMergePolicy;
}

function formatFlowTransitionMessage(sourceKind: FlowBranchKind, targetKind: FlowBranchKind): string {
  return `Final integration from ${sourceKind} to ${targetKind} requires a Pull Request.`;
}

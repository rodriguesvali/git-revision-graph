export type FlowBranchKind =
  | 'main'
  | 'release'
  | 'sync'
  | 'package'
  | 'feature'
  | 'task'
  | 'bug'
  | 'hotfix'
  | 'unknown';

export type FlowPatternBranchKind = Exclude<FlowBranchKind, 'main' | 'unknown'>;
export type FlowStartBranchKind = Extract<FlowPatternBranchKind, 'release' | 'feature' | 'task' | 'bug' | 'hotfix'>;

export type FlowConfigSource = 'repository' | 'workspace' | 'user' | 'defaults' | 'invalid' | 'disabled';

export interface FlowConfigV1 {
  readonly schemaVersion: 1;
  readonly enabled?: boolean;
  readonly mainBranches?: readonly string[];
  readonly patterns?: Partial<Record<FlowPatternBranchKind, string>>;
}

export interface FlowGovernanceSettings {
  readonly enabled?: boolean;
  readonly configPath?: string;
}

export interface NormalizedFlowConfig {
  readonly schemaVersion: 1;
  readonly enabled: boolean;
  readonly mainBranches: readonly string[];
  readonly patterns: Readonly<Record<FlowPatternBranchKind, string>>;
  readonly ignoredFields: readonly string[];
}

export interface FlowConfigValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type FlowConfigResolution =
  | {
    readonly ok: true;
    readonly source: Exclude<FlowConfigSource, 'invalid'>;
    readonly config: NormalizedFlowConfig;
    readonly issues: readonly FlowConfigValidationIssue[];
  }
  | {
    readonly ok: false;
    readonly source: 'invalid';
    readonly config: NormalizedFlowConfig;
    readonly issues: readonly FlowConfigValidationIssue[];
  };

export type FlowDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface FlowDiagnostic {
  readonly code:
    | 'unknown-branch'
    | 'invalid-config'
    | 'pr-required'
    | 'direct-merge-blocked';
  readonly severity: FlowDiagnosticSeverity;
  readonly message: string;
  readonly refName?: string;
  readonly sourceRefName?: string;
  readonly targetRefName?: string;
}

export interface FlowBranchInfo {
  readonly refName: string;
  readonly kind: FlowBranchKind;
  readonly isEphemeral: boolean;
  readonly diagnostics: readonly FlowDiagnostic[];
  readonly equalizationTargetRefName?: string;
  readonly promotionTargetRefName?: string;
}

export interface FlowGovernanceViewState {
  readonly enabled: boolean;
  readonly configSource: FlowConfigSource;
  readonly diagnostics: readonly FlowDiagnostic[];
  readonly branchKinds: readonly FlowBranchKind[];
  readonly references: readonly FlowBranchInfo[];
  readonly pullRequestTargets?: readonly FlowPullRequestTargetInfo[];
}

export interface FlowPullRequestTargetInfo {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly status:
    | 'ahead'
    | 'not-ahead'
    | 'production-not-ancestor'
    | 'production-out-of-sync'
    | 'unknown';
  readonly targetLocalAhead?: number;
  readonly targetRemoteAhead?: number;
  readonly detail?: string;
}

export type FlowGovernanceOptionsUpdate = RevisionGraphProtocol.FlowGovernanceOptionsUpdate;

export function isFlowStartBranchKind(value: unknown): value is FlowStartBranchKind {
  return value === 'release'
    || value === 'feature'
    || value === 'task'
    || value === 'bug'
    || value === 'hotfix';
}

export type FlowDirectMergePolicy = 'off' | 'warn' | 'block';

export type FlowDirectMergeAction = 'allow' | 'warn' | 'block';

export type FlowTransitionRuleId =
  | 'release-to-main'
  | 'task-to-feature'
  | 'package-to-feature'
  | 'hotfix-to-main'
  | 'feature-to-release'
  | 'bug-to-main'
  | 'bug-to-release'
  | 'bug-to-feature'
  | 'sync-to-release'
  | 'sync-to-feature';

export interface FlowTransitionPolicyOptions {
  readonly directMergePolicy?: FlowDirectMergePolicy;
}

export interface FlowTransitionEvaluation {
  readonly sourceKind: FlowBranchKind;
  readonly targetKind: FlowBranchKind;
  readonly ruleId?: FlowTransitionRuleId;
  readonly requiresPullRequest: boolean;
  readonly directMergePolicy: FlowDirectMergePolicy;
  readonly directMergeAction: FlowDirectMergeAction;
  readonly message?: string;
}

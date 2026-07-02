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
  readonly code: 'unknown-branch' | 'invalid-config';
  readonly severity: FlowDiagnosticSeverity;
  readonly message: string;
  readonly refName?: string;
}

export interface FlowBranchInfo {
  readonly refName: string;
  readonly kind: FlowBranchKind;
  readonly isEphemeral: boolean;
  readonly diagnostics: readonly FlowDiagnostic[];
}

export interface FlowGovernanceViewState {
  readonly enabled: boolean;
  readonly configSource: FlowConfigSource;
  readonly diagnostics: readonly FlowDiagnostic[];
  readonly branchKinds: readonly FlowBranchKind[];
  readonly references: readonly FlowBranchInfo[];
}

export interface FlowGovernanceOptionsUpdate {
  readonly enabled?: boolean;
}

export type FlowDirectMergePolicy = 'off' | 'warn' | 'block';

export type FlowDirectMergeAction = 'allow' | 'warn' | 'block';

export type FlowTransitionRuleId =
  | 'release-to-main'
  | 'task-to-feature'
  | 'package-to-feature'
  | 'hotfix-to-main'
  | 'bug-to-main'
  | 'bug-to-release'
  | 'bug-to-feature'
  | 'sync-to-release';

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

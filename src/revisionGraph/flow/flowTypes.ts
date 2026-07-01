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
  readonly hideSyncBranchesByDefault?: boolean;
  readonly highlightProductionTrunk?: boolean;
  readonly showUnknownBranches?: boolean;
}

export interface FlowGovernanceSettings {
  readonly enabled?: boolean;
  readonly configPath?: string;
  readonly hideSyncBranchesByDefault?: boolean;
  readonly highlightProductionTrunk?: boolean;
  readonly showUnknownBranches?: boolean;
}

export interface NormalizedFlowConfig {
  readonly schemaVersion: 1;
  readonly enabled: boolean;
  readonly mainBranches: readonly string[];
  readonly patterns: Readonly<Record<FlowPatternBranchKind, string>>;
  readonly hideSyncBranchesByDefault: boolean;
  readonly highlightProductionTrunk: boolean;
  readonly showUnknownBranches: boolean;
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
  readonly shouldHideByDefault: boolean;
  readonly diagnostics: readonly FlowDiagnostic[];
}

export interface FlowGovernanceFilterState {
  readonly visibleKinds: readonly FlowBranchKind[];
  readonly hideSyncBranches: boolean;
  readonly highlightProductionTrunk: boolean;
  readonly showUnknownBranches: boolean;
}

export interface FlowGovernanceViewState {
  readonly enabled: boolean;
  readonly configSource: FlowConfigSource;
  readonly diagnostics: readonly FlowDiagnostic[];
  readonly branchKinds: readonly FlowBranchKind[];
  readonly filters: FlowGovernanceFilterState;
  readonly references: readonly FlowBranchInfo[];
}

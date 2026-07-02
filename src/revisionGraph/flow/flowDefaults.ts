import {
  FlowBranchKind,
  FlowPatternBranchKind,
  NormalizedFlowConfig
} from './flowTypes';

export const FLOW_CONFIG_SCHEMA_VERSION = 1;

export const FLOW_PATTERN_BRANCH_KINDS: readonly FlowPatternBranchKind[] = [
  'release',
  'sync',
  'package',
  'feature',
  'task',
  'bug',
  'hotfix'
];

export const FLOW_BRANCH_KINDS: readonly FlowBranchKind[] = [
  'main',
  ...FLOW_PATTERN_BRANCH_KINDS,
  'unknown'
];

export const DEFAULT_FLOW_PATTERNS: Readonly<Record<FlowPatternBranchKind, string>> = {
  release: '^release/.+',
  sync: '^sync/.+',
  package: '^package(?:/.+)?$',
  feature: '^feature/.+',
  task: '^task/.+',
  bug: '^bug/.+',
  hotfix: '^hotfix/.+'
};

export const DEFAULT_FLOW_CONFIG: NormalizedFlowConfig = {
  schemaVersion: FLOW_CONFIG_SCHEMA_VERSION,
  enabled: false,
  mainBranches: ['main', 'master'],
  patterns: DEFAULT_FLOW_PATTERNS,
  ignoredFields: []
};

export function createDefaultFlowConfig(overrides: Partial<NormalizedFlowConfig> = {}): NormalizedFlowConfig {
  return {
    ...DEFAULT_FLOW_CONFIG,
    ...overrides,
    mainBranches: overrides.mainBranches ?? DEFAULT_FLOW_CONFIG.mainBranches,
    patterns: {
      ...DEFAULT_FLOW_CONFIG.patterns,
      ...(overrides.patterns ?? {})
    },
    ignoredFields: overrides.ignoredFields ?? DEFAULT_FLOW_CONFIG.ignoredFields
  };
}

export function createDefaultFlowConfigFile(): string {
  return `${JSON.stringify({
    schemaVersion: FLOW_CONFIG_SCHEMA_VERSION,
    enabled: true,
    mainBranches: ['main', 'master'],
    patterns: DEFAULT_FLOW_PATTERNS
  }, null, 2)}\n`;
}

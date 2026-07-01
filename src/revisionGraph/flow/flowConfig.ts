import {
  createDefaultFlowConfig,
  DEFAULT_FLOW_CONFIG,
  FLOW_CONFIG_SCHEMA_VERSION,
  FLOW_PATTERN_BRANCH_KINDS
} from './flowDefaults';
import {
  FlowConfigResolution,
  FlowConfigSource,
  FlowConfigV1,
  FlowConfigValidationIssue,
  FlowGovernanceSettings,
  FlowPatternBranchKind,
  NormalizedFlowConfig
} from './flowTypes';

const PHASE_1_CONFIG_KEYS = new Set([
  'schemaVersion',
  'enabled',
  'mainBranches',
  'patterns',
  'hideSyncBranchesByDefault',
  'highlightProductionTrunk',
  'showUnknownBranches'
]);

export function normalizeFlowConfig(
  rawConfig: unknown,
  source: Exclude<FlowConfigSource, 'invalid'> = 'repository'
): FlowConfigResolution {
  const issues: FlowConfigValidationIssue[] = [];
  if (!isRecord(rawConfig)) {
    return invalid([{ path: '$', message: 'Flow configuration must be a JSON object.' }]);
  }

  if (rawConfig.schemaVersion !== FLOW_CONFIG_SCHEMA_VERSION) {
    issues.push({ path: 'schemaVersion', message: 'schemaVersion must be 1.' });
  }

  const ignoredFields = Object.keys(rawConfig).filter((key) => !PHASE_1_CONFIG_KEYS.has(key)).sort();

  const enabled = readOptionalBoolean(rawConfig, 'enabled', issues) ?? DEFAULT_FLOW_CONFIG.enabled;
  const hideSyncBranchesByDefault =
    readOptionalBoolean(rawConfig, 'hideSyncBranchesByDefault', issues)
    ?? DEFAULT_FLOW_CONFIG.hideSyncBranchesByDefault;
  const highlightProductionTrunk =
    readOptionalBoolean(rawConfig, 'highlightProductionTrunk', issues)
    ?? DEFAULT_FLOW_CONFIG.highlightProductionTrunk;
  const showUnknownBranches =
    readOptionalBoolean(rawConfig, 'showUnknownBranches', issues)
    ?? DEFAULT_FLOW_CONFIG.showUnknownBranches;
  const mainBranches = readMainBranches(rawConfig.mainBranches, issues);
  const patterns = readPatterns(rawConfig.patterns, issues);

  const config = createDefaultFlowConfig({
    enabled,
    mainBranches,
    patterns,
    hideSyncBranchesByDefault,
    highlightProductionTrunk,
    showUnknownBranches,
    ignoredFields
  });

  return issues.length > 0 ? invalid(issues, config) : { ok: true, source, config, issues };
}

export function normalizeFlowSettings(settings: FlowGovernanceSettings | undefined): FlowConfigResolution {
  if (!settings) {
    return { ok: true, source: 'defaults', config: DEFAULT_FLOW_CONFIG, issues: [] };
  }

  const issues: FlowConfigValidationIssue[] = [];
  const configPath = settings.configPath;
  if (configPath !== undefined && (typeof configPath !== 'string' || configPath.trim().length === 0)) {
    issues.push({ path: 'configPath', message: 'configPath must be a non-empty string when set.' });
  }

  const config = createDefaultFlowConfig({
    enabled: settings.enabled ?? DEFAULT_FLOW_CONFIG.enabled,
    hideSyncBranchesByDefault:
      settings.hideSyncBranchesByDefault ?? DEFAULT_FLOW_CONFIG.hideSyncBranchesByDefault,
    highlightProductionTrunk:
      settings.highlightProductionTrunk ?? DEFAULT_FLOW_CONFIG.highlightProductionTrunk,
    showUnknownBranches:
      settings.showUnknownBranches ?? DEFAULT_FLOW_CONFIG.showUnknownBranches
  });

  return issues.length > 0 ? invalid(issues, config) : { ok: true, source: 'user', config, issues: [] };
}

export function createInertFlowConfig(rawConfig: FlowConfigV1): NormalizedFlowConfig {
  const normalized = normalizeFlowConfig(rawConfig);
  return normalized.config;
}

function readOptionalBoolean(
  record: Record<string, unknown>,
  key: keyof FlowConfigV1,
  issues: FlowConfigValidationIssue[]
): boolean | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    issues.push({ path: key, message: `${key} must be a boolean when set.` });
    return undefined;
  }

  return value;
}

function readMainBranches(value: unknown, issues: FlowConfigValidationIssue[]): readonly string[] {
  if (value === undefined) {
    return DEFAULT_FLOW_CONFIG.mainBranches;
  }

  if (!Array.isArray(value)) {
    issues.push({ path: 'mainBranches', message: 'mainBranches must be an array of non-empty strings.' });
    return DEFAULT_FLOW_CONFIG.mainBranches;
  }

  const branches: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      issues.push({ path: `mainBranches[${index}]`, message: 'mainBranches entries must be non-empty strings.' });
      return;
    }
    branches.push(entry);
  });

  return branches.length > 0 ? branches : DEFAULT_FLOW_CONFIG.mainBranches;
}

function readPatterns(
  value: unknown,
  issues: FlowConfigValidationIssue[]
): Readonly<Record<FlowPatternBranchKind, string>> {
  if (value === undefined) {
    return DEFAULT_FLOW_CONFIG.patterns;
  }

  if (!isRecord(value)) {
    issues.push({ path: 'patterns', message: 'patterns must be an object.' });
    return DEFAULT_FLOW_CONFIG.patterns;
  }

  const patterns: Record<FlowPatternBranchKind, string> = { ...DEFAULT_FLOW_CONFIG.patterns };
  for (const kind of FLOW_PATTERN_BRANCH_KINDS) {
    const pattern = value[kind];
    if (pattern === undefined) {
      continue;
    }

    if (typeof pattern !== 'string' || pattern.length === 0) {
      issues.push({ path: `patterns.${kind}`, message: `${kind} pattern must be a non-empty string.` });
      continue;
    }

    try {
      new RegExp(pattern);
      patterns[kind] = pattern;
    } catch {
      issues.push({ path: `patterns.${kind}`, message: `${kind} pattern must be a valid JavaScript regular expression.` });
    }
  }

  return patterns;
}

function invalid(
  issues: readonly FlowConfigValidationIssue[],
  config: NormalizedFlowConfig = DEFAULT_FLOW_CONFIG
): FlowConfigResolution {
  return { ok: false, source: 'invalid', config: { ...config, enabled: false }, issues };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

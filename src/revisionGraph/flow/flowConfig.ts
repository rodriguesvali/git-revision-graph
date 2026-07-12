import { readFile, writeFile } from 'node:fs/promises';

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
import { inspectRepositoryConfigPath } from './flowConfigPathSafety';

const PHASE_1_CONFIG_KEYS = new Set([
  'schemaVersion',
  'enabled',
  'mainBranches',
  'patterns'
]);
export const DEFAULT_FLOW_CONFIG_PATH = '.git-revision-graph-flow.json';

export interface RepositoryFlowConfigOptionsUpdate {
  readonly enabled?: boolean;
}

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
  const mainBranches = readMainBranches(rawConfig.mainBranches, issues);
  const patterns = readPatterns(rawConfig.patterns, issues);

  const config = createDefaultFlowConfig({
    enabled,
    mainBranches,
    patterns,
    ignoredFields
  });

  return issues.length > 0 ? invalid(issues, config) : { ok: true, source, config, issues };
}

export function normalizeFlowSettings(
  settings: FlowGovernanceSettings | undefined,
  source: Exclude<FlowConfigSource, 'repository' | 'invalid' | 'disabled'> = 'user'
): FlowConfigResolution {
  if (!settings) {
    return { ok: true, source: 'defaults', config: DEFAULT_FLOW_CONFIG, issues: [] };
  }

  const issues: FlowConfigValidationIssue[] = [];
  const configPath = settings.configPath;
  if (configPath !== undefined && (typeof configPath !== 'string' || configPath.trim().length === 0)) {
    issues.push({ path: 'configPath', message: 'configPath must be a non-empty string when set.' });
  }

  const config = createDefaultFlowConfig({
    enabled: settings.enabled ?? DEFAULT_FLOW_CONFIG.enabled
  });

  return issues.length > 0 ? invalid(issues, config) : { ok: true, source, config, issues: [] };
}

export function createInertFlowConfig(rawConfig: FlowConfigV1): NormalizedFlowConfig {
  const normalized = normalizeFlowConfig(rawConfig);
  return normalized.config;
}

export async function resolveFlowConfigForRepository(
  repositoryRootPath: string,
  settings?: FlowGovernanceSettings
): Promise<FlowConfigResolution> {
  const configPath = settings?.configPath ?? DEFAULT_FLOW_CONFIG_PATH;
  const inspectedConfigPath = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
  if (!inspectedConfigPath.ok) {
    return invalid([{ path: 'configPath', message: inspectedConfigPath.message }]);
  }

  if (inspectedConfigPath.exists) {
    const rawConfig = await readRepositoryFlowConfig(inspectedConfigPath.path);
    return rawConfig.value === undefined
      ? invalid(rawConfig.issues)
      : normalizeFlowConfig(rawConfig.value, 'repository');
  }

  return normalizeFlowSettings(settings, settings ? 'workspace' : 'defaults');
}

export async function updateRepositoryFlowConfigOptions(
  repositoryRootPath: string,
  settings: FlowGovernanceSettings | undefined,
  update: RepositoryFlowConfigOptionsUpdate
): Promise<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly issue: FlowConfigValidationIssue }
> {
  const configPath = settings?.configPath ?? DEFAULT_FLOW_CONFIG_PATH;
  const inspectedConfigPath = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
  if (!inspectedConfigPath.ok) {
    return { ok: false, issue: { path: 'configPath', message: inspectedConfigPath.message } };
  }
  if (!inspectedConfigPath.exists) {
    return {
      ok: false,
      issue: { path: '$', message: 'Could not read Flow Governance config: configuration file does not exist.' }
    };
  }

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(await readFile(inspectedConfigPath.path, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      issue: { path: '$', message: `Could not read Flow Governance config: ${getErrorMessage(error)}` }
    };
  }

  if (!isRecord(rawConfig)) {
    return {
      ok: false,
      issue: { path: '$', message: 'Flow configuration must be a JSON object.' }
    };
  }

  const nextConfig: Record<string, unknown> = { ...rawConfig };
  delete nextConfig.hideSyncBranchesByDefault;
  delete nextConfig.highlightProductionTrunk;
  delete nextConfig.showUnknownBranches;
  if (update.enabled !== undefined) {
    nextConfig.enabled = update.enabled;
  }

  try {
    const reinspection = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
    if (!reinspection.ok || !reinspection.exists || reinspection.path !== inspectedConfigPath.path) {
      return {
        ok: false,
        issue: {
          path: 'configPath',
          message: reinspection.ok
            ? 'Flow Governance config file is no longer available for safe update.'
            : reinspection.message
        }
      };
    }
    await writeFile(reinspection.path, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
  } catch (error) {
    return {
      ok: false,
      issue: { path: '$', message: `Could not write Flow Governance config: ${getErrorMessage(error)}` }
    };
  }

  return { ok: true, path: inspectedConfigPath.path };
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

async function readRepositoryFlowConfig(
  configPath: string
): Promise<
  | { readonly exists: false; readonly value?: undefined; readonly issues: readonly [] }
  | { readonly exists: true; readonly value: unknown; readonly issues: readonly [] }
  | { readonly exists: true; readonly value?: undefined; readonly issues: readonly FlowConfigValidationIssue[] }
> {
  try {
    return {
      exists: true,
      value: JSON.parse(await readFile(configPath, 'utf8')),
      issues: []
    };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { exists: false, issues: [] };
    }

    return {
      exists: true,
      issues: [{ path: '$', message: `Could not read Flow Governance config: ${getErrorMessage(error)}` }]
    };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

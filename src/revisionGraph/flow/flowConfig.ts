import { FileHandle, open } from 'node:fs/promises';

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
import {
  createRepositoryFlowConfigForSafeUpdate,
  getFlowConfigUpdatePathIssue,
  openRepositoryFlowConfigForSafeUpdate,
  persistRepositoryFlowConfigHandle,
  type RepositoryFlowConfigUpdateServices
} from './flowConfigSafePersistence';
import { compileFlowPattern } from './flowPatternSafety';

export type { RepositoryFlowConfigUpdateServices } from './flowConfigSafePersistence';

const PHASE_1_CONFIG_KEYS = new Set([
  'schemaVersion',
  'enabled',
  'mainBranches',
  'patterns'
]);
export const DEFAULT_FLOW_CONFIG_PATH = '.git-revision-graph-flow.json';
export const FLOW_CONFIG_MAX_FILE_BYTES = 64 * 1024;
export const FLOW_CONFIG_MAX_JSON_DEPTH = 32;
export const FLOW_CONFIG_MAX_MAIN_BRANCHES = 32;
export const FLOW_CONFIG_MAX_BRANCH_NAME_LENGTH = 256;
export const FLOW_CONFIG_MAX_PATH_LENGTH = 1_024;
export const FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS = 64;

export interface RepositoryFlowConfigOptionsUpdate {
  readonly enabled?: boolean;
}

type RepositoryFlowConfigReadResult =
  | { readonly exists: false; readonly value?: undefined; readonly issues: readonly [] }
  | { readonly exists: true; readonly value: unknown; readonly issues: readonly [] }
  | { readonly exists: true; readonly value?: undefined; readonly issues: readonly FlowConfigValidationIssue[] };

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

  const configKeys = Object.keys(rawConfig);
  if (configKeys.length > FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS) {
    issues.push({
      path: '$',
      message: `Flow configuration must not contain more than ${FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS} top-level fields.`
    });
  }
  const ignoredFields = configKeys
    .filter((key) => !PHASE_1_CONFIG_KEYS.has(key))
    .slice(0, FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS)
    .sort();

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
  if (configPath !== undefined) {
    if (typeof configPath !== 'string' || configPath.trim().length === 0) {
      issues.push({ path: 'configPath', message: 'configPath must be a non-empty string when set.' });
    } else if (configPath.length > FLOW_CONFIG_MAX_PATH_LENGTH) {
      issues.push({
        path: 'configPath',
        message: `configPath must be at most ${FLOW_CONFIG_MAX_PATH_LENGTH} characters.`
      });
    }
  }

  const config = createDefaultFlowConfig({ enabled: false });

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
  const configPathIssue = getFlowConfigPathIssue(configPath);
  if (configPathIssue) {
    return invalid([configPathIssue]);
  }
  const inspectedConfigPath = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
  if (!inspectedConfigPath.ok) {
    return invalid([{ path: 'configPath', message: inspectedConfigPath.message }]);
  }

  if (inspectedConfigPath.exists) {
    const rawConfig = await readRepositoryFlowConfig(inspectedConfigPath.path);
    if (!rawConfig.exists) {
      return invalid([{
        path: '$',
        message: 'Could not read Flow Governance config: configuration file is no longer available.'
      }]);
    }
    return rawConfig.value === undefined
      ? invalid(rawConfig.issues)
      : normalizeFlowConfig(rawConfig.value, 'repository');
  }

  return normalizeFlowSettings(
    settings ? { configPath: settings.configPath } : undefined,
    settings?.configPath ? 'workspace' : 'defaults'
  );
}

export async function updateRepositoryFlowConfigOptions(
  repositoryRootPath: string,
  settings: FlowGovernanceSettings | undefined,
  update: RepositoryFlowConfigOptionsUpdate,
  services: RepositoryFlowConfigUpdateServices = {}
): Promise<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly issue: FlowConfigValidationIssue }
> {
  const configPath = settings?.configPath ?? DEFAULT_FLOW_CONFIG_PATH;
  const configPathIssue = getFlowConfigPathIssue(configPath);
  if (configPathIssue) {
    return { ok: false, issue: configPathIssue };
  }
  const inspectedConfigPath = await inspectRepositoryConfigPath(repositoryRootPath, configPath);
  if (!inspectedConfigPath.ok) {
    return { ok: false, issue: { path: 'configPath', message: inspectedConfigPath.message } };
  }
  if (!inspectedConfigPath.exists) {
    if (update.enabled !== true) {
      return { ok: true, path: inspectedConfigPath.path };
    }
    return createRepositoryFlowConfigForSafeUpdate(
      repositoryRootPath,
      configPath,
      inspectedConfigPath.path,
      services
    );
  }

  let handle: FileHandle | undefined;
  try {
    const opened = await openRepositoryFlowConfigForSafeUpdate(
      inspectedConfigPath.path,
      inspectedConfigPath.identity,
      services
    );
    if (!opened.ok) {
      return opened;
    }
    handle = opened.handle;

    const openedPathIssue = await getFlowConfigUpdatePathIssue(
      repositoryRootPath,
      configPath,
      inspectedConfigPath.path,
      inspectedConfigPath.identity
    );
    if (openedPathIssue) {
      return { ok: false, issue: openedPathIssue };
    }

    const readResult = await readRepositoryFlowConfigHandle(handle);
    if (!readResult.exists || readResult.value === undefined) {
      return {
        ok: false,
        issue: readResult.issues[0] ?? {
          path: '$',
          message: 'Could not read Flow Governance config: configuration file does not exist.'
        }
      };
    }
    if (!isRecord(readResult.value)) {
      return {
        ok: false,
        issue: { path: '$', message: 'Flow configuration must be a JSON object.' }
      };
    }

    const nextConfig = createUpdatedFlowConfig(readResult.value, update);
    const persistencePathIssue = await getFlowConfigUpdatePathIssue(
      repositoryRootPath,
      configPath,
      inspectedConfigPath.path,
      inspectedConfigPath.identity
    );
    if (persistencePathIssue) {
      return { ok: false, issue: persistencePathIssue };
    }

    await persistRepositoryFlowConfigHandle(
      handle,
      `${JSON.stringify(nextConfig, null, 2)}\n`,
      services
    );

    const finalizedPathIssue = await getFlowConfigUpdatePathIssue(
      repositoryRootPath,
      configPath,
      inspectedConfigPath.path,
      inspectedConfigPath.identity
    );
    if (finalizedPathIssue) {
      return { ok: false, issue: finalizedPathIssue };
    }
  } catch (error) {
    return {
      ok: false,
      issue: { path: '$', message: `Could not write Flow Governance config: ${getErrorMessage(error)}` }
    };
  } finally {
    await handle?.close();
  }

  return { ok: true, path: inspectedConfigPath.path };
}

function createUpdatedFlowConfig(
  rawConfig: Record<string, unknown>,
  update: RepositoryFlowConfigOptionsUpdate
): Record<string, unknown> {
  const nextConfig: Record<string, unknown> = { ...rawConfig };
  delete nextConfig.hideSyncBranchesByDefault;
  delete nextConfig.highlightProductionTrunk;
  delete nextConfig.showUnknownBranches;
  if (update.enabled !== undefined) {
    nextConfig.enabled = update.enabled;
  }
  return nextConfig;
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
  if (value.length > FLOW_CONFIG_MAX_MAIN_BRANCHES) {
    issues.push({
      path: 'mainBranches',
      message: `mainBranches must not contain more than ${FLOW_CONFIG_MAX_MAIN_BRANCHES} entries.`
    });
    return DEFAULT_FLOW_CONFIG.mainBranches;
  }

  const branches: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      issues.push({ path: `mainBranches[${index}]`, message: 'mainBranches entries must be non-empty strings.' });
      return;
    }
    if (entry.length > FLOW_CONFIG_MAX_BRANCH_NAME_LENGTH) {
      issues.push({
        path: `mainBranches[${index}]`,
        message: `mainBranches entries must be at most ${FLOW_CONFIG_MAX_BRANCH_NAME_LENGTH} characters.`
      });
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

    const compilation = compileFlowPattern(pattern);
    if (compilation.ok) {
      patterns[kind] = pattern;
    } else {
      issues.push({
        path: `patterns.${kind}`,
        message: `${kind} pattern ${compilation.message}`
      });
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
): Promise<RepositoryFlowConfigReadResult> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(configPath, 'r');
    return await readRepositoryFlowConfigHandle(handle);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { exists: false, issues: [] };
    }

    return {
      exists: true,
      issues: [{ path: '$', message: `Could not read Flow Governance config: ${getErrorMessage(error)}` }]
    };
  } finally {
    await handle?.close();
  }
}

async function readRepositoryFlowConfigHandle(
  handle: FileHandle
): Promise<RepositoryFlowConfigReadResult> {
  try {
    const buffer = Buffer.allocUnsafe(FLOW_CONFIG_MAX_FILE_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (result.bytesRead === 0) {
        break;
      }
      bytesRead += result.bytesRead;
    }

    if (bytesRead > FLOW_CONFIG_MAX_FILE_BYTES) {
      return {
        exists: true,
        issues: [{
          path: '$',
          message: `Flow Governance config must not exceed ${FLOW_CONFIG_MAX_FILE_BYTES / 1024} KiB.`
        }]
      };
    }

    const content = buffer.toString('utf8', 0, bytesRead);
    const depthIssue = getJsonDepthIssue(content);
    if (depthIssue) {
      return { exists: true, issues: [depthIssue] };
    }

    return {
      exists: true,
      value: JSON.parse(content),
      issues: []
    };
  } catch (error) {
    return {
      exists: true,
      issues: [{ path: '$', message: `Could not read Flow Governance config: ${getErrorMessage(error)}` }]
    };
  }
}

function getFlowConfigPathIssue(configPath: string): FlowConfigValidationIssue | undefined {
  if (configPath.length > FLOW_CONFIG_MAX_PATH_LENGTH) {
    return {
      path: 'configPath',
      message: `configPath must be at most ${FLOW_CONFIG_MAX_PATH_LENGTH} characters.`
    };
  }
  return undefined;
}

function getJsonDepthIssue(content: string): FlowConfigValidationIssue | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const character of content) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{' || character === '[') {
      depth += 1;
      if (depth > FLOW_CONFIG_MAX_JSON_DEPTH) {
        return {
          path: '$',
          message: `Flow Governance config JSON must not exceed a nesting depth of ${FLOW_CONFIG_MAX_JSON_DEPTH}.`
        };
      }
    } else if (character === '}' || character === ']') {
      depth = Math.max(0, depth - 1);
    }
  }

  return undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

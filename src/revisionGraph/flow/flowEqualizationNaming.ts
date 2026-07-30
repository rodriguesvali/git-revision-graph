import { DEFAULT_FLOW_CONFIG } from './flowDefaults';
import {
  analyzeFlowPatternCanonicalPrefix,
  extractFlowPatternSuffix
} from './flowPatternCanonicalization';
import { compileFlowPattern } from './flowPatternSafety';
import type { NormalizedFlowConfig } from './flowTypes';

export type FlowEqualizationBranchNameResult =
  | { readonly ok: true; readonly branchName: string }
  | { readonly ok: false; readonly message: string };

export function resolveFlowEqualizationBranchName(
  targetBranch: string,
  config: Pick<NormalizedFlowConfig, 'patterns'> = DEFAULT_FLOW_CONFIG
): FlowEqualizationBranchNameResult {
  const targetKind = (['release', 'feature'] as const).find((kind) =>
    extractFlowPatternSuffix(targetBranch, config.patterns[kind]) !== undefined
  );
  if (!targetKind) {
    return {
      ok: false,
      message: 'The target branch does not have a deterministic release or feature prefix.'
    };
  }

  const rawSuffix = extractFlowPatternSuffix(targetBranch, config.patterns[targetKind]) ?? '';
  const suffix = rawSuffix
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/^[/.-]+|[/.-]+$/g, '')
    .replace(/\/{2,}/g, '/');
  const syncPrefix = analyzeFlowPatternCanonicalPrefix(config.patterns.sync);
  if (!syncPrefix) {
    return {
      ok: false,
      message: 'The configured sync pattern does not have a deterministic start-anchored prefix.'
    };
  }

  const branchName = `${syncPrefix.canonicalPrefix}${suffix || targetKind}`;
  const compilation = compileFlowPattern(config.patterns.sync);
  if (!compilation.ok || !compilation.regex.test(branchName)) {
    return {
      ok: false,
      message: `The generated branch ${branchName} does not match the configured sync pattern.`
    };
  }

  return { ok: true, branchName };
}

export function suggestFlowEqualizationBranchName(
  targetBranch: string,
  config: Pick<NormalizedFlowConfig, 'patterns'> = DEFAULT_FLOW_CONFIG
): string {
  const result = resolveFlowEqualizationBranchName(targetBranch, config);
  return result.ok ? result.branchName : '';
}

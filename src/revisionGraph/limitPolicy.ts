import * as vscode from 'vscode';
import type { RevisionGraphLimitPolicy } from './backend';

const MIN_GRAPH_COMMAND_TIMEOUT_MS = 5000;
const MAX_GRAPH_COMMAND_TIMEOUT_MS = 300000;

function resolveGraphCommandTimeoutMs(configuredValue: unknown, fallback: number): number {
  if (typeof configuredValue !== 'number' || !Number.isFinite(configuredValue)) {
    return fallback;
  }

  return Math.min(
    MAX_GRAPH_COMMAND_TIMEOUT_MS,
    Math.max(MIN_GRAPH_COMMAND_TIMEOUT_MS, Math.trunc(configuredValue))
  );
}

export function resolveConfiguredGraphLimitPolicy(policy: RevisionGraphLimitPolicy): RevisionGraphLimitPolicy {
  const configuredTimeoutMs = vscode.workspace.getConfiguration('gitRevisionGraph')
    .get<unknown>('graphCommandTimeoutMs', policy.graphCommandTimeoutMs);
  return { ...policy, graphCommandTimeoutMs: resolveGraphCommandTimeoutMs(configuredTimeoutMs, policy.graphCommandTimeoutMs) };
}

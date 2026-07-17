import { throwIfAborted } from '../../errors';
import {
  execGit,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE
} from '../../gitExec';
import type { FlowBranchInfo } from './flowTypes';

const BRANCH_CONFIG_PREFIX = 'branch.';
const FLOW_TARGET_CONFIG_SUFFIX = '.git-revision-graph-flow-target';

export async function setFlowBranchTarget(
  repositoryPath: string,
  branchName: string,
  targetRefName: string
): Promise<void> {
  await execGit(
    repositoryPath,
    ['config', `${BRANCH_CONFIG_PREFIX}${branchName}${FLOW_TARGET_CONFIG_SUFFIX}`, targetRefName],
    GIT_EXEC_LOCAL_MUTATION_PROFILE
  );
}

export async function setFlowEqualizationTarget(
  repositoryPath: string,
  branchName: string,
  targetRefName: string
): Promise<void> {
  await setFlowBranchTarget(repositoryPath, branchName, targetRefName);
}

export async function loadFlowBranchTargets(
  repositoryPath: string,
  signal?: AbortSignal
): Promise<ReadonlyMap<string, string>> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
  try {
    const output = await execGit(
      repositoryPath,
      ['config', '--local', '--null', '--get-regexp', '^branch\\..*\\.git-revision-graph-flow-target$'],
      { ...GIT_EXEC_METADATA_PROFILE, signal, allowedExitCodes: [0, 1] }
    );
    throwIfAborted(signal, 'The revision graph load was aborted.');
    return parseFlowBranchTargets(output);
  } catch {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    return new Map();
  }
}

export async function loadFlowEqualizationTargets(
  repositoryPath: string,
  signal?: AbortSignal
): Promise<ReadonlyMap<string, string>> {
  return loadFlowBranchTargets(repositoryPath, signal);
}

export function parseFlowBranchTargets(output: string): ReadonlyMap<string, string> {
  const targets = new Map<string, string>();
  for (const record of output.split('\0')) {
    const separatorIndex = record.indexOf('\n');
    if (separatorIndex < 0) {
      continue;
    }

    const key = record.slice(0, separatorIndex);
    if (!key.startsWith(BRANCH_CONFIG_PREFIX) || !key.endsWith(FLOW_TARGET_CONFIG_SUFFIX)) {
      continue;
    }

    const branchName = key.slice(BRANCH_CONFIG_PREFIX.length, -FLOW_TARGET_CONFIG_SUFFIX.length);
    const targetRefName = record.slice(separatorIndex + 1).trim();
    if (branchName && targetRefName) {
      targets.set(branchName, targetRefName);
    }
  }
  return targets;
}

export function parseFlowEqualizationTargets(output: string): ReadonlyMap<string, string> {
  return parseFlowBranchTargets(output);
}

export function applyFlowBranchTargets(
  references: readonly FlowBranchInfo[],
  targets: ReadonlyMap<string, string>
): readonly FlowBranchInfo[] {
  return references.map((reference) => {
    const targetRefName = targets.get(reference.refName);
    if (!targetRefName) {
      return reference;
    }
    if (reference.kind === 'sync') {
      return { ...reference, equalizationTargetRefName: targetRefName };
    }
    if (reference.kind === 'task') {
      return { ...reference, promotionTargetRefName: targetRefName };
    }
    return reference;
  });
}

export function applyFlowEqualizationTargets(
  references: readonly FlowBranchInfo[],
  targets: ReadonlyMap<string, string>
): readonly FlowBranchInfo[] {
  return references.map((reference) => {
    const equalizationTargetRefName = reference.kind === 'sync'
      ? targets.get(reference.refName)
      : undefined;
    return equalizationTargetRefName
      ? { ...reference, equalizationTargetRefName }
      : reference;
  });
}

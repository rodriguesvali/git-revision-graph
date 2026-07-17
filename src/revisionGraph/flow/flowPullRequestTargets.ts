import { hasGitExitCode, toErrorDetail } from '../../errorDetail';
import { isAbortError } from '../../errors';
import { execGitWithResult, GIT_EXEC_METADATA_PROFILE, GitExecOptions, GitExecResult } from '../../gitExec';
import { suggestFlowEqualizationBranchName } from './flowEqualizationNaming';
import type { FlowBranchInfo, FlowPullRequestTargetInfo } from './flowTypes';

export type FlowPullRequestTargetGitExecutor = (
  repositoryPath: string,
  args: readonly string[],
  options?: GitExecOptions
) => Promise<GitExecResult>;

export interface FlowPullRequestTargetCheckOptions {
  readonly requireTargetAncestor?: boolean;
  readonly requireTargetSynchronized?: boolean;
  readonly targetCommitish?: string;
}

export async function loadFlowPullRequestTargets(
  repositoryPath: string,
  references: readonly FlowBranchInfo[],
  signal?: AbortSignal,
  execGit: FlowPullRequestTargetGitExecutor = execGitWithResult
): Promise<readonly FlowPullRequestTargetInfo[]> {
  const productionBranch = references.find((reference) => reference.kind === 'main')?.refName;
  const releaseBranches = references.filter((reference) => reference.kind === 'release');
  const candidates: Array<{
    sourceRefName: string;
    targetRefName: string;
    requireTargetAncestor: boolean;
  }> = [];

  if (productionBranch) {
    for (const source of references) {
      if (source.kind === 'release' || source.kind === 'hotfix') {
        candidates.push({
          sourceRefName: source.refName,
          targetRefName: productionBranch,
          requireTargetAncestor: source.kind === 'release' || source.kind === 'hotfix'
        });
      }
    }
  }

  for (const source of references.filter((reference) => reference.kind === 'feature')) {
    for (const target of releaseBranches) {
      if (source.refName !== target.refName) {
        candidates.push({
          sourceRefName: source.refName,
          targetRefName: target.refName,
          requireTargetAncestor: false
        });
      }
    }
  }

  for (const source of references.filter((reference) => reference.kind === 'task')) {
    const target = references.find((reference) =>
      reference.kind === 'feature' && reference.refName === source.promotionTargetRefName
    );
    if (target && source.refName !== target.refName) {
      candidates.push({
        sourceRefName: source.refName,
        targetRefName: target.refName,
        requireTargetAncestor: false
      });
    }
  }

  for (const source of references.filter((reference) => reference.kind === 'sync')) {
    const target = resolveFlowSyncPullRequestTarget(source, references);
    if (target && source.refName !== target.refName) {
      candidates.push({
        sourceRefName: source.refName,
        targetRefName: target.refName,
        requireTargetAncestor: false
      });
    }
  }

  return Promise.all(candidates.map((candidate) => checkFlowPullRequestTarget(
    repositoryPath,
    candidate.sourceRefName,
    candidate.targetRefName,
    { requireTargetAncestor: candidate.requireTargetAncestor },
    signal,
    execGit
  )));
}

function resolveFlowSyncPullRequestTarget(
  source: FlowBranchInfo,
  references: readonly FlowBranchInfo[]
): FlowBranchInfo | undefined {
  const eligibleTargets = references.filter((reference) =>
    reference.kind === 'release' || reference.kind === 'feature'
  );
  if (source.equalizationTargetRefName) {
    return eligibleTargets.find((reference) => reference.refName === source.equalizationTargetRefName);
  }

  const inferredTargets = eligibleTargets.filter((reference) =>
    suggestFlowEqualizationBranchName(reference.refName) === source.refName
  );
  return inferredTargets.length === 1 ? inferredTargets[0] : undefined;
}

export async function checkFlowPullRequestTarget(
  repositoryPath: string,
  sourceRefName: string,
  targetRefName: string,
  options: FlowPullRequestTargetCheckOptions = {},
  signal?: AbortSignal,
  execGit: FlowPullRequestTargetGitExecutor = execGitWithResult
): Promise<FlowPullRequestTargetInfo> {
  const targetCommitish = options.targetCommitish ?? targetRefName;
  if (options.requireTargetSynchronized && options.targetCommitish) {
    try {
      const synchronization = await execGit(
        repositoryPath,
        [
          'rev-list',
          '--left-right',
          '--count',
          '--end-of-options',
          `${targetRefName}...${options.targetCommitish}`
        ],
        { ...GIT_EXEC_METADATA_PROFILE, signal }
      );
      const [targetLocalAhead, targetRemoteAhead] = synchronization.stdout.trim().split(/\s+/).map(Number);
      if (!Number.isFinite(targetLocalAhead) || !Number.isFinite(targetRemoteAhead)) {
        return {
          sourceRefName,
          targetRefName,
          status: 'unknown',
          detail: 'Git returned an invalid production synchronization comparison.'
        };
      }
      if (targetLocalAhead > 0 || targetRemoteAhead > 0) {
        return {
          sourceRefName,
          targetRefName,
          status: 'production-out-of-sync',
          targetLocalAhead,
          targetRemoteAhead
        };
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      return { sourceRefName, targetRefName, status: 'unknown', detail: toErrorDetail(error) };
    }
  }

  if (options.requireTargetAncestor) {
    try {
      await execGit(
        repositoryPath,
        ['merge-base', '--is-ancestor', '--end-of-options', targetCommitish, sourceRefName],
        { ...GIT_EXEC_METADATA_PROFILE, signal }
      );
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (hasGitExitCode(error, 1)) {
        return { sourceRefName, targetRefName, status: 'production-not-ancestor' };
      }
      return { sourceRefName, targetRefName, status: 'unknown', detail: toErrorDetail(error) };
    }
  }

  try {
    const result = await execGit(
      repositoryPath,
      ['rev-list', '--count', '--max-count=1', '--end-of-options', `${targetCommitish}..${sourceRefName}`],
      { ...GIT_EXEC_METADATA_PROFILE, signal }
    );
    return {
      sourceRefName,
      targetRefName,
      status: Number.parseInt(result.stdout.trim(), 10) > 0 ? 'ahead' : 'not-ahead'
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return { sourceRefName, targetRefName, status: 'unknown', detail: toErrorDetail(error) };
  }
}

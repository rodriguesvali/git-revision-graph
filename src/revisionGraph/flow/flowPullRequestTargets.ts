import { toErrorDetail } from '../../errorDetail';
import { isAbortError } from '../../errors';
import { execGitWithResult, GIT_EXEC_METADATA_PROFILE, GitExecOptions, GitExecResult } from '../../gitExec';
import type { FlowBranchInfo, FlowPullRequestTargetInfo } from './flowTypes';

export type FlowPullRequestTargetGitExecutor = (
  repositoryPath: string,
  args: readonly string[],
  options?: GitExecOptions
) => Promise<GitExecResult>;

export async function loadFlowPullRequestTargets(
  repositoryPath: string,
  references: readonly FlowBranchInfo[],
  signal?: AbortSignal,
  execGit: FlowPullRequestTargetGitExecutor = execGitWithResult
): Promise<readonly FlowPullRequestTargetInfo[]> {
  const productionBranch = references.find((reference) => reference.kind === 'main')?.refName;
  const releaseBranches = references.filter((reference) => reference.kind === 'release');
  const candidates: Array<{ sourceRefName: string; targetRefName: string }> = [];

  if (productionBranch) {
    for (const source of references) {
      if (source.kind === 'release' || source.kind === 'hotfix') {
        candidates.push({ sourceRefName: source.refName, targetRefName: productionBranch });
      }
    }
  }

  for (const source of references) {
    if (source.kind !== 'feature') {
      continue;
    }
    for (const target of releaseBranches) {
      if (source.refName !== target.refName) {
        candidates.push({ sourceRefName: source.refName, targetRefName: target.refName });
      }
    }
  }

  return Promise.all(candidates.map((candidate) => checkFlowPullRequestTarget(
    repositoryPath,
    candidate.sourceRefName,
    candidate.targetRefName,
    signal,
    execGit
  )));
}

export async function checkFlowPullRequestTarget(
  repositoryPath: string,
  sourceRefName: string,
  targetRefName: string,
  signal?: AbortSignal,
  execGit: FlowPullRequestTargetGitExecutor = execGitWithResult
): Promise<FlowPullRequestTargetInfo> {
  try {
    const result = await execGit(
      repositoryPath,
      ['rev-list', '--count', '--max-count=1', '--end-of-options', `${targetRefName}..${sourceRefName}`],
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

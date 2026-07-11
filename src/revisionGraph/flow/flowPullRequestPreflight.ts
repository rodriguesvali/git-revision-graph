import { toErrorDetail } from '../../errorDetail';
import type { Repository } from '../../git';
import { execGitWithResult, GIT_EXEC_REMOTE_PROFILE, GitExecOptions, GitExecResult } from '../../gitExec';

export type FlowPullRequestSourcePublicationStatus =
  | 'ready'
  | 'unpublished'
  | 'unpushed'
  | 'remote-ahead'
  | 'diverged'
  | 'unknown';

export interface FlowPullRequestSourcePublication {
  readonly status: FlowPullRequestSourcePublicationStatus;
  readonly remoteName: string;
  readonly sourceRefName: string;
  readonly localAhead?: number;
  readonly remoteAhead?: number;
  readonly detail?: string;
}

export type FlowPullRequestPreflightGitExecutor = (
  repositoryPath: string,
  args: readonly string[],
  options?: GitExecOptions
) => Promise<GitExecResult>;

export type FlowPullRequestRemoteBranchCommit =
  | { readonly status: 'found'; readonly commit: string }
  | { readonly status: 'missing' }
  | { readonly status: 'unknown'; readonly detail: string };

export async function loadFlowPullRequestRemoteBranchCommit(
  repository: Repository,
  remoteName: string,
  branchName: string,
  execGit: FlowPullRequestPreflightGitExecutor = execGitWithResult
): Promise<FlowPullRequestRemoteBranchCommit> {
  try {
    const remoteResult = await execGit(
      repository.rootUri.fsPath,
      ['ls-remote', '--heads', '--refs', remoteName, `refs/heads/${branchName}`],
      GIT_EXEC_REMOTE_PROFILE
    );
    const remoteCommit = remoteResult.stdout.trim().split(/\s+/, 1)[0];
    if (!remoteCommit) {
      return { status: 'missing' };
    }

    await repository.fetch({ remote: remoteName, ref: branchName });
    return { status: 'found', commit: remoteCommit };
  } catch (error) {
    return { status: 'unknown', detail: toErrorDetail(error) };
  }
}

export async function checkFlowPullRequestSourcePublication(
  repository: Repository,
  remoteName: string,
  sourceRefName: string,
  execGit: FlowPullRequestPreflightGitExecutor = execGitWithResult
): Promise<FlowPullRequestSourcePublication> {
  try {
    const remoteBranch = await loadFlowPullRequestRemoteBranchCommit(
      repository,
      remoteName,
      sourceRefName,
      execGit
    );
    if (remoteBranch.status === 'missing') {
      return { status: 'unpublished', remoteName, sourceRefName };
    }
    if (remoteBranch.status === 'unknown') {
      return { status: 'unknown', remoteName, sourceRefName, detail: remoteBranch.detail };
    }

    const comparison = await execGit(
      repository.rootUri.fsPath,
      [
        'rev-list',
        '--left-right',
        '--count',
        '--end-of-options',
        `${sourceRefName}...${remoteBranch.commit}`
      ],
      GIT_EXEC_REMOTE_PROFILE
    );
    const [localAhead, remoteAhead] = comparison.stdout.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(localAhead) || !Number.isFinite(remoteAhead)) {
      return {
        status: 'unknown',
        remoteName,
        sourceRefName,
        detail: 'Git returned an invalid local/remote comparison.'
      };
    }

    return {
      status: classifyFlowPullRequestSourcePublication(localAhead, remoteAhead),
      remoteName,
      sourceRefName,
      localAhead,
      remoteAhead
    };
  } catch (error) {
    return { status: 'unknown', remoteName, sourceRefName, detail: toErrorDetail(error) };
  }
}

export function classifyFlowPullRequestSourcePublication(
  localAhead: number,
  remoteAhead: number
): Exclude<FlowPullRequestSourcePublicationStatus, 'unpublished' | 'unknown'> {
  if (localAhead === 0 && remoteAhead === 0) {
    return 'ready';
  }
  if (localAhead > 0 && remoteAhead === 0) {
    return 'unpushed';
  }
  if (localAhead === 0 && remoteAhead > 0) {
    return 'remote-ahead';
  }
  return 'diverged';
}

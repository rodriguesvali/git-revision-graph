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

export async function checkFlowPullRequestSourcePublication(
  repository: Repository,
  remoteName: string,
  sourceRefName: string,
  execGit: FlowPullRequestPreflightGitExecutor = execGitWithResult
): Promise<FlowPullRequestSourcePublication> {
  try {
    const remoteRef = `refs/heads/${sourceRefName}`;
    const remoteResult = await execGit(
      repository.rootUri.fsPath,
      ['ls-remote', '--heads', '--refs', remoteName, remoteRef],
      GIT_EXEC_REMOTE_PROFILE
    );
    const remoteCommit = remoteResult.stdout.trim().split(/\s+/, 1)[0];
    if (!remoteCommit) {
      return { status: 'unpublished', remoteName, sourceRefName };
    }

    await repository.fetch({ remote: remoteName, ref: sourceRefName });
    const comparison = await execGit(
      repository.rootUri.fsPath,
      [
        'rev-list',
        '--left-right',
        '--count',
        '--end-of-options',
        `${sourceRefName}...${remoteCommit}`
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

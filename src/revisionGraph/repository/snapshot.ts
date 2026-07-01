import { Repository } from '../../git';
import { hasGitExitCode } from '../../errorDetail';
import {
  execGit,
  execGitWithResult,
  GIT_EXEC_METADATA_PROFILE
} from '../../gitExec';
import type { RevisionGraphProjectionOptions } from '../model/commitGraphTypes';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';
import { buildCommitGraphFromGitLog, buildRevisionGraphGitLogArgs } from '../source/graphGit';
import { buildRevisionGraphRefKinds } from '../source/refIndex';

export async function loadRevisionGraphSnapshot(
  repository: Repository,
  limit: number,
  options: RevisionGraphProjectionOptions
): Promise<RevisionGraphSnapshot> {
  const refKindsByName = buildRevisionGraphRefKinds(await repository.getRefs());
  const stdout = await execGit(
    repository.rootUri.fsPath,
    buildRevisionGraphGitLogArgs(limit, options),
    {
      timeoutMs: 60_000,
      maxOutputBytes: 32 * 1024 * 1024
    }
  );

  return {
    graph: buildCommitGraphFromGitLog(stdout, refKindsByName, 'git-decoration'),
    loadedAt: Date.now(),
    requestedLimit: limit
  };
}

export async function isRefAncestorOfHead(
  repository: Repository,
  refName: string,
  headRefName: string,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    await execGitWithResult(
      repository.rootUri.fsPath,
      ['merge-base', '--is-ancestor', '--end-of-options', refName, headRefName],
      { ...GIT_EXEC_METADATA_PROFILE, signal }
    );
    return true;
  } catch (error) {
    if (hasGitExitCode(error, 1)) {
      return false;
    }

    throw error;
  }
}

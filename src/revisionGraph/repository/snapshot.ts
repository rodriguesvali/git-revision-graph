import { Repository } from '../../git';
import { execGit, execGitWithResult } from '../../gitExec';
import { RevisionGraphProjectionOptions } from '../../revisionGraphData';
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
    buildRevisionGraphGitLogArgs(limit, options)
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
  headRefName: string
): Promise<boolean> {
  try {
    await execGitWithResult(
      repository.rootUri.fsPath,
      ['merge-base', '--is-ancestor', refName, headRefName]
    );
    return true;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;

    if (code === 1) {
      return false;
    }

    throw error;
  }
}

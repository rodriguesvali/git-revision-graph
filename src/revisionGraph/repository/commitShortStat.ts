import { execGit, GIT_EXEC_METADATA_PROFILE } from '../../gitExec';
import type { RevisionGraphCommitShortStat } from '../../revisionGraphTypes';

export async function loadCommitShortStat(
  repositoryPath: string,
  commitHash: string
): Promise<RevisionGraphCommitShortStat | undefined> {
  try {
    const output = await execGit(
      repositoryPath,
      ['show', '--shortstat', '--format=', '--end-of-options', commitHash],
      GIT_EXEC_METADATA_PROFILE
    );
    return parseCommitShortStat(output);
  } catch {
    return undefined;
  }
}

export function parseCommitShortStat(output: string): RevisionGraphCommitShortStat | undefined {
  const line = output
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => /\d+\s+files?\s+changed/.test(candidate));
  if (!line) {
    return undefined;
  }

  return {
    files: Number(line.match(/(\d+)\s+files?\s+changed/)?.[1] ?? '0'),
    insertions: Number(line.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? '0'),
    deletions: Number(line.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? '0')
  };
}

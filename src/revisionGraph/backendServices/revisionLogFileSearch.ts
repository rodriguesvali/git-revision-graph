import { throwIfAborted } from '../../errors';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../../gitExec';
import type { Repository } from '../../git';
import { buildRevisionLogQueryGitArgs, type RevisionLogQuery } from '../source/revisionLogQuery';

export async function loadShowLogFileMatchPaths(
  repository: Repository,
  commitHash: string,
  query: RevisionLogQuery,
  signal?: AbortSignal
): Promise<readonly string[]> {
  throwIfAborted(signal, 'The file search was aborted.');
  const args = buildRevisionLogQueryGitArgs([commitHash], query).flatMap((arg) => {
    if (arg === '--format=%H') return ['--format='];
    if (arg === '--no-patch') return ['--name-only', '-z'];
    return [arg];
  });
  const output = await execGit(repository.rootUri.fsPath, args, { ...GIT_EXEC_METADATA_PROFILE, signal });
  throwIfAborted(signal, 'The file search was aborted.');
  return [...new Set(output.split('\0').filter(Boolean))];
}

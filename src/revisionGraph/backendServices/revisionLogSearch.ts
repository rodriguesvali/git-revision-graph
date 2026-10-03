import { throwIfAborted } from '../../errors';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../../gitExec';
import type { Repository } from '../../git';
import type { RevisionLogEntry } from '../revisionLogTypes';
import { buildRevisionLogQueryGitArgs, type RevisionLogQuery } from '../source/revisionLogQuery';
import { matchesRevisionLogFilter } from '../source/graphGit';

export async function filterRevisionLogQueryBatch(
  repository: Repository,
  entries: readonly RevisionLogEntry[],
  query: RevisionLogQuery,
  signal?: AbortSignal
): Promise<readonly RevisionLogEntry[]> {
  const candidates = entries.filter((entry) => matchesRevisionLogFilter(entry, query.text));
  if (!candidates.length || (query.file === undefined && query.change === undefined)) return candidates;
  throwIfAborted(signal, 'The log search was aborted.');
  const output = await execGit(repository.rootUri.fsPath,
    buildRevisionLogQueryGitArgs(candidates.map((entry) => entry.hash), query),
    { ...GIT_EXEC_METADATA_PROFILE, signal });
  throwIfAborted(signal, 'The log search was aborted.');
  const matches = new Set(output.trim().split(/\r?\n/));
  return candidates.filter((entry) => matches.has(entry.hash));
}

import { isBisectHash } from '../bugBisect/git';
import { throwIfAborted } from '../errors';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../gitExec';
import type { Repository } from '../git';
import { buildCommitGraphWithSimplification } from './model/commitGraph';
import type { CommitGraph, ParsedRevisionGraphCommit } from './model/commitGraphTypes';
import { getRevisionGraphGitFormat, parseRevisionGraphLog } from './source/graphGit';
import { buildRevisionGraphRefKinds } from './source/refIndex';

export function getBisectMarkerHash(repository: Repository, state?: RevisionGraphProtocol.BisectView | null): string | undefined {
  const head = repository.state.HEAD?.commit;
  if (!state || state.repositoryPath !== repository.rootUri.fsPath || state.status === 'preparing' || !isBisectHash(head)) return;
  return state.current?.hash === head || state.history.some(answer => answer.commit.hash === head) ? head : undefined;
}

export async function applyBisectGraphMarker(
  graph: CommitGraph, repository: Repository, state?: RevisionGraphProtocol.BisectView | null, signal?: AbortSignal
): Promise<CommitGraph> {
  const hash = getBisectMarkerHash(repository, state);
  if (!hash && !graph.orderedCommits.some(commit => commit.refs.some(ref => ref.kind === 'bisect'))) return graph;
  let commits: ParsedRevisionGraphCommit[] = graph.orderedCommits.filter(commit => !commit.isBoundary).map(commit => ({
    ...commit, refs: commit.refs.filter(ref => ref.kind !== 'bisect')
  }));
  if (hash && !commits.some(commit => commit.hash === hash)) {
    // A bounded log or scope can omit HEAD. Read its decorated ancestry separately,
    // retaining Git's compressed-parent semantics without creating a repository ref.
    const output = await execGit(repository.rootUri.fsPath, ['log', '--simplify-by-decoration', '--decorate=short',
      '--date=iso-strict', '--max-count=2', `--pretty=format:${getRevisionGraphGitFormat()}`, '--end-of-options', hash, '--'],
    { ...GIT_EXEC_METADATA_PROFILE, signal });
    const seen = new Set(commits.map(commit => commit.hash));
    const extra = parseRevisionGraphLog(output, buildRevisionGraphRefKinds(repository.state.refs))
      .filter(commit => !seen.has(commit.hash)).map(commit => ({ ...commit, refs: commit.refs.filter(ref => ref.name !== 'HEAD') }));
    commits = [...extra, ...commits];
  }
  throwIfAborted(signal, 'The revision graph load was aborted.');
  if (hash) commits = commits.map(commit => commit.hash === hash
    ? { ...commit, refs: [{ name: 'Bisect Commit', kind: 'bisect' as const }, ...commit.refs] } : commit);
  return buildCommitGraphWithSimplification(commits, graph.simplification);
}

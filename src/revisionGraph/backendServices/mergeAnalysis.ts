import { isAbortError, throwIfAborted } from '../../errors';
import { Repository } from '../../git';
import { RevisionGraphViewReference } from '../../revisionGraphTypes';
import { collectAncestorHashes } from '../model/commitGraphQueries';
import { CommitGraph, RevisionGraphRef } from '../model/commitGraphTypes';
import { isRefAncestorOfHead } from '../repository/snapshot';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';

export interface RevisionGraphMergeAnalysisBackend {
  getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]>;
}

export class DefaultRevisionGraphMergeAnalysisBackend implements RevisionGraphMergeAnalysisBackend {
  async getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]> {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    if (!currentHeadName) {
      return [];
    }

    const uniqueReferences = [
      ...new Map(
        visibleReferences.map((ref) => [`${ref.kind}::${ref.name}`, ref] as const)
      ).values()
    ];

    const commitHashesByRef = buildCommitHashesByRefKey(snapshot.graph);
    const blockedFromGraph = getMergeBlockedTargetsFromGraph(
      snapshot.graph,
      currentHeadName,
      uniqueReferences,
      commitHashesByRef
    );
    const blockedSet = new Set(blockedFromGraph);

    const unresolvedReferences = uniqueReferences.filter((ref) =>
      ref.kind !== 'head' &&
      ref.name !== currentHeadName &&
      !blockedSet.has(`${ref.kind}::${ref.name}`) &&
      (commitHashesByRef.get(createRefKey(ref.kind, ref.name)) ?? []).length === 0
    );

    const fallbackResults = await Promise.all(
      unresolvedReferences.map(async (ref) => {
        try {
          throwIfAborted(signal, 'The revision graph load was aborted.');
          const isAncestor = await isRefAncestorOfHead(repository, ref.name, currentHeadName, signal);
          return isAncestor ? `${ref.kind}::${ref.name}` : undefined;
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }

          return undefined;
        }
      })
    );

    for (const entry of fallbackResults) {
      if (entry) {
        blockedSet.add(entry);
      }
    }

    return [...blockedSet];
  }
}

export function getMergeBlockedTargetsFromGraph(
  graph: CommitGraph,
  currentHeadName: string,
  visibleReferences: readonly Pick<RevisionGraphViewReference, 'kind' | 'name'>[],
  commitHashesByRef = buildCommitHashesByRefKey(graph)
): string[] {
  const headStartHashes = commitHashesByRef.get(createRefKey('head', currentHeadName)) ?? [];
  const fallbackHeadHashes = headStartHashes.length > 0
    ? headStartHashes
    : commitHashesByRef.get(createRefKey('branch', currentHeadName)) ?? [];

  if (fallbackHeadHashes.length === 0) {
    return [];
  }

  const headAncestors = collectAncestorHashes(graph, fallbackHeadHashes);
  const blockedTargets = new Set<string>();

  for (const ref of visibleReferences) {
    if (ref.kind === 'head' || ref.name === currentHeadName) {
      continue;
    }

    const tipHashes = commitHashesByRef.get(createRefKey(ref.kind, ref.name)) ?? [];
    if (tipHashes.some((hash) => headAncestors.has(hash))) {
      blockedTargets.add(`${ref.kind}::${ref.name}`);
    }
  }

  return [...blockedTargets];
}

function buildCommitHashesByRefKey(graph: CommitGraph): Map<string, string[]> {
  const commitHashesByRef = new Map<string, string[]>();
  for (const commit of graph.orderedCommits) {
    for (const ref of commit.refs) {
      const key = createRefKey(ref.kind, ref.name);
      const hashes = commitHashesByRef.get(key);
      if (hashes) {
        hashes.push(commit.hash);
      } else {
        commitHashesByRef.set(key, [commit.hash]);
      }
    }
  }

  return commitHashesByRef;
}

function createRefKey(kind: RevisionGraphRef['kind'], name: string): string {
  return `${kind}::${name}`;
}

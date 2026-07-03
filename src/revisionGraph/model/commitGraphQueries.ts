import { CommitGraph, RevisionGraphRef } from './commitGraphTypes';

export function findCommitHashesByRef(
  graph: CommitGraph,
  refName: string,
  refKind?: RevisionGraphRef['kind']
): string[] {
  return graph.orderedCommits
    .filter((commit) =>
      commit.refs.some((ref) => ref.name === refName && (refKind === undefined || ref.kind === refKind))
    )
    .map((commit) => commit.hash);
}

export function collectAncestorHashes(
  graph: CommitGraph,
  startHashes: readonly string[]
): Set<string> {
  const reachable = new Set<string>();
  const queue = [...startHashes];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const hash = queue[queueIndex];
    queueIndex += 1;
    if (!hash || reachable.has(hash)) {
      continue;
    }

    reachable.add(hash);
    const commit = graph.commitsByHash.get(hash);
    if (!commit) {
      continue;
    }

    queue.push(...commit.parents);
  }

  return reachable;
}

export function collectDescendantHashes(
  graph: CommitGraph,
  startHashes: readonly string[]
): Set<string> {
  const reachable = new Set<string>();
  const queue = [...startHashes];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const hash = queue[queueIndex];
    queueIndex += 1;
    if (!hash || reachable.has(hash)) {
      continue;
    }

    reachable.add(hash);
    const commit = graph.commitsByHash.get(hash);
    if (!commit) {
      continue;
    }

    queue.push(...commit.children);
  }

  return reachable;
}

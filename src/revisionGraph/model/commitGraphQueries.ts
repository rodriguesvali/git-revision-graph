import { CommitGraph, CommitGraphCommit, RevisionGraphRef } from './commitGraphTypes';

export function getCommit(graph: CommitGraph, hash: string): CommitGraphCommit | undefined {
  return graph.commitsByHash.get(hash);
}

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

  while (queue.length > 0) {
    const hash = queue.shift();
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

  while (queue.length > 0) {
    const hash = queue.shift();
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

export function buildFirstParentVisiblePath(
  graph: CommitGraph,
  startHash: string,
  visibleHashes: ReadonlySet<string>
): string[] {
  const path = [startHash];
  const visited = new Set(path);
  let currentCommit = graph.commitsByHash.get(startHash);

  while (currentCommit?.parents[0]) {
    const firstParentHash = currentCommit.parents[0];
    if (visited.has(firstParentHash)) {
      break;
    }

    visited.add(firstParentHash);
    if (visibleHashes.has(firstParentHash)) {
      path.push(firstParentHash);
    }

    currentCommit = graph.commitsByHash.get(firstParentHash);
  }

  return path;
}

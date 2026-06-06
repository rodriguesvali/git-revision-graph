import {
  CommitGraph,
  ProjectedGraph,
  ProjectedGraphEdge,
  ProjectedGraphNode,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from '../model/commitGraphTypes';
import { collectAncestorHashes, collectDescendantHashes } from '../model/commitGraphQueries';

const DEFAULT_PROJECTION_OPTIONS: RevisionGraphProjectionOptions = {
  refScope: 'all',
  showTags: true,
  showRemoteBranches: true,
  showStashes: true,
  showMergeCommits: false,
  showCurrentBranchDescendants: false
};
const DEFAULT_REMOTE_HEAD_REF_NAMES = ['origin/HEAD', 'origin/main', 'origin/master'];

export function projectMajorOperationsGraph(
  graph: CommitGraph,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS
): ProjectedGraph {
  const scopeHashes = getScopeHashes(graph, options);
  const visibleHashes = buildMajorOperationsVisibleHashes(graph, scopeHashes, options);

  return projectCommitGraph(graph, visibleHashes, options);
}

export function projectCommitGraph(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS
): ProjectedGraph {
  const nodes: ProjectedGraphNode[] = graph.orderedCommits
    .filter((commit) => visibleHashes.has(commit.hash))
    .map((commit) => ({
      hash: commit.hash,
      author: commit.author,
      date: commit.date,
      subject: commit.subject,
      refs: filterRefs(commit.refs, options),
      isBoundary: commit.isBoundary
    }));

  const edges: ProjectedGraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const node of nodes) {
    const commit = graph.commitsByHash.get(node.hash);
    if (!commit) {
      continue;
    }

    for (const parentHash of commit.parents) {
      for (const target of findProjectedTargets(graph, parentHash, visibleHashes)) {
        const key = `${node.hash}->${target.to}`;
        if (edgeKeys.has(key)) {
          continue;
        }

        edgeKeys.add(key);
        edges.push({
          from: node.hash,
          to: target.to,
          through: target.through
        });
      }
    }
  }

  return {
    sourceGraph: graph,
    nodes,
    edges,
    visibleHashes
  };
}

function getScopeHashes(
  graph: CommitGraph,
  options: RevisionGraphProjectionOptions
): Set<string> {
  switch (options.refScope) {
    case 'current': {
      const headHashes = graph.orderedCommits
        .filter((commit) => commit.refs.some((ref) => ref.kind === 'head'))
        .map((commit) => commit.hash);
      if (headHashes.length === 0) {
        return new Set(graph.orderedCommits.map((commit) => commit.hash));
      }

      return collectAncestorHashes(graph, [
        ...headHashes,
        ...collectDescendantRefTipHashes(graph, headHashes, options, false)
      ]);
    }
    case 'remoteHead': {
      const remoteHeadHashes = graph.orderedCommits
        .filter((commit) => commit.refs.some(isDefaultRemoteHeadRef))
        .map((commit) => commit.hash);
      return remoteHeadHashes.length > 0
        ? collectAncestorHashes(graph, [
            ...remoteHeadHashes,
            ...collectDescendantRefTipHashes(graph, remoteHeadHashes, options, true)
          ])
        : new Set<string>();
    }
    case 'local': {
      const localBranchHashes = graph.orderedCommits
        .filter((commit) => commit.refs.some((ref) => ref.kind === 'head' || ref.kind === 'branch'))
        .map((commit) => commit.hash);
      return localBranchHashes.length > 0
        ? collectAncestorHashes(graph, localBranchHashes)
        : new Set(graph.orderedCommits.map((commit) => commit.hash));
    }
    case 'all':
      return new Set(graph.orderedCommits.map((commit) => commit.hash));
  }
}

function collectDescendantRefTipHashes(
  graph: CommitGraph,
  startHashes: readonly string[],
  options: RevisionGraphProjectionOptions,
  includeHeadRefs: boolean
): string[] {
  const descendantHashes = collectDescendantHashes(graph, startHashes);
  const startHashSet = new Set(startHashes);
  return graph.orderedCommits
    .filter((commit) =>
      !startHashSet.has(commit.hash) &&
      descendantHashes.has(commit.hash) &&
      commit.refs.some((ref) => includeHeadRefs || ref.kind !== 'head') &&
      filterRefs(commit.refs, options).length > 0
    )
    .map((commit) => commit.hash);
}

function buildMajorOperationsVisibleHashes(
  graph: CommitGraph,
  candidateHashes: ReadonlySet<string>,
  options: RevisionGraphProjectionOptions
): Set<string> {
  const candidateCommits = graph.orderedCommits.filter((commit) =>
    candidateHashes.has(commit.hash) && !commit.isBoundary
  );
  const candidateHashSet = new Set(candidateCommits.map((commit) => commit.hash));
  const childCountByHash = new Map<string, number>();

  for (const commit of candidateCommits) {
    for (const parentHash of commit.parents) {
      if (!candidateHashSet.has(parentHash)) {
        continue;
      }

      childCountByHash.set(parentHash, (childCountByHash.get(parentHash) ?? 0) + 1);
    }
  }

  return new Set(
    candidateCommits
      .filter((commit) => {
        const parentCount = commit.parents.filter((parentHash) => candidateHashSet.has(parentHash)).length;
        const childCount = childCountByHash.get(commit.hash) ?? 0;
        const hasVisibleRef = filterRefs(commit.refs, options).length > 0 ||
          (options.refScope === 'remoteHead' && commit.refs.some(isDefaultRemoteHeadRef));
        const isMerge = parentCount > 1;
        const isFork = childCount > 1;
        const isRoot = parentCount === 0;
        const isUnreferencedTip = childCount === 0 && commit.refs.length === 0;

        return hasVisibleRef || (isMerge && options.showMergeCommits) || isFork || isRoot || isUnreferencedTip;
      })
      .map((commit) => commit.hash)
  );
}

function isDefaultRemoteHeadRef(ref: RevisionGraphRef): boolean {
  return ref.kind === 'remote' && DEFAULT_REMOTE_HEAD_REF_NAMES.includes(ref.name);
}

function filterRefs(
  refs: readonly RevisionGraphRef[],
  options: RevisionGraphProjectionOptions
): RevisionGraphRef[] {
  return refs.filter((ref) => {
    if (ref.kind === 'tag' && !options.showTags) {
      return false;
    }
    if (ref.kind === 'remote' && !options.showRemoteBranches) {
      return false;
    }
    if (ref.kind === 'stash' && !options.showStashes) {
      return false;
    }

    return true;
  });
}


function findProjectedTargets(
  graph: CommitGraph,
  startHash: string,
  visibleHashes: ReadonlySet<string>
): Array<{ readonly to: string; readonly through: readonly string[] }> {
  const targets: Array<{ readonly to: string; readonly through: readonly string[] }> = [];
  const targetKeys = new Set<string>();

  collectProjectedTargets(graph, startHash, visibleHashes, [], new Set(), targets, targetKeys);

  return targets;
}

function collectProjectedTargets(
  graph: CommitGraph,
  currentHash: string,
  visibleHashes: ReadonlySet<string>,
  through: readonly string[],
  visited: ReadonlySet<string>,
  targets: Array<{ readonly to: string; readonly through: readonly string[] }>,
  targetKeys: Set<string>
): void {
  if (visited.has(currentHash)) {
    return;
  }

  if (visibleHashes.has(currentHash)) {
    if (!targetKeys.has(currentHash)) {
      targetKeys.add(currentHash);
      targets.push({ to: currentHash, through });
    }
    return;
  }

  const commit = graph.commitsByHash.get(currentHash);
  if (!commit || commit.parents.length === 0) {
    return;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(currentHash);
  const nextThrough = [...through, currentHash];

  for (const parentHash of commit.parents) {
    collectProjectedTargets(graph, parentHash, visibleHashes, nextThrough, nextVisited, targets, targetKeys);
  }
}

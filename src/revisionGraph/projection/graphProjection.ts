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
  showCurrentBranchDescendants: false
};
const DEFAULT_REMOTE_HEAD_REF_NAMES = ['origin/HEAD', 'origin/main', 'origin/master'];

export function projectDecoratedCommitGraph(
  graph: CommitGraph,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS
): ProjectedGraph {
  const scopeHashes = getScopeHashes(graph, options);
  const visibleHashes = buildVisibleHashes(graph, scopeHashes, options);

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

function buildVisibleHashes(
  graph: CommitGraph,
  candidateHashes: ReadonlySet<string>,
  options: RevisionGraphProjectionOptions
): Set<string> {
  if (graph.simplification === 'git-decoration') {
    return buildVisibleHashesFromGitSimplifiedGraph(graph, candidateHashes, options);
  }

  const visibleHashes = new Set(
    graph.orderedCommits
      .filter((commit) => candidateHashes.has(commit.hash) && shouldDisplayCommit(commit, options))
      .map((commit) => commit.hash)
  );

  return expandVisibleHashesWithStructuralConnectors(graph, candidateHashes, visibleHashes);
}

function buildVisibleHashesFromGitSimplifiedGraph(
  graph: CommitGraph,
  candidateHashes: ReadonlySet<string>,
  options: RevisionGraphProjectionOptions
): Set<string> {
  const candidateCommits = graph.orderedCommits.filter(
    (commit) => candidateHashes.has(commit.hash) && !commit.isBoundary
  );
  const visibleHashes = new Set(candidateCommits
    .filter((commit) => shouldDisplayCommit(commit, options))
    .map((commit) => commit.hash));

  if (options.showTags) {
    return expandVisibleHashesWithStructuralConnectors(graph, candidateHashes, visibleHashes);
  }

  return rewriteGitSimplifiedVisibleHashes(
    candidateCommits.filter((commit) => visibleHashes.has(commit.hash)),
    options
  );
}

function shouldDisplayCommit(
  commit: CommitGraph['orderedCommits'][number],
  options: RevisionGraphProjectionOptions
): boolean {
  if (options.refScope === 'remoteHead' && commit.refs.some(isDefaultRemoteHeadRef)) {
    return true;
  }

  if (filterRefs(commit.refs, options).length > 0) {
    return true;
  }

  return false;
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

function rewriteGitSimplifiedVisibleHashes(
  commits: readonly CommitGraph['orderedCommits'][number][],
  options: RevisionGraphProjectionOptions
): Set<string> {
  interface MutableVisibleCommit {
    hash: string;
    parents: string[];
    refs: RevisionGraphRef[];
  }

  const mutableByHash = new Map<string, MutableVisibleCommit>(
    commits.map((commit) => [
      commit.hash,
      {
        hash: commit.hash,
        parents: [...commit.parents],
        refs: filterRefs(commit.refs, options)
      }
    ])
  );
  const childMap = new Map<string, string[]>();

  for (const commit of mutableByHash.values()) {
    for (const parentHash of commit.parents) {
      const children = childMap.get(parentHash);
      if (children) {
        children.push(commit.hash);
      } else {
        childMap.set(parentHash, [commit.hash]);
      }
    }
  }

  const skipList = new Set<string>();

  for (const commit of commits) {
    const mutableCommit = mutableByHash.get(commit.hash);
    if (!mutableCommit || mutableCommit.refs.length > 0) {
      continue;
    }

    if (mutableCommit.parents.length !== 1) {
      continue;
    }

    const childHashes = childMap.get(commit.hash);
    if (!childHashes || childHashes.length !== 1) {
      continue;
    }

    const child = mutableByHash.get(childHashes[0]);
    if (!child || child.parents.length !== 1) {
      continue;
    }

    skipList.add(commit.hash);
    child.parents[0] = mutableCommit.parents[0];

    const parentChildren = childMap.get(mutableCommit.parents[0]);
    if (parentChildren) {
      const index = parentChildren.indexOf(commit.hash);
      if (index >= 0) {
        parentChildren[index] = child.hash;
      }
    }

    childMap.delete(commit.hash);
  }

  return new Set(commits.filter((commit) => !skipList.has(commit.hash)).map((commit) => commit.hash));
}

function expandVisibleHashesWithStructuralConnectors(
  graph: CommitGraph,
  candidateHashes: ReadonlySet<string>,
  baseVisibleHashes: ReadonlySet<string>
): Set<string> {
  const visibleHashes = new Set(baseVisibleHashes);
  let changed = true;

  while (changed) {
    changed = false;
    for (const hash of [...visibleHashes]) {
      const commit = graph.commitsByHash.get(hash);
      if (!commit || !candidateHashes.has(hash)) {
        continue;
      }

      for (const parentHash of commit.parents) {
        const connectorHash = findStructuralConnectorHash(graph, parentHash, candidateHashes, visibleHashes);
        if (!connectorHash || visibleHashes.has(connectorHash)) {
          continue;
        }

        visibleHashes.add(connectorHash);
        changed = true;
      }
    }
  }

  return visibleHashes;
}

function findStructuralConnectorHash(
  graph: CommitGraph,
  startHash: string,
  candidateHashes: ReadonlySet<string>,
  visibleHashes: ReadonlySet<string>
): string | undefined {
  let currentHash: string | undefined = startHash;
  const visited = new Set<string>();

  while (currentHash && !visited.has(currentHash) && candidateHashes.has(currentHash)) {
    if (visibleHashes.has(currentHash)) {
      return undefined;
    }

    const commit = graph.commitsByHash.get(currentHash);
    if (!commit) {
      return undefined;
    }

    if (isStructuralConnectorCommit(commit)) {
      return currentHash;
    }

    if (commit.parents.length === 0 || commit.isBoundary) {
      return undefined;
    }

    visited.add(currentHash);
    currentHash = commit.parents[0];
  }

  return undefined;
}

function isStructuralConnectorCommit(
  commit: CommitGraph['orderedCommits'][number]
): boolean {
  return commit.children.length > 1;
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

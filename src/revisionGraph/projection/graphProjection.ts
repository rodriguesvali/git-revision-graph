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
  showCurrentBranchDescendants: false,
  revisionRange: undefined,
  descendantFocus: undefined
};
const DEFAULT_REMOTE_HEAD_REF_NAMES = ['origin/HEAD', 'origin/main', 'origin/master'];

export function projectMajorOperationsGraph(
  graph: CommitGraph,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS
): ProjectedGraph {
  const scopeHashes = getScopeHashes(graph, options);
  const visibleHashes = buildMajorOperationsVisibleHashes(graph, scopeHashes, options);

  return projectCommitGraph(graph, visibleHashes, options, scopeHashes);
}

export function countMajorOperationsVisibleNodes(
  graph: CommitGraph,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS
): number {
  const scopeHashes = getScopeHashes(graph, options);
  const visibility = buildMajorOperationsVisibility(graph, scopeHashes);
  let count = 0;
  for (const commit of visibility.candidateCommits) {
    if (isMajorOperationsCommitVisible(commit, visibility, options)) {
      count += 1;
    }
  }
  return count;
}

export function projectCommitGraph(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  options: RevisionGraphProjectionOptions = DEFAULT_PROJECTION_OPTIONS,
  scopeHashes?: ReadonlySet<string>
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
  const resolveProjectedTargets = createProjectedTargetResolver(
    graph,
    visibleHashes,
    scopeHashes
  );

  for (const node of nodes) {
    const commit = graph.commitsByHash.get(node.hash);
    if (!commit) {
      continue;
    }

    for (const parentHash of commit.parents) {
      for (const target of resolveProjectedTargets(parentHash)) {
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
  if (options.descendantFocus) {
    const anchorHash = resolveRevisionHash(graph, options.descendantFocus.anchorRevision);
    if (anchorHash) {
      return collectDescendantHashes(graph, [anchorHash]);
    }

    return new Set<string>();
  }

  if (options.revisionRange) {
    const rangeHashes = getRevisionRangeHashes(graph, options.revisionRange.baseRevision, options.revisionRange.compareRevision);
    if (rangeHashes) {
      return rangeHashes;
    }
  }

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

function getRevisionRangeHashes(
  graph: CommitGraph,
  baseRevision: string,
  compareRevision: string
): Set<string> | undefined {
  const baseHash = resolveRevisionHash(graph, baseRevision);
  const compareHash = resolveRevisionHash(graph, compareRevision);
  if (!baseHash || !compareHash) {
    return undefined;
  }

  const baseAncestors = collectAncestorHashes(graph, [baseHash]);
  const compareAncestors = collectAncestorHashes(graph, [compareHash]);
  const rangeHashes = new Set<string>();
  for (const hash of compareAncestors) {
    if (!baseAncestors.has(hash)) {
      rangeHashes.add(hash);
    }
  }
  rangeHashes.add(baseHash);
  rangeHashes.add(compareHash);
  return rangeHashes;
}

function resolveRevisionHash(graph: CommitGraph, revision: string): string | undefined {
  if (graph.commitsByHash.has(revision)) {
    return revision;
  }

  return graph.orderedCommits.find((commit) =>
    commit.refs.some((ref) => ref.name === revision)
  )?.hash;
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
  const visibility = buildMajorOperationsVisibility(graph, candidateHashes);
  const visibleHashes = new Set<string>();
  for (const commit of visibility.candidateCommits) {
    if (isMajorOperationsCommitVisible(commit, visibility, options)) {
      visibleHashes.add(commit.hash);
    }
  }
  return visibleHashes;
}

interface MajorOperationsVisibility {
  readonly candidateCommits: ReadonlyArray<CommitGraph['orderedCommits'][number]>;
  readonly candidateHashSet: ReadonlySet<string>;
  readonly childCountByHash: ReadonlyMap<string, number>;
}

function buildMajorOperationsVisibility(
  graph: CommitGraph,
  candidateHashes: ReadonlySet<string>
): MajorOperationsVisibility {
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

  return { candidateCommits, candidateHashSet, childCountByHash };
}

function isMajorOperationsCommitVisible(
  commit: CommitGraph['orderedCommits'][number],
  visibility: MajorOperationsVisibility,
  options: RevisionGraphProjectionOptions
): boolean {
  let parentCount = 0;
  for (const parentHash of commit.parents) {
    if (visibility.candidateHashSet.has(parentHash)) {
      parentCount += 1;
    }
  }
  const childCount = visibility.childCountByHash.get(commit.hash) ?? 0;
  const hasVisibleRef = commit.refs.some((ref) => isProjectionRefVisible(ref, options)) ||
    (options.refScope === 'remoteHead' && commit.refs.some(isDefaultRemoteHeadRef));
  const isMerge = parentCount > 1;
  const isFork = childCount > 1;
  const isRoot = parentCount === 0;
  const isUnreferencedTip = childCount === 0 && commit.refs.length === 0;

  return hasVisibleRef || (isMerge && options.showMergeCommits) || isFork || isRoot || isUnreferencedTip;
}

function isDefaultRemoteHeadRef(ref: RevisionGraphRef): boolean {
  return ref.kind === 'remote' && DEFAULT_REMOTE_HEAD_REF_NAMES.includes(ref.name);
}

function filterRefs(
  refs: readonly RevisionGraphRef[],
  options: RevisionGraphProjectionOptions
): RevisionGraphRef[] {
  return refs.filter((ref) => isProjectionRefVisible(ref, options));
}

function isProjectionRefVisible(
  ref: RevisionGraphRef,
  options: RevisionGraphProjectionOptions
): boolean {
  return (ref.kind !== 'tag' || options.showTags)
    && (ref.kind !== 'remote' || options.showRemoteBranches)
    && (ref.kind !== 'stash' || options.showStashes);
}

interface ProjectedTarget {
  readonly to: string;
  readonly through: readonly string[];
}

interface ResolvedProjectedTarget {
  readonly to: string;
  readonly through: ProjectedThroughPath | undefined;
}

interface ProjectedThroughPath {
  readonly hash: string;
  readonly next: ProjectedThroughPath | undefined;
}

interface ProjectedTargetResolutionFrame {
  readonly hash: string;
  readonly targets: ResolvedProjectedTarget[];
  readonly targetKeys: Set<string>;
  parents: readonly string[] | undefined;
  parentIndex: number;
}

function createProjectedTargetResolver(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  scopeHashes: ReadonlySet<string> | undefined
): (startHash: string) => readonly ProjectedTarget[] {
  const memo = new Map<string, readonly ResolvedProjectedTarget[]>();
  const materializedMemo = new Map<string, readonly ProjectedTarget[]>();
  return (startHash) => {
    const materializedTargets = materializedMemo.get(startHash);
    if (materializedTargets) {
      return materializedTargets;
    }
    if (!memo.has(startHash)) {
      resolveProjectedTargets(graph, startHash, visibleHashes, scopeHashes, memo);
    }
    const targets = (memo.get(startHash) ?? []).map(materializeProjectedTarget);
    materializedMemo.set(startHash, targets);
    return targets;
  };
}

function resolveProjectedTargets(
  graph: CommitGraph,
  startHash: string,
  visibleHashes: ReadonlySet<string>,
  scopeHashes: ReadonlySet<string> | undefined,
  memo: Map<string, readonly ResolvedProjectedTarget[]>
): void {
  const activeHashes = new Set<string>();
  const stack: ProjectedTargetResolutionFrame[] = [createProjectedTargetResolutionFrame(startHash)];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (memo.has(frame.hash)) {
      stack.pop();
      continue;
    }

    if (!frame.parents) {
      if (scopeHashes && !scopeHashes.has(frame.hash)) {
        memo.set(frame.hash, []);
        stack.pop();
        continue;
      }
      if (visibleHashes.has(frame.hash)) {
        memo.set(frame.hash, [{ to: frame.hash, through: undefined }]);
        stack.pop();
        continue;
      }

      const commit = graph.commitsByHash.get(frame.hash);
      if (!commit || commit.parents.length === 0) {
        memo.set(frame.hash, []);
        stack.pop();
        continue;
      }
      frame.parents = commit.parents;
      activeHashes.add(frame.hash);
    }

    if (frame.parentIndex >= frame.parents.length) {
      memo.set(frame.hash, frame.targets);
      activeHashes.delete(frame.hash);
      stack.pop();
      continue;
    }

    const parentHash = frame.parents[frame.parentIndex];
    const parentTargets = memo.get(parentHash);
    if (parentTargets) {
      appendProjectedTargets(frame, parentTargets);
      frame.parentIndex += 1;
      continue;
    }
    if (activeHashes.has(parentHash)) {
      frame.parentIndex += 1;
      continue;
    }
    stack.push(createProjectedTargetResolutionFrame(parentHash));
  }
}

function createProjectedTargetResolutionFrame(hash: string): ProjectedTargetResolutionFrame {
  return {
    hash,
    targets: [],
    targetKeys: new Set(),
    parents: undefined,
    parentIndex: 0
  };
}

function appendProjectedTargets(
  frame: ProjectedTargetResolutionFrame,
  parentTargets: readonly ResolvedProjectedTarget[]
): void {
  for (const target of parentTargets) {
    if (frame.targetKeys.has(target.to)) {
      continue;
    }
    frame.targetKeys.add(target.to);
    frame.targets.push({
      to: target.to,
      through: {
        hash: frame.hash,
        next: target.through
      }
    });
  }
}

function materializeProjectedTarget(target: ResolvedProjectedTarget): ProjectedTarget {
  const through: string[] = [];
  let path = target.through;
  while (path) {
    through.push(path.hash);
    path = path.next;
  }
  return {
    to: target.to,
    through
  };
}

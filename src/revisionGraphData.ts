import { buildCommitGraph } from './revisionGraph/model/commitGraph';
import { buildFirstParentVisiblePath, collectAncestorHashes, findCommitHashesByRef } from './revisionGraph/model/commitGraphQueries';
import {
  CommitGraph,
  CommitGraphCommit,
  ParsedRevisionGraphCommit,
  ProjectedGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './revisionGraph/model/commitGraphTypes';
import {
  projectAncestorDecoratedCommitGraph,
  projectDecoratedCommitGraph
} from './revisionGraph/projection/graphProjection';
import {
  getRevisionGraphGitFormat,
  parseDecorationRefs,
  parseRevisionGraphLog
} from './revisionGraph/source/graphGit';

export type {
  CommitGraph,
  ParsedRevisionGraphCommit as RevisionGraphCommit,
  ProjectedGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
};
export { buildCommitGraph, getRevisionGraphGitFormat, parseDecorationRefs, parseRevisionGraphLog };
export { projectAncestorDecoratedCommitGraph, projectDecoratedCommitGraph };

export interface RevisionGraphNode {
  readonly hash: string;
  readonly refs: readonly RevisionGraphRef[];
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly row: number;
  readonly lane: number;
}

export interface RevisionGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly fromRow: number;
  readonly fromLane: number;
  readonly toRow: number;
  readonly toLane: number;
}

export interface RevisionGraphScene {
  readonly nodes: readonly RevisionGraphNode[];
  readonly edges: readonly RevisionGraphEdge[];
  readonly laneCount: number;
  readonly rowCount: number;
}

interface CommitLaneLayout {
  readonly hash: string;
  readonly row: number;
  readonly lane: number;
}

export function buildRevisionGraphScene(
  source: CommitGraph | readonly ParsedRevisionGraphCommit[],
  projection?: ProjectedGraph
): RevisionGraphScene {
  const graph = toCommitGraph(source);
  const activeProjection = projection ?? projectDecoratedCommitGraph(graph);
  const commitLayout = layoutCommitLanes(graph.orderedCommits);
  const layoutByHash = new Map(commitLayout.map((layout) => [layout.hash, layout] as const));

  const rawNodes = activeProjection.nodes.map<RevisionGraphNode>((node) => {
    const layout = layoutByHash.get(node.hash);
    if (!layout) {
      throw new Error(`Missing layout for commit ${node.hash}`);
    }

    return {
      hash: node.hash,
      refs: node.refs,
      author: node.author,
      date: node.date,
      subject: node.subject,
      row: layout.row,
      lane: layout.lane
    };
  });
  const nodes = compactNodeRows(compactNodeLanes(rawNodes));
  const nodeByHash = new Map(nodes.map((node) => [node.hash, node] as const));

  const edges = activeProjection.edges
    .map<RevisionGraphEdge | undefined>((edge) => {
      const fromNode = nodeByHash.get(edge.from);
      const toNode = nodeByHash.get(edge.to);
      if (!fromNode || !toNode) {
        return undefined;
      }

      return {
        from: edge.from,
        to: edge.to,
        fromRow: fromNode.row,
        fromLane: fromNode.lane,
        toRow: toNode.row,
        toLane: toNode.lane
      };
    })
    .filter((edge): edge is RevisionGraphEdge => edge !== undefined);

  const laneCount = nodes.reduce((max, node) => Math.max(max, node.lane + 1), 0);
  const rowCount = nodes.reduce((max, node) => Math.max(max, node.row + 1), 0);

  return {
    nodes,
    edges,
    laneCount: Math.max(laneCount, 1),
    rowCount: Math.max(rowCount, 1)
  };
}

export function buildPrimaryAncestorPaths(
  source: CommitGraph | readonly ParsedRevisionGraphCommit[],
  scene: RevisionGraphScene
): Record<string, string[]> {
  const graph = toCommitGraph(source);
  const visibleHashes = new Set(scene.nodes.map((node) => node.hash));
  const pathsByHash: Record<string, string[]> = {};

  for (const node of scene.nodes) {
    pathsByHash[node.hash] = buildFirstParentVisiblePath(graph, node.hash, visibleHashes);
  }

  return pathsByHash;
}

export function filterRevisionGraphCommitsToAncestors(
  commits: readonly ParsedRevisionGraphCommit[],
  refName: string,
  refKind?: RevisionGraphRef['kind']
): ParsedRevisionGraphCommit[] {
  const graph = buildCommitGraph(commits);
  const targetHashes = findCommitHashesByRef(graph, refName, refKind);
  if (targetHashes.length === 0) {
    return [];
  }

  const ancestorHashes = collectAncestorHashes(graph, targetHashes);
  return graph.orderedCommits
    .filter((commit) => !commit.isBoundary && ancestorHashes.has(commit.hash))
    .map(toParsedCommit);
}

function toCommitGraph(source: CommitGraph | readonly ParsedRevisionGraphCommit[]): CommitGraph {
  return isCommitGraph(source) ? source : buildCommitGraph(source);
}

function isCommitGraph(source: CommitGraph | readonly ParsedRevisionGraphCommit[]): source is CommitGraph {
  return 'orderedCommits' in source && 'commitsByHash' in source;
}

function toParsedCommit(commit: CommitGraphCommit): ParsedRevisionGraphCommit {
  return {
    hash: commit.hash,
    parents: commit.parents,
    author: commit.author,
    date: commit.date,
    subject: commit.subject,
    refs: commit.refs
  };
}

function layoutCommitLanes(commits: readonly CommitGraphCommit[]): CommitLaneLayout[] {
  const nodes: CommitLaneLayout[] = [];
  const activeLanes: Array<string | undefined> = [];

  for (const [row, commit] of commits.entries()) {
    const existingLane = activeLanes.indexOf(commit.hash);
    const lane = existingLane >= 0 ? existingLane : findAvailableLane(activeLanes);

    activeLanes[lane] = commit.parents[0];
    for (const parent of commit.parents.slice(1)) {
      const parentLane = activeLanes.indexOf(parent);
      if (parentLane === -1) {
        activeLanes[findAvailableLane(activeLanes)] = parent;
      }
    }

    trimTrailingEmptyLanes(activeLanes);
    nodes.push({ hash: commit.hash, row, lane });
  }

  return nodes;
}

function compactNodeRows(nodes: readonly RevisionGraphNode[]): RevisionGraphNode[] {
  return [...nodes]
    .sort((left, right) => left.row - right.row)
    .map((node, row) => ({
      ...node,
      row
    }));
}

function compactNodeLanes(nodes: readonly RevisionGraphNode[]): RevisionGraphNode[] {
  const compactLaneByOriginal = new Map<number, number>();
  const orderedOriginalLanes = [...new Set(nodes.map((node) => node.lane))].sort((left, right) => left - right);

  for (const [compactLane, originalLane] of orderedOriginalLanes.entries()) {
    compactLaneByOriginal.set(originalLane, compactLane);
  }

  return nodes.map((node) => ({
    ...node,
    lane: compactLaneByOriginal.get(node.lane) ?? node.lane
  }));
}

function findAvailableLane(activeLanes: Array<string | undefined>): number {
  const firstEmpty = activeLanes.findIndex((lane) => lane === undefined);
  if (firstEmpty >= 0) {
    return firstEmpty;
  }

  activeLanes.push(undefined);
  return activeLanes.length - 1;
}

function trimTrailingEmptyLanes(activeLanes: Array<string | undefined>): void {
  while (activeLanes.length > 0 && activeLanes.at(-1) === undefined) {
    activeLanes.pop();
  }
}

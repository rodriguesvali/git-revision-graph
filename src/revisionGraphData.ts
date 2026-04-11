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
import { layoutProjectedGraphHorizontally } from './revisionGraph/layout/layeredLayout';

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
  readonly x: number;
  readonly row: number;
  readonly lane: number;
}

export interface RevisionGraphEdge {
  readonly from: string;
  readonly to: string;
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
  readonly x: number;
}

export async function buildRevisionGraphScene(
  source: CommitGraph | readonly ParsedRevisionGraphCommit[],
  projection?: ProjectedGraph
): Promise<RevisionGraphScene> {
  const graph = toCommitGraph(source);
  const activeProjection = projection ?? projectDecoratedCommitGraph(graph);
  const commitLayout = await layoutCommitLanes(activeProjection);
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
      x: layout.x,
      row: layout.row,
      lane: layout.lane
    };
  });
  const nodes = compactNodeLanes(rawNodes);
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
        to: edge.to
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

async function layoutCommitLanes(projection: ProjectedGraph): Promise<CommitLaneLayout[]> {
  const xByHash = await layoutProjectedGraphHorizontally(projection);
  const orderedHashes = projection.nodes.map((node) => node.hash);
  const fallbackXByHash = new Map(
    orderedHashes.map((hash, index) => [hash, index * 220] as const)
  );
  const uniqueXs = [...new Set(
    orderedHashes
      .map((hash) => Math.round((xByHash.get(hash) ?? fallbackXByHash.get(hash) ?? 0) / 10) * 10)
  )].sort((left, right) => left - right);
  const laneByRoundedX = new Map(uniqueXs.map((x, index) => [x, index] as const));

  return projection.nodes.map((node, row) => {
    const x = xByHash.get(node.hash) ?? fallbackXByHash.get(node.hash) ?? 0;
    const roundedX = Math.round(x / 10) * 10;

    return {
      hash: node.hash,
      row,
      lane: laneByRoundedX.get(roundedX) ?? 0,
      x
    };
  });
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

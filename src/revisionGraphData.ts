import { buildCommitGraph } from './revisionGraph/model/commitGraph';
import { buildFirstParentVisiblePath } from './revisionGraph/model/commitGraphQueries';
import {
  CommitGraph,
  ParsedRevisionGraphCommit,
  ProjectedGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './revisionGraph/model/commitGraphTypes';
import {
  projectDecoratedCommitGraph
} from './revisionGraph/projection/graphProjection';
import {
  getRevisionGraphGitFormat,
  parseDecorationRefs,
  parseRevisionGraphLog
} from './revisionGraph/source/graphGit';
import {
  getProjectedGraphLayoutCacheStats,
  layoutProjectedGraph
} from './revisionGraph/layout/layeredLayout';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from './revisionGraph/loadTrace';

export type {
  CommitGraph,
  ParsedRevisionGraphCommit as RevisionGraphCommit,
  ProjectedGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
};
export { buildCommitGraph, getRevisionGraphGitFormat, parseDecorationRefs, parseRevisionGraphLog };
export { projectDecoratedCommitGraph };

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
  projection?: ProjectedGraph,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphScene> {
  const startedAt = nowMs();
  const graph = toCommitGraph(source);
  const activeProjection = projection ?? projectDecoratedCommitGraph(graph);
  const commitLayout = await layoutCommitLanes(activeProjection, trace);
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

  const scene = {
    nodes,
    edges,
    laneCount: Math.max(laneCount, 1),
    rowCount: Math.max(rowCount, 1)
  };
  traceDuration(trace, 'scene.total', startedAt, `nodes=${nodes.length}; edges=${edges.length}`);
  return scene;
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

function toCommitGraph(source: CommitGraph | readonly ParsedRevisionGraphCommit[]): CommitGraph {
  return isCommitGraph(source) ? source : buildCommitGraph(source);
}

function isCommitGraph(source: CommitGraph | readonly ParsedRevisionGraphCommit[]): source is CommitGraph {
  return 'orderedCommits' in source && 'commitsByHash' in source;
}

async function layoutCommitLanes(
  projection: ProjectedGraph,
  trace?: RevisionGraphLoadTraceSink
): Promise<CommitLaneLayout[]> {
  const startedAt = nowMs();
  const cacheStatsBefore = getProjectedGraphLayoutCacheStats();
  const positionByHash = await layoutProjectedGraph(projection);
  const cacheStatsAfter = getProjectedGraphLayoutCacheStats();
  const cacheResult = cacheStatsAfter.hits > cacheStatsBefore.hits ? 'hit' : 'miss';
  traceDuration(
    trace,
    'scene.layout.elk',
    startedAt,
    `nodes=${projection.nodes.length}; edges=${projection.edges.length}; cache=${cacheResult}; entries=${cacheStatsAfter.entries}`
  );
  const orderedHashes = projection.nodes.map((node) => node.hash);
  const fallbackXByHash = new Map(
    orderedHashes.map((hash, index) => [hash, index * 220] as const)
  );
  const fallbackRowByHash = new Map(
    orderedHashes.map((hash, index) => [hash, index] as const)
  );
  const uniqueXs = [...new Set(
    orderedHashes
      .map((hash) => Math.round((positionByHash.get(hash)?.x ?? fallbackXByHash.get(hash) ?? 0) / 10) * 10)
  )].sort((left, right) => left - right);
  const uniqueYs = [...new Set(
    orderedHashes
      .map((hash) => Math.round((positionByHash.get(hash)?.y ?? (fallbackRowByHash.get(hash) ?? 0) * 100) / 10) * 10)
  )].sort((left, right) => left - right);
  const laneByRoundedX = new Map(uniqueXs.map((x, index) => [x, index] as const));
  const rowByRoundedY = new Map(uniqueYs.map((y, index) => [y, index] as const));

  return projection.nodes.map((node) => {
    const position = positionByHash.get(node.hash);
    const x = position?.x ?? fallbackXByHash.get(node.hash) ?? 0;
    const y = position?.y ?? (fallbackRowByHash.get(node.hash) ?? 0) * 100;
    const roundedX = Math.round(x / 10) * 10;
    const roundedY = Math.round(y / 10) * 10;

    return {
      hash: node.hash,
      row: rowByRoundedY.get(roundedY) ?? fallbackRowByHash.get(node.hash) ?? 0,
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

import {
  coordGreedy,
  decrossDfs,
  decrossTwoLayer,
  graphConnect,
  layeringLongestPath,
  sugiyama,
  twolayerAgg
} from 'd3-dag';
import type { Decross, GraphNode, SugiNode } from 'd3-dag';

import { ProjectedGraph } from '../model/commitGraphTypes';
import { estimateRevisionGraphNodeHeight, estimateRevisionGraphNodeWidth } from './nodeSizing';

const DEFAULT_LAYER_GAP = 56;
const DEFAULT_NODE_GAP = 44;
const DEFAULT_DECROSS_PASSES = 4;
const FAST_DECROSS_PASSES = 1;
const FAST_LAYOUT_NODE_THRESHOLD = 800;
const FAST_LAYOUT_EDGE_THRESHOLD = 1000;
const WIDE_LAYER_DECROSS_NODE_THRESHOLD = 300;

export interface D3DagSugiyamaLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export interface D3DagSugiyamaLayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface D3DagSugiyamaEdgeRoute {
  readonly from: string;
  readonly to: string;
  readonly points: readonly D3DagSugiyamaLayoutPoint[];
}

export type D3DagSugiyamaLayoutInput = Pick<ProjectedGraph, 'nodes' | 'edges'>;

export type D3DagSugiyamaLayoutProfile = 'balanced' | 'fast-two-layer' | 'dfs-wide';

export interface D3DagSugiyamaLayoutResult {
  readonly positions: Map<string, D3DagSugiyamaLayoutPosition>;
  readonly edgeRoutes: Map<string, D3DagSugiyamaEdgeRoute>;
  readonly profile: D3DagSugiyamaLayoutProfile;
}

export function calculateD3DagSugiyamaLayout(
  projection: D3DagSugiyamaLayoutInput
): D3DagSugiyamaLayoutResult {
  const profile = selectD3DagSugiyamaLayoutProfile(projection);

  if (projection.nodes.length === 0) {
    return {
      positions: new Map(),
      edgeRoutes: new Map(),
      profile
    };
  }

  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  const links = projection.edges.map((edge) => [edge.from, edge.to] as const);
  const graph = graphConnect()
    .single(true)
    .nodeDatum((hash) => hash)([
      ...links,
      ...projection.nodes.map((node) => [node.hash, node.hash] as const)
    ]);

  const layout = sugiyama()
    .layering(layeringLongestPath())
    .decross(createRevisionGraphDecross(profile))
    .coord(coordGreedy())
    .nodeSize((node: GraphNode<string, readonly [string, string]>) => {
      const projectedNode = nodeByHash.get(node.data);
      return projectedNode
        ? [estimateRevisionGraphNodeWidth(projectedNode), estimateRevisionGraphNodeHeight(projectedNode)]
        : [160, 44];
    })
    .gap([DEFAULT_NODE_GAP, DEFAULT_LAYER_GAP]);

  layout(graph);

  const positions = new Map<string, D3DagSugiyamaLayoutPosition>();
  for (const node of graph.nodes()) {
    if (!nodeByHash.has(node.data) || node.x === undefined || node.y === undefined) {
      continue;
    }

    positions.set(node.data, {
      x: node.x,
      y: node.y
    });
  }

  const edgeRoutes = new Map<string, D3DagSugiyamaEdgeRoute>();
  for (const link of graph.links()) {
    const from = link.source.data;
    const to = link.target.data;
    if (!nodeByHash.has(from) || !nodeByHash.has(to)) {
      continue;
    }

    const points = normalizeD3DagLayoutPoints((link as { points?: unknown }).points);
    if (points.length < 2) {
      continue;
    }

    edgeRoutes.set(getD3DagEdgeRouteKey(from, to), {
      from,
      to,
      points
    });
  }

  return {
    positions,
    edgeRoutes,
    profile
  };
}

export function getD3DagEdgeRouteKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function selectD3DagSugiyamaLayoutProfile(
  projection: D3DagSugiyamaLayoutInput
): D3DagSugiyamaLayoutProfile {
  if (estimateMaxLayerNodeCount(projection) > WIDE_LAYER_DECROSS_NODE_THRESHOLD) {
    return 'dfs-wide';
  }

  if (
    projection.nodes.length >= FAST_LAYOUT_NODE_THRESHOLD ||
    projection.edges.length >= FAST_LAYOUT_EDGE_THRESHOLD
  ) {
    return 'fast-two-layer';
  }

  return 'balanced';
}

function createRevisionGraphDecross(
  profile: D3DagSugiyamaLayoutProfile
): Decross<string, readonly [string, string]> {
  const wideLayerDecross = decrossDfs();
  if (profile === 'dfs-wide') {
    return wideLayerDecross;
  }

  const twoLayerDecross = decrossTwoLayer()
    .order(twolayerAgg())
    .passes(profile === 'fast-two-layer' ? FAST_DECROSS_PASSES : DEFAULT_DECROSS_PASSES);

  return (layers: SugiNode<string, readonly [string, string]>[][]): void => {
    if (getMaxLayerNodeCount(layers) > WIDE_LAYER_DECROSS_NODE_THRESHOLD) {
      wideLayerDecross(layers);
      return;
    }

    twoLayerDecross(layers);
  };
}

function estimateMaxLayerNodeCount(projection: D3DagSugiyamaLayoutInput): number {
  if (projection.nodes.length === 0) {
    return 0;
  }

  const nodeHashes = new Set(projection.nodes.map((node) => node.hash));
  const indegreeByHash = new Map<string, number>(
    projection.nodes.map((node) => [node.hash, 0])
  );
  const childrenByHash = new Map<string, string[]>(
    projection.nodes.map((node) => [node.hash, []])
  );

  for (const edge of projection.edges) {
    if (!nodeHashes.has(edge.from) || !nodeHashes.has(edge.to)) {
      continue;
    }

    indegreeByHash.set(edge.to, (indegreeByHash.get(edge.to) ?? 0) + 1);
    childrenByHash.get(edge.from)?.push(edge.to);
  }

  const queue = projection.nodes
    .filter((node) => (indegreeByHash.get(node.hash) ?? 0) === 0)
    .map((node) => node.hash);
  const layerByHash = new Map<string, number>(queue.map((hash) => [hash, 0]));
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const hash = queue[queueIndex];
    queueIndex += 1;

    const nextLayer = (layerByHash.get(hash) ?? 0) + 1;
    for (const childHash of childrenByHash.get(hash) ?? []) {
      layerByHash.set(childHash, Math.max(layerByHash.get(childHash) ?? 0, nextLayer));
      const nextIndegree = (indegreeByHash.get(childHash) ?? 0) - 1;
      indegreeByHash.set(childHash, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(childHash);
      }
    }
  }

  const layerCounts = new Map<number, number>();
  for (const node of projection.nodes) {
    const layer = layerByHash.get(node.hash) ?? 0;
    layerCounts.set(layer, (layerCounts.get(layer) ?? 0) + 1);
  }

  return Math.max(...layerCounts.values());
}

function getMaxLayerNodeCount(
  layers: readonly (readonly SugiNode<string, readonly [string, string]>[])[]
): number {
  let maxLayerNodeCount = 0;
  for (const layer of layers) {
    maxLayerNodeCount = Math.max(maxLayerNodeCount, layer.length);
  }

  return maxLayerNodeCount;
}

function normalizeD3DagLayoutPoints(points: unknown): D3DagSugiyamaLayoutPoint[] {
  if (!Array.isArray(points)) {
    return [];
  }

  const normalized: D3DagSugiyamaLayoutPoint[] = [];
  for (const point of points) {
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }

    const [x, y] = point;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    normalized.push({ x, y });
  }

  return normalized;
}

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
const WIDE_LAYER_DECROSS_NODE_THRESHOLD = 300;

export interface D3DagSugiyamaLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export type D3DagSugiyamaLayoutInput = Pick<ProjectedGraph, 'nodes' | 'edges'>;

export function calculateD3DagSugiyamaLayout(
  projection: D3DagSugiyamaLayoutInput
): Map<string, D3DagSugiyamaLayoutPosition> {
  if (projection.nodes.length === 0) {
    return new Map();
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
    .decross(createRevisionGraphDecross())
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

  return positions;
}

function createRevisionGraphDecross(): Decross<string, readonly [string, string]> {
  const twoLayerDecross = decrossTwoLayer()
    .order(twolayerAgg())
    .passes(DEFAULT_DECROSS_PASSES);
  const wideLayerDecross = decrossDfs();

  return (layers: SugiNode<string, readonly [string, string]>[][]): void => {
    if (getMaxLayerNodeCount(layers) > WIDE_LAYER_DECROSS_NODE_THRESHOLD) {
      wideLayerDecross(layers);
      return;
    }

    twoLayerDecross(layers);
  };
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

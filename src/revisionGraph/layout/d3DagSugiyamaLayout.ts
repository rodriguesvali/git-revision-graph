import {
  coordGreedy,
  decrossTwoLayer,
  graphConnect,
  layeringLongestPath,
  sugiyama,
  twolayerAgg
} from 'd3-dag';
import type { GraphNode } from 'd3-dag';

import { ProjectedGraph } from '../model/commitGraphTypes';
import { estimateRevisionGraphNodeHeight, estimateRevisionGraphNodeWidth } from './nodeSizing';

const DEFAULT_LAYER_GAP = 56;
const DEFAULT_NODE_GAP = 44;

export interface D3DagSugiyamaLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export function calculateD3DagSugiyamaLayout(
  projection: ProjectedGraph
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
    .decross(decrossTwoLayer().order(twolayerAgg()).passes(16))
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

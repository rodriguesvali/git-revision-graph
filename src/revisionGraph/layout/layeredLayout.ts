import ELK, { ElkNode } from 'elkjs/lib/elk.bundled';

import { ProjectedGraph } from '../model/commitGraphTypes';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const elk = new ELK();

const ELK_FALLBACK_SPACING = 52;
const ELK_FALLBACK_LAYER_SPACING = 96;

export interface ProjectedGraphLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export async function layoutProjectedGraph(
  projection: ProjectedGraph
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  if (projection.nodes.length === 0) {
    return new Map();
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered',
      'org.eclipse.elk.direction': 'DOWN',
      'org.eclipse.elk.edgeRouting': 'POLYLINE',
      'org.eclipse.elk.spacing.nodeNode': '52',
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
    },
    children: projection.nodes.map((node) => ({
      id: node.hash,
      width: estimateRevisionGraphNodeWidth(node),
      height: estimateRevisionGraphNodeHeight(node)
    })),
    edges: projection.edges.map((edge, index) => ({
      id: `edge:${index}:${edge.from}:${edge.to}`,
      sources: [edge.from],
      targets: [edge.to]
    }))
  };

  const layout = await elk.layout(graph);
  const positions = new Map<string, ProjectedGraphLayoutPosition>();
  const fallbackXByHash = new Map<string, number>();
  const fallbackYByHash = new Map<string, number>();
  let nextFallbackX = 0;

  for (const [index, node] of projection.nodes.entries()) {
    fallbackXByHash.set(node.hash, nextFallbackX);
    fallbackYByHash.set(node.hash, index * ELK_FALLBACK_LAYER_SPACING);
    nextFallbackX += estimateRevisionGraphNodeWidth(node) + ELK_FALLBACK_SPACING;
  }

  for (const [index, node] of (layout.children ?? []).entries()) {
    positions.set(node.id, {
      x: node.x ?? fallbackXByHash.get(node.id) ?? index * (220 + ELK_FALLBACK_SPACING),
      y: node.y ?? fallbackYByHash.get(node.id) ?? index * ELK_FALLBACK_LAYER_SPACING
    });
  }

  return positions;
}

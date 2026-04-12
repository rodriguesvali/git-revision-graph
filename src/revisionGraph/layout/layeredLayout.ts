import ELK, { ElkNode } from 'elkjs/lib/elk.bundled';

import { ProjectedGraph } from '../model/commitGraphTypes';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const elk = new ELK();

const ELK_FALLBACK_SPACING = 52;

export async function layoutProjectedGraphHorizontally(
  projection: ProjectedGraph
): Promise<Map<string, number>> {
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
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '72'
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
  const positions = new Map<string, number>();
  const fallbackXByHash = new Map<string, number>();
  let nextFallbackX = 0;

  for (const node of projection.nodes) {
    fallbackXByHash.set(node.hash, nextFallbackX);
    nextFallbackX += estimateRevisionGraphNodeWidth(node) + ELK_FALLBACK_SPACING;
  }

  for (const [index, node] of (layout.children ?? []).entries()) {
    positions.set(node.id, node.x ?? fallbackXByHash.get(node.id) ?? index * (220 + ELK_FALLBACK_SPACING));
  }

  return positions;
}

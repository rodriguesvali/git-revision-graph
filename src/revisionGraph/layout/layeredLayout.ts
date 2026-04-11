import ELK, { ElkNode } from 'elkjs/lib/elk.bundled';

import { ProjectedGraph } from '../model/commitGraphTypes';

const elk = new ELK();

const ELK_NODE_WIDTH = 220;
const ELK_NODE_HEIGHT = 84;
const ELK_FALLBACK_SPACING = 220;

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
      'org.eclipse.elk.spacing.nodeNode': '36',
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '56'
    },
    children: projection.nodes.map((node) => ({
      id: node.hash,
      width: ELK_NODE_WIDTH,
      height: ELK_NODE_HEIGHT
    })),
    edges: projection.edges.map((edge, index) => ({
      id: `edge:${index}:${edge.from}:${edge.to}`,
      sources: [edge.from],
      targets: [edge.to]
    }))
  };

  const layout = await elk.layout(graph);
  const positions = new Map<string, number>();

  for (const [index, node] of (layout.children ?? []).entries()) {
    positions.set(node.id, node.x ?? index * ELK_FALLBACK_SPACING);
  }

  return positions;
}

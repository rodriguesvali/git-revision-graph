import { RevisionGraphEdge, RevisionGraphNode, RevisionGraphScene } from '../../revisionGraphData';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from '../layout/nodeSizing';
export {
  NODE_CONTENT_CHAR_WIDTH,
  NODE_MAX_WIDTH,
  NODE_MIN_WIDTH,
  NODE_SUMMARY_HEIGHT,
  STRUCTURAL_NODE_MAX_WIDTH,
  STRUCTURAL_NODE_MIN_WIDTH,
  NODE_WIDTH_PADDING,
  REF_LINE_DIVIDER_HEIGHT,
  REF_LINE_HEIGHT
} from '../layout/nodeSizing';

export const ROW_HEIGHT = 140;
export const ROW_VERTICAL_GAP = 48;
export const NODE_HORIZONTAL_GAP = 28;
export const NODE_PADDING_X = 26;
export const GRAPH_PADDING_TOP = 88;
export const GRAPH_PADDING_BOTTOM = 24;
export const EDGE_VERTICAL_INSET = 6;
export const VIEWPORT_PADDING_TOP = 18;
export const VIEWPORT_PADDING_RIGHT = 0;
export const VIEWPORT_PADDING_BOTTOM = 18;
export const VIEWPORT_PADDING_LEFT = 18;

export type RevisionGraphNodeLayout = {
  readonly hash: string;
  readonly lane: number;
  readonly row: number;
  readonly x: number;
  readonly width: number;
  readonly height: number;
  readonly defaultLeft: number;
  readonly defaultTop: number;
};

type EdgeLayoutNode = {
  readonly row: number;
  readonly defaultLeft: number;
  readonly defaultTop: number;
  readonly width: number;
  readonly height: number;
};

export function buildNodeLayouts(scene: RevisionGraphScene): readonly RevisionGraphNodeLayout[] {
  const dimensionsByHash = new Map(
    scene.nodes.map((node) => [
      node.hash,
      {
        width: getNodeWidth(node),
        height: getNodeHeight(node)
      }
    ] as const)
  );
  const maxHeightByRow = new Map<number, number>();

  for (const node of scene.nodes) {
    const dimensions = dimensionsByHash.get(node.hash);
    if (!dimensions) {
      continue;
    }
    maxHeightByRow.set(node.row, Math.max(maxHeightByRow.get(node.row) ?? 0, dimensions.height));
  }

  const topByRow = new Map<number, number>();
  let nextTop = GRAPH_PADDING_TOP;
  for (let row = 0; row < scene.rowCount; row += 1) {
    topByRow.set(row, nextTop);
    nextTop += (maxHeightByRow.get(row) ?? 0) + ROW_VERTICAL_GAP;
  }

  return scene.nodes.map((node) => {
    const dimensions = dimensionsByHash.get(node.hash);
    if (!dimensions) {
      throw new Error(`Missing dimensions for commit ${node.hash}`);
    }
    return {
      hash: node.hash,
      lane: node.lane,
      row: node.row,
      x: node.x,
      width: dimensions.width,
      height: dimensions.height,
      defaultLeft: NODE_PADDING_X + node.x,
      defaultTop: topByRow.get(node.row) ?? GRAPH_PADDING_TOP
    };
  });
}

export function renderNode(node: RevisionGraphNode, width: number, x: number): string {
  const layout = buildNodeLayouts({
    nodes: [node],
    edges: [],
    laneCount: Math.max(node.lane + 1, 1),
    rowCount: Math.max(node.row + 1, 1)
  })[0];
  const y = layout.defaultTop;
  const nodeClass = getNodeClass(node);
  const height = getNodeHeight(node);
  const refLines = node.refs
    .map((ref) => `<div class="ref-line kind-${escapeHtml(ref.kind)}" data-ref-id="${escapeHtml(createReferenceId(node.hash, ref.kind, ref.name))}" data-ref-name="${escapeHtml(ref.name)}" data-ref-kind="${escapeHtml(ref.kind)}">${escapeHtml(ref.name)}<span class="base-suffix"> (Base)</span></div>`)
    .join('');
  const summary = shouldRenderNodeSummary(node)
    ? `<div class="node-summary">${escapeHtml(formatNodeSummary(node))}</div>`
    : '';

  return `<div class="node ${nodeClass}" data-node-hash="${node.hash}" data-node-width="${width}" data-node-height="${height}" data-default-left="${x}" data-default-top="${y}" style="left:${x}px; top:${y}px; width:${width}px" title="${escapeHtml(formatNodeTitle(node))}">
    <button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>
    ${refLines}
    ${summary}
  </div>`;
}

export function renderEdge(
  edge: RevisionGraphEdge,
  nodeLayoutByHash: ReadonlyMap<string, EdgeLayoutNode>
): string {
  const strokeWidth = 1.8;
  const marker = 'marker-end="url(#arrowhead)"';
  const sourceNode = nodeLayoutByHash.get(edge.from);
  const targetNode = nodeLayoutByHash.get(edge.to);
  if (!sourceNode || !targetNode) {
    return '';
  }
  const path = describeEdgePath(
    sourceNode.defaultLeft + sourceNode.width / 2,
    sourceNode.defaultTop + sourceNode.height - EDGE_VERTICAL_INSET,
    targetNode.defaultLeft + targetNode.width / 2,
    targetNode.defaultTop + EDGE_VERTICAL_INSET
  );
  return `<path class="graph-edge" data-edge-from="${edge.from}" data-edge-to="${edge.to}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${marker}></path>`;
}

export function getNodeClass(node: RevisionGraphNode): string {
  if (node.refs.length === 0) {
    return 'node-structural';
  }

  const kinds = new Set(node.refs.map((ref) => ref.kind));
  if (kinds.size === 1 && kinds.has('head')) {
    return 'node-head';
  }
  if (kinds.size === 1 && kinds.has('tag')) {
    return 'node-tag';
  }
  if (kinds.size === 1 && kinds.has('remote')) {
    return 'node-remote';
  }
  if (kinds.size === 1 && kinds.has('stash')) {
    return 'node-stash';
  }
  if (kinds.size === 1 && kinds.has('branch')) {
    return 'node-branch';
  }
  return 'node-mixed';
}

export function getNodeWidth(node: RevisionGraphNode): number {
  return estimateRevisionGraphNodeWidth(node);
}

export function getNodeHeight(node: RevisionGraphNode): number {
  return estimateRevisionGraphNodeHeight(node);
}

export function formatNodeSummary(node: RevisionGraphNode): string {
  return node.hash.slice(0, 8);
}

export function shouldRenderNodeSummary(node: RevisionGraphNode): boolean {
  return node.refs.length === 0;
}

export function formatNodeTitle(node: RevisionGraphNode): string {
  const refBlock = node.refs.length > 0
    ? `Refs:\n${node.refs.map((ref) => ref.name).join('\n')}\n\n`
    : '';
  const author = node.author || 'Unknown author';
  const date = node.date || 'Unknown date';
  const subject = node.subject || 'Structural commit';
  return `${refBlock}${node.hash}\n${subject}\n${author} on ${date}`;
}

export function createNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function createReferenceId(hash: string, kind: string, name: string): string {
  return `${hash}::${kind}::${name}`;
}

export function describeEdgePath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
}

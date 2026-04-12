import { RevisionGraphEdge, RevisionGraphNode, RevisionGraphScene } from '../../revisionGraphData';

export const ROW_HEIGHT = 140;
export const NODE_MIN_WIDTH = 180;
export const NODE_MAX_WIDTH = 420;
export const NODE_CONTENT_CHAR_WIDTH = 8.2;
export const NODE_WIDTH_PADDING = 62;
export const NODE_HORIZONTAL_GAP = 28;
export const NODE_PADDING_X = 26;
export const GRAPH_PADDING_TOP = 88;
export const GRAPH_PADDING_BOTTOM = 24;
export const EDGE_VERTICAL_INSET = 6;
export const REF_LINE_HEIGHT = 31;
export const REF_LINE_DIVIDER_HEIGHT = 1;
export const NODE_SUMMARY_HEIGHT = 38;
export const VIEWPORT_PADDING_TOP = 18;
export const VIEWPORT_PADDING_RIGHT = 18;
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
};

type EdgeLayoutNode = {
  readonly row: number;
  readonly defaultLeft: number;
  readonly width: number;
  readonly height: number;
};

export function buildNodeLayouts(scene: RevisionGraphScene): readonly RevisionGraphNodeLayout[] {
  return scene.nodes.map((node) => {
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);
    return {
      hash: node.hash,
      lane: node.lane,
      row: node.row,
      x: node.x,
      width,
      height,
      defaultLeft: NODE_PADDING_X + node.x
    };
  });
}

export function renderNode(node: RevisionGraphNode, width: number, x: number): string {
  const y = GRAPH_PADDING_TOP + node.row * ROW_HEIGHT;
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
  const strokeWidth = 2.4;
  const marker = 'marker-end="url(#arrowhead)"';
  const sourceNode = nodeLayoutByHash.get(edge.from);
  const targetNode = nodeLayoutByHash.get(edge.to);
  if (!sourceNode || !targetNode) {
    return '';
  }
  const path = describeEdgePath(
    sourceNode.defaultLeft + sourceNode.width / 2,
    GRAPH_PADDING_TOP + sourceNode.row * ROW_HEIGHT + sourceNode.height - EDGE_VERTICAL_INSET,
    targetNode.defaultLeft + targetNode.width / 2,
    GRAPH_PADDING_TOP + targetNode.row * ROW_HEIGHT + EDGE_VERTICAL_INSET
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
  if (kinds.size === 1 && kinds.has('branch')) {
    return 'node-branch';
  }
  return 'node-mixed';
}

export function getNodeWidth(node: RevisionGraphNode): number {
  const longestLabelLength = node.refs.length > 0
    ? node.refs.reduce((max, ref) => Math.max(max, ref.name.length), 0)
    : Math.min(48, formatNodeSummary(node).length);
  return clampNumber(
    Math.ceil(longestLabelLength * NODE_CONTENT_CHAR_WIDTH + NODE_WIDTH_PADDING),
    NODE_MIN_WIDTH,
    NODE_MAX_WIDTH
  );
}

export function getNodeHeight(node: RevisionGraphNode): number {
  const refSectionHeight = node.refs.length > 0
    ? node.refs.length * REF_LINE_HEIGHT + Math.max(0, node.refs.length - 1) * REF_LINE_DIVIDER_HEIGHT
    : 0;
  const summaryHeight = shouldRenderNodeSummary(node) ? NODE_SUMMARY_HEIGHT : 0;
  return refSectionHeight + summaryHeight;
}

export function formatNodeSummary(node: RevisionGraphNode): string {
  const shortHash = node.hash.slice(0, 8);
  if (!node.subject) {
    return shortHash;
  }

  return `${shortHash} ${node.subject}`;
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

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  const verticalSpan = Math.max(36, (targetY - sourceY) * 0.42);
  const horizontalBias = Math.min(140, Math.max(28, Math.abs(targetX - sourceX) * 0.28));
  const controlY1 = sourceY + verticalSpan;
  const controlY2 = targetY - verticalSpan;
  const controlX1 = targetX >= sourceX ? sourceX + horizontalBias : sourceX - horizontalBias;
  const controlX2 = targetX >= sourceX ? targetX - horizontalBias : targetX + horizontalBias;
  return `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
}

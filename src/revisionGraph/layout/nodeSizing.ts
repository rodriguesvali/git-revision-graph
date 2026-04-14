export const NODE_MIN_WIDTH = 128;
export const NODE_MAX_WIDTH = 360;
export const NODE_CONTENT_CHAR_WIDTH = 7.4;
export const NODE_WIDTH_PADDING = 28;
export const REF_LINE_HEIGHT = 25;
export const REF_LINE_DIVIDER_HEIGHT = 1;
export const NODE_SUMMARY_HEIGHT = 22;
export const STRUCTURAL_NODE_MIN_WIDTH = 78;
export const STRUCTURAL_NODE_MAX_WIDTH = 220;
export const STRUCTURAL_NODE_WIDTH_PADDING = 18;

export interface RevisionGraphNodeSizingTarget {
  readonly hash: string;
  readonly refs: readonly {
    readonly name: string;
  }[];
  readonly subject: string;
}

export function estimateRevisionGraphNodeWidth(node: RevisionGraphNodeSizingTarget): number {
  const longestLabelLength = node.refs.length > 0
    ? node.refs.reduce((max, ref) => Math.max(max, ref.name.length), 0)
    : formatNodeSummaryForSizing(node).length;
  const minWidth = node.refs.length > 0 ? NODE_MIN_WIDTH : STRUCTURAL_NODE_MIN_WIDTH;
  const maxWidth = node.refs.length > 0 ? NODE_MAX_WIDTH : STRUCTURAL_NODE_MAX_WIDTH;
  const widthPadding = node.refs.length > 0 ? NODE_WIDTH_PADDING : STRUCTURAL_NODE_WIDTH_PADDING;
  return clampNumber(
    Math.ceil(longestLabelLength * NODE_CONTENT_CHAR_WIDTH + widthPadding),
    minWidth,
    maxWidth
  );
}

export function estimateRevisionGraphNodeHeight(node: RevisionGraphNodeSizingTarget): number {
  const refSectionHeight = node.refs.length > 0
    ? node.refs.length * REF_LINE_HEIGHT + Math.max(0, node.refs.length - 1) * REF_LINE_DIVIDER_HEIGHT
    : 0;
  const summaryHeight = node.refs.length === 0 ? NODE_SUMMARY_HEIGHT : 0;
  return refSectionHeight + summaryHeight;
}

function formatNodeSummaryForSizing(node: RevisionGraphNodeSizingTarget): string {
  return node.hash.slice(0, 8);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

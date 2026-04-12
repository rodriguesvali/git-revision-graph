export const NODE_MIN_WIDTH = 180;
export const NODE_MAX_WIDTH = 420;
export const NODE_CONTENT_CHAR_WIDTH = 8.2;
export const NODE_WIDTH_PADDING = 62;
export const REF_LINE_HEIGHT = 31;
export const REF_LINE_DIVIDER_HEIGHT = 1;
export const NODE_SUMMARY_HEIGHT = 38;

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
    : Math.min(48, formatNodeSummaryForSizing(node).length);
  return clampNumber(
    Math.ceil(longestLabelLength * NODE_CONTENT_CHAR_WIDTH + NODE_WIDTH_PADDING),
    NODE_MIN_WIDTH,
    NODE_MAX_WIDTH
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
  const shortHash = node.hash.slice(0, 8);
  if (!node.subject) {
    return shortHash;
  }

  return `${shortHash} ${node.subject}`;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

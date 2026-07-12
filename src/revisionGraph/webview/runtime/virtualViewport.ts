interface RevisionGraphWebviewVirtualViewportBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface RevisionGraphWebviewVirtualViewportInput {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly zoom: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly paddingLeft: number;
  readonly paddingTop: number;
  readonly layoutOffsetX: number;
  readonly layoutOffsetY: number;
  readonly overscanPx: number;
}

interface RevisionGraphWebviewVirtualNodeLayout {
  readonly hash: string;
  readonly defaultLeft: number;
  readonly defaultTop: number;
  readonly width: number;
  readonly height: number;
}

interface RevisionGraphWebviewVirtualEdge {
  readonly from: string;
  readonly to: string;
}

function createRevisionGraphWebviewVirtualViewportBounds(
  input: RevisionGraphWebviewVirtualViewportInput
): RevisionGraphWebviewVirtualViewportBounds {
  const visibleLeft = Math.max(
    0,
    (input.scrollLeft - input.paddingLeft) / input.zoom - input.layoutOffsetX
  );
  const visibleTop = Math.max(
    0,
    (input.scrollTop - input.paddingTop) / input.zoom - input.layoutOffsetY
  );
  const overscan = input.overscanPx / Math.max(input.zoom, 0.1);

  return {
    left: Math.max(0, visibleLeft - overscan),
    top: Math.max(0, visibleTop - overscan),
    right: visibleLeft + input.visibleWidth / input.zoom + overscan,
    bottom: visibleTop + input.visibleHeight / input.zoom + overscan
  };
}

function isRevisionGraphWebviewVirtualLayoutVisible(
  layout: RevisionGraphWebviewVirtualNodeLayout,
  offset: number,
  bounds: RevisionGraphWebviewVirtualViewportBounds
): boolean {
  const left = layout.defaultLeft + offset;
  const right = left + layout.width;
  const top = layout.defaultTop;
  const bottom = top + layout.height;

  return right >= bounds.left && left <= bounds.right && bottom >= bounds.top && top <= bounds.bottom;
}

function isRevisionGraphWebviewVirtualEdgeVisible(
  edge: RevisionGraphWebviewVirtualEdge,
  bounds: RevisionGraphWebviewVirtualViewportBounds,
  visibleHashes: ReadonlySet<string>,
  layoutsByHash: ReadonlyMap<string, RevisionGraphWebviewVirtualNodeLayout>,
  offsets: Readonly<Record<string, number>>
): boolean {
  if (visibleHashes.has(edge.from) || visibleHashes.has(edge.to)) {
    return true;
  }

  const fromLayout = layoutsByHash.get(edge.from);
  const toLayout = layoutsByHash.get(edge.to);
  if (!fromLayout || !toLayout) {
    return false;
  }

  const fromX = fromLayout.defaultLeft + (offsets[fromLayout.hash] ?? 0) + fromLayout.width / 2;
  const fromY = fromLayout.defaultTop + fromLayout.height / 2;
  const toX = toLayout.defaultLeft + (offsets[toLayout.hash] ?? 0) + toLayout.width / 2;
  const toY = toLayout.defaultTop + toLayout.height / 2;

  return Math.max(fromX, toX) >= bounds.left &&
    Math.min(fromX, toX) <= bounds.right &&
    Math.max(fromY, toY) >= bounds.top &&
    Math.min(fromY, toY) <= bounds.bottom;
}

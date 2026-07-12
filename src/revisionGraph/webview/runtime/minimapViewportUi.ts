interface RevisionGraphWebviewMinimapBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

interface RevisionGraphWebviewMinimapTransform {
  readonly bounds: RevisionGraphWebviewMinimapBounds;
  readonly scale: number;
  readonly mapX: (value: number) => number;
  readonly mapY: (value: number) => number;
}

interface RevisionGraphWebviewMinimapViewportInput {
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly visibleLeft: number;
  readonly visibleTop: number;
}

function syncRevisionGraphWebviewMinimapViewportUi(
  minimapViewport: SVGRectElement,
  transform: RevisionGraphWebviewMinimapTransform,
  input: RevisionGraphWebviewMinimapViewportInput
): void {
  const visibleRight = input.visibleLeft + input.visibleWidth;
  const visibleBottom = input.visibleTop + input.visibleHeight;
  const clippedLeft = clampRevisionGraphWebviewMinimapViewportValue(
    input.visibleLeft,
    transform.bounds.minX,
    transform.bounds.maxX
  );
  const clippedTop = clampRevisionGraphWebviewMinimapViewportValue(
    input.visibleTop,
    transform.bounds.minY,
    transform.bounds.maxY
  );
  const clippedRight = clampRevisionGraphWebviewMinimapViewportValue(
    visibleRight,
    transform.bounds.minX,
    transform.bounds.maxX
  );
  const clippedBottom = clampRevisionGraphWebviewMinimapViewportValue(
    visibleBottom,
    transform.bounds.minY,
    transform.bounds.maxY
  );

  minimapViewport.setAttribute('x', String(transform.mapX(clippedLeft)));
  minimapViewport.setAttribute('y', String(transform.mapY(clippedTop)));
  minimapViewport.setAttribute('width', String(Math.max(3, (clippedRight - clippedLeft) * transform.scale)));
  minimapViewport.setAttribute('height', String(Math.max(3, (clippedBottom - clippedTop) * transform.scale)));
}

function ensureRevisionGraphWebviewMinimapViewportVisibleUi(
  graphMinimap: HTMLDivElement,
  minimapViewport: SVGRectElement,
  margin = 10
): void {
  const x = Number(minimapViewport.getAttribute('x') || 0);
  const y = Number(minimapViewport.getAttribute('y') || 0);
  const width = Number(minimapViewport.getAttribute('width') || 0);
  const height = Number(minimapViewport.getAttribute('height') || 0);
  if (y < graphMinimap.scrollTop + margin) {
    graphMinimap.scrollTop = Math.max(0, y - margin);
  } else if (y + height > graphMinimap.scrollTop + graphMinimap.clientHeight - margin) {
    graphMinimap.scrollTop = Math.max(0, y + height - graphMinimap.clientHeight + margin);
  }

  if (x < graphMinimap.scrollLeft + margin) {
    graphMinimap.scrollLeft = Math.max(0, x - margin);
  } else if (x + width > graphMinimap.scrollLeft + graphMinimap.clientWidth - margin) {
    graphMinimap.scrollLeft = Math.max(0, x + width - graphMinimap.clientWidth + margin);
  }
}

function clampRevisionGraphWebviewMinimapViewportValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

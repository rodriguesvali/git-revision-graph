interface RevisionGraphWebviewCanvasSizeInput {
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly zoom: number;
}

interface RevisionGraphWebviewCanvasSize {
  readonly width: number;
  readonly height: number;
}

interface RevisionGraphWebviewCanvasSizeTarget {
  readonly style: {
    width: string;
    height: string;
  };
}

function calculateRevisionGraphWebviewCanvasSize(
  input: RevisionGraphWebviewCanvasSizeInput
): RevisionGraphWebviewCanvasSize {
  return {
    width: Math.max(input.baseWidth, input.visibleWidth / input.zoom),
    height: Math.max(input.baseHeight, input.visibleHeight / input.zoom)
  };
}

function applyRevisionGraphWebviewCanvasSize(
  target: RevisionGraphWebviewCanvasSizeTarget,
  size: RevisionGraphWebviewCanvasSize
): void {
  target.style.width = `${size.width}px`;
  target.style.height = `${size.height}px`;
}

function calculateRevisionGraphWebviewNodeLeft(
  defaultLeft: number,
  offset: number,
  nodeWidth: number,
  canvasWidth: number
): number {
  return Math.max(0, Math.min(canvasWidth - nodeWidth, defaultLeft + offset));
}

function calculateRevisionGraphWebviewNodeOffset(
  defaultLeft: number,
  offset: number,
  nodeWidth: number,
  canvasWidth: number
): number {
  return calculateRevisionGraphWebviewNodeLeft(defaultLeft, offset, nodeWidth, canvasWidth) - defaultLeft;
}

function calculateRevisionGraphWebviewNodeDragOffset(
  startOffset: number,
  startClientX: number,
  clientX: number,
  zoom: number,
  defaultLeft: number,
  nodeWidth: number,
  canvasWidth: number
): number {
  const rawOffset = startOffset + (clientX - startClientX) / zoom;
  return calculateRevisionGraphWebviewNodeOffset(defaultLeft, rawOffset, nodeWidth, canvasWidth);
}

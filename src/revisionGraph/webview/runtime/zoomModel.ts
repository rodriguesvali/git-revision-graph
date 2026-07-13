const REVISION_GRAPH_WEBVIEW_ZOOM_LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5] as const;
const REVISION_GRAPH_WEBVIEW_MINIMAP_ZOOM_LEVELS = [
  0.75, 1, 1.35, 1.75, 2.25, 3, 4, 5, 6.5, 8, 10, 12.5, 15, 18, 22, 26, 30
] as const;

interface RevisionGraphWebviewZoomCapabilities {
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly canResetZoom: boolean;
}

function getNextRevisionGraphWebviewZoomLevel(
  levels: readonly number[],
  currentZoom: number
): number | undefined {
  return levels.find((value) => value > currentZoom);
}

function getPreviousRevisionGraphWebviewZoomLevel(
  levels: readonly number[],
  currentZoom: number
): number | undefined {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const level = levels[index];
    if (level !== undefined && level < currentZoom) {
      return level;
    }
  }
  return undefined;
}

function getRevisionGraphWebviewZoomCapabilities(
  levels: readonly number[],
  currentZoom: number,
  resetZoom = 1
): RevisionGraphWebviewZoomCapabilities {
  return {
    canZoomIn: getNextRevisionGraphWebviewZoomLevel(levels, currentZoom) !== undefined,
    canZoomOut: getPreviousRevisionGraphWebviewZoomLevel(levels, currentZoom) !== undefined,
    canResetZoom: currentZoom !== resetZoom
  };
}

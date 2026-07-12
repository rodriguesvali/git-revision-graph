interface RevisionGraphWebviewEdgeMarkupLayout {
  readonly defaultLeft: number;
  readonly defaultTop: number;
  readonly width: number;
  readonly height: number;
}

interface RevisionGraphWebviewEdgeMarkupEdge {
  readonly from: string;
  readonly to: string;
  readonly route?: readonly unknown[];
}

interface RevisionGraphWebviewEdgeMarkupPoint {
  readonly x: number;
  readonly y: number;
}

interface RevisionGraphWebviewEdgeMarkupAnchors {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
}

function renderRevisionGraphWebviewEdgeMarkup(
  edge: RevisionGraphWebviewEdgeMarkupEdge,
  layoutsByHash: ReadonlyMap<string, RevisionGraphWebviewEdgeMarkupLayout>,
  verticalInset: number
): string {
  const childLayout = layoutsByHash.get(edge.from);
  const parentLayout = layoutsByHash.get(edge.to);
  if (!childLayout || !parentLayout) {
    return '';
  }

  const anchors = getRevisionGraphWebviewEdgeMarkupAnchors(parentLayout, childLayout, verticalInset);
  const path = describeRevisionGraphWebviewRoutedEdgePath(edge, parentLayout, childLayout, verticalInset) ??
    describeRevisionGraphWebviewFallbackEdgePath(
      anchors.sourceX,
      anchors.sourceY,
      anchors.targetX,
      anchors.targetY
    );

  return `<path class="graph-edge" data-edge-from="${edge.from}" data-edge-to="${edge.to}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>`;
}

function getRevisionGraphWebviewEdgeMarkupAnchors(
  sourceLayout: RevisionGraphWebviewEdgeMarkupLayout,
  targetLayout: RevisionGraphWebviewEdgeMarkupLayout,
  verticalInset: number
): RevisionGraphWebviewEdgeMarkupAnchors {
  const sourceCenterY = sourceLayout.defaultTop + sourceLayout.height / 2;
  const targetCenterY = targetLayout.defaultTop + targetLayout.height / 2;
  const connectsDownward = sourceCenterY <= targetCenterY;

  return {
    sourceX: sourceLayout.defaultLeft + sourceLayout.width / 2,
    sourceY: connectsDownward
      ? sourceLayout.defaultTop + sourceLayout.height - verticalInset
      : sourceLayout.defaultTop + verticalInset,
    targetX: targetLayout.defaultLeft + targetLayout.width / 2,
    targetY: connectsDownward
      ? targetLayout.defaultTop + verticalInset
      : targetLayout.defaultTop + targetLayout.height - verticalInset
  };
}

function describeRevisionGraphWebviewRoutedEdgePath(
  edge: RevisionGraphWebviewEdgeMarkupEdge,
  sourceLayout: RevisionGraphWebviewEdgeMarkupLayout,
  targetLayout: RevisionGraphWebviewEdgeMarkupLayout,
  verticalInset: number
): string | undefined {
  const route = getRevisionGraphWebviewRenderableEdgeRoute(edge);
  if (!route) {
    return undefined;
  }

  const anchors = getRevisionGraphWebviewEdgeMarkupAnchors(sourceLayout, targetLayout, verticalInset);
  const rawSource = route[0];
  const rawTarget = route[route.length - 1];
  const sourceCenter = getRevisionGraphWebviewEdgeMarkupCenter(sourceLayout);
  const targetCenter = getRevisionGraphWebviewEdgeMarkupCenter(targetLayout);
  const sourceDelta = { x: sourceCenter.x - rawSource.x, y: sourceCenter.y - rawSource.y };
  const targetDelta = { x: targetCenter.x - rawTarget.x, y: targetCenter.y - rawTarget.y };
  const rawDeltaY = rawTarget.y - rawSource.y;
  const fallbackSpan = Math.max(route.length - 1, 1);
  const pathPoints = [
    { x: anchors.sourceX, y: anchors.sourceY },
    ...route.slice(1, -1).map((point, index) => {
      const progress = Number.isFinite(rawDeltaY) && Math.abs(rawDeltaY) > 0.001
        ? clampRevisionGraphWebviewEdgeMarkupNumber((point.y - rawSource.y) / rawDeltaY, 0, 1)
        : (index + 1) / fallbackSpan;
      return {
        x: point.x + sourceDelta.x + (targetDelta.x - sourceDelta.x) * progress,
        y: point.y + sourceDelta.y + (targetDelta.y - sourceDelta.y) * progress
      };
    }),
    { x: anchors.targetX, y: anchors.targetY }
  ];

  return describeRevisionGraphWebviewPolylinePath(pathPoints);
}

function describeRevisionGraphWebviewFallbackEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const deltaX = Math.abs(sourceX - targetX);
  const deltaY = Math.abs(sourceY - targetY);
  if (deltaX < 12 || deltaY < 24) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  const direction = targetY >= sourceY ? 1 : -1;
  const approachLength = Math.min(Math.max(deltaY * 0.38, 36), 128);
  const bendY = targetY - direction * approachLength;
  return `M ${sourceX} ${sourceY} L ${targetX} ${bendY} L ${targetX} ${targetY}`;
}

function getRevisionGraphWebviewRenderableEdgeRoute(
  edge: RevisionGraphWebviewEdgeMarkupEdge
): RevisionGraphWebviewEdgeMarkupPoint[] | undefined {
  const route = edge.route;
  if (!Array.isArray(route) || route.length <= 2 || !route.every(isRevisionGraphWebviewFiniteEdgePoint)) {
    return undefined;
  }

  return [...route].reverse();
}

function isRevisionGraphWebviewFiniteEdgePoint(
  point: unknown
): point is RevisionGraphWebviewEdgeMarkupPoint {
  return typeof point === 'object' && point !== null &&
    typeof (point as { x?: unknown }).x === 'number' &&
    Number.isFinite((point as { x: number }).x) &&
    typeof (point as { y?: unknown }).y === 'number' &&
    Number.isFinite((point as { y: number }).y);
}

function getRevisionGraphWebviewEdgeMarkupCenter(
  layout: RevisionGraphWebviewEdgeMarkupLayout
): RevisionGraphWebviewEdgeMarkupPoint {
  return {
    x: layout.defaultLeft + layout.width / 2,
    y: layout.defaultTop + layout.height / 2
  };
}

function describeRevisionGraphWebviewPolylinePath(
  points: readonly RevisionGraphWebviewEdgeMarkupPoint[]
): string {
  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${formatRevisionGraphWebviewEdgeMarkupNumber(point.x)} ${formatRevisionGraphWebviewEdgeMarkupNumber(point.y)}`
    )
    .join(' ');
}

function formatRevisionGraphWebviewEdgeMarkupNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

function clampRevisionGraphWebviewEdgeMarkupNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

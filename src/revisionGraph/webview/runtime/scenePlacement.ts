interface RevisionGraphWebviewScenePlacementBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

interface RevisionGraphWebviewScenePlacementAnchor {
  readonly centerX: number;
  readonly centerY: number;
}

interface RevisionGraphWebviewScenePlacementInput {
  readonly bounds: RevisionGraphWebviewScenePlacementBounds;
  readonly headAnchor: RevisionGraphWebviewScenePlacementAnchor | null;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
}

interface RevisionGraphWebviewScenePlacement {
  readonly offsetX: number;
  readonly offsetY: number;
}

function calculateRevisionGraphWebviewScenePlacement(
  input: RevisionGraphWebviewScenePlacementInput
): RevisionGraphWebviewScenePlacement {
  const preferredCenterX = input.headAnchor
    ? input.headAnchor.centerX
    : (input.bounds.minX + input.bounds.maxX) / 2;
  const preferredCenterY = input.headAnchor
    ? input.headAnchor.centerY
    : (input.bounds.minY + input.bounds.maxY) / 2;
  const maxOffsetX = Math.max(0, input.canvasWidth - input.baseCanvasWidth);
  const maxOffsetY = Math.max(0, input.canvasHeight - input.baseCanvasHeight);

  return {
    offsetX: clampRevisionGraphWebviewScenePlacement(
      preferredCenterX ? input.canvasWidth / 2 - preferredCenterX : 0,
      0,
      maxOffsetX
    ),
    offsetY: clampRevisionGraphWebviewScenePlacement(
      preferredCenterY ? input.canvasHeight / 2 - preferredCenterY : 0,
      0,
      maxOffsetY
    )
  };
}

function applyRevisionGraphWebviewScenePlacement(
  target: { readonly style: { transform: string } },
  placement: RevisionGraphWebviewScenePlacement
): void {
  target.style.transform = `translate(${placement.offsetX}px, ${placement.offsetY}px)`;
}

function clampRevisionGraphWebviewScenePlacement(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

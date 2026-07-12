interface RevisionGraphWebviewViewportScrollPositionInput {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly paddingLeft: number;
  readonly paddingTop: number;
}

interface RevisionGraphWebviewViewportScrollPosition {
  readonly scrollLeft: number;
  readonly scrollTop: number;
}

interface RevisionGraphWebviewViewportSceneCenterInput {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly zoom: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly paddingLeft: number;
  readonly paddingTop: number;
  readonly layoutOffsetX: number;
  readonly layoutOffsetY: number;
}

interface RevisionGraphWebviewViewportSceneCenter {
  readonly sceneCenterX: number;
  readonly sceneCenterY: number;
}

function calculateRevisionGraphWebviewViewportScrollPosition(
  input: RevisionGraphWebviewViewportScrollPositionInput
): RevisionGraphWebviewViewportScrollPosition {
  return {
    scrollLeft: Math.max(0, input.paddingLeft + input.centerX * input.zoom - input.visibleWidth / 2),
    scrollTop: Math.max(0, input.paddingTop + input.centerY * input.zoom - input.visibleHeight / 2)
  };
}

function captureRevisionGraphWebviewViewportSceneCenter(
  input: RevisionGraphWebviewViewportSceneCenterInput
): RevisionGraphWebviewViewportSceneCenter {
  return {
    sceneCenterX: ((input.scrollLeft - input.paddingLeft + input.visibleWidth / 2) / input.zoom) - input.layoutOffsetX,
    sceneCenterY: ((input.scrollTop - input.paddingTop + input.visibleHeight / 2) / input.zoom) - input.layoutOffsetY
  };
}

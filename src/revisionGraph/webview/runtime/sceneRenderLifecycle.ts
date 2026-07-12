interface RevisionGraphWebviewSceneRenderLifecycleInput {
  readonly isReady: boolean;
  readonly shouldPrecenterViewport: boolean;
  readonly prepareGeometry: () => void;
  readonly clearScene: () => void;
  readonly refreshGraphCaches: () => void;
  readonly syncCanvasAndPlacement: () => void;
  readonly prepareIndexes: () => void;
  readonly precenterViewport: () => void;
  readonly renderVirtualScene: () => void;
  readonly bindSceneEventHandlers: () => void;
}

function runRevisionGraphWebviewSceneRenderLifecycle(
  input: RevisionGraphWebviewSceneRenderLifecycleInput
): void {
  input.prepareGeometry();
  if (!input.isReady) {
    input.clearScene();
    input.refreshGraphCaches();
    input.syncCanvasAndPlacement();
    return;
  }

  input.prepareIndexes();
  if (input.shouldPrecenterViewport) {
    input.precenterViewport();
  }
  input.renderVirtualScene();
  input.refreshGraphCaches();
  input.bindSceneEventHandlers();
  input.syncCanvasAndPlacement();
}

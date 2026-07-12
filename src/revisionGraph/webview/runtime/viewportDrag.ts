interface RevisionGraphWebviewViewportDragState {
  readonly startX: number;
  readonly startY: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly moved: boolean;
}

interface RevisionGraphWebviewViewportDragUpdate {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly moved: boolean;
  readonly shouldSuppressNodeClick: boolean;
}

function createRevisionGraphWebviewViewportDragState(
  startX: number,
  startY: number,
  scrollLeft: number,
  scrollTop: number
): RevisionGraphWebviewViewportDragState {
  return { startX, startY, scrollLeft, scrollTop, moved: false };
}

function calculateRevisionGraphWebviewViewportDrag(
  state: RevisionGraphWebviewViewportDragState,
  clientX: number,
  clientY: number,
  movementThreshold = 3
): RevisionGraphWebviewViewportDragUpdate {
  const deltaX = clientX - state.startX;
  const deltaY = clientY - state.startY;
  const moved = state.moved || Math.abs(deltaX) > movementThreshold || Math.abs(deltaY) > movementThreshold;
  return {
    scrollLeft: state.scrollLeft - deltaX,
    scrollTop: state.scrollTop - deltaY,
    moved,
    shouldSuppressNodeClick: moved && !state.moved
  };
}

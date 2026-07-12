interface RevisionGraphWebviewVirtualSceneSchedulerInput {
  readonly force: boolean;
  readonly pendingFrame: number;
  readonly setSceneKey: (sceneKey: string) => void;
  readonly setPendingFrame: (frame: number) => void;
  readonly requestFrame: (callback: () => void) => number;
  readonly render: () => void;
}

function scheduleRevisionGraphWebviewVirtualSceneRender(
  input: RevisionGraphWebviewVirtualSceneSchedulerInput
): boolean {
  if (input.force) {
    input.setSceneKey('');
  }
  if (input.pendingFrame) {
    return false;
  }

  const frame = input.requestFrame(() => {
    input.setPendingFrame(0);
    input.render();
  });
  input.setPendingFrame(frame);
  return true;
}

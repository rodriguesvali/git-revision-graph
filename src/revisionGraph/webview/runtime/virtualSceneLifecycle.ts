interface RevisionGraphWebviewVirtualSceneRenderDecision {
  readonly shouldCommit: boolean;
  readonly nextSceneKey: string;
}

interface RevisionGraphWebviewVirtualScenePostCommitInput {
  readonly sceneKey: string;
  readonly setSceneKey: (sceneKey: string) => void;
  readonly refreshGraphCaches: () => void;
  readonly applyNodeLayout: () => void;
  readonly syncSelection: () => void;
  readonly syncSearchHighlights: () => void;
}

function createRevisionGraphWebviewVirtualSceneRenderDecision(
  force: boolean,
  previousSceneKey: string,
  nextSceneKey: string
): RevisionGraphWebviewVirtualSceneRenderDecision {
  return {
    shouldCommit: force || nextSceneKey !== previousSceneKey,
    nextSceneKey
  };
}

function completeRevisionGraphWebviewVirtualSceneCommit(
  input: RevisionGraphWebviewVirtualScenePostCommitInput
): void {
  input.setSceneKey(input.sceneKey);
  input.refreshGraphCaches();
  input.applyNodeLayout();
  input.syncSelection();
  input.syncSearchHighlights();
}

function resetRevisionGraphWebviewVirtualSceneKey(
  setSceneKey: (sceneKey: string) => void
): void {
  setSceneKey('');
}

function readRevisionGraphWebviewPersistentState(
  api: RevisionGraphRuntimeVsCodeApi
): RevisionGraphWebviewPersistentState {
  const rawState: unknown = api.getState();
  if (!isRevisionGraphWebviewStateRecord(rawState)) {
    return {};
  }

  const nodeOffsets = normalizeRevisionGraphNodeOffsets(rawState.nodeOffsets);
  return {
    ...rawState,
    ...(typeof rawState.showMinimap === 'boolean' ? { showMinimap: rawState.showMinimap } : {}),
    ...(typeof rawState.sceneLayoutKey === 'string' ? { sceneLayoutKey: rawState.sceneLayoutKey } : {}),
    ...(nodeOffsets ? { nodeOffsets } : {})
  };
}

function restoreRevisionGraphNodeOffsets(
  api: RevisionGraphRuntimeVsCodeApi,
  sceneLayoutKey: string
): Record<string, number> {
  const state = readRevisionGraphWebviewPersistentState(api);
  if (state.sceneLayoutKey !== sceneLayoutKey || !state.nodeOffsets) {
    return {};
  }
  return { ...state.nodeOffsets };
}

function persistRevisionGraphMinimapPreference(
  api: RevisionGraphRuntimeVsCodeApi,
  showMinimap: boolean
): void {
  api.setState({
    ...readRevisionGraphWebviewPersistentState(api),
    showMinimap
  });
}

function persistRevisionGraphNodeOffsets(
  api: RevisionGraphRuntimeVsCodeApi,
  sceneLayoutKey: string,
  nodeOffsets: Record<string, number>
): void {
  api.setState({
    ...readRevisionGraphWebviewPersistentState(api),
    sceneLayoutKey,
    nodeOffsets: normalizeRevisionGraphNodeOffsets(nodeOffsets) ?? {}
  });
}

function isRevisionGraphWebviewStateRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRevisionGraphNodeOffsets(value: unknown): Record<string, number> | undefined {
  if (!isRevisionGraphWebviewStateRecord(value)) {
    return undefined;
  }

  const nodeOffsets: Record<string, number> = {};
  for (const [hash, offset] of Object.entries(value)) {
    if (typeof offset === 'number' && Number.isFinite(offset)) {
      nodeOffsets[hash] = offset;
    }
  }
  return nodeOffsets;
}

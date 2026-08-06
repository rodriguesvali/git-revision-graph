function buildWebviewLoadTraceDetail(
  message: RevisionGraphWebviewTracedHostMessage,
  deliveryMs: number | null,
  extraDetail: string
) {
  const details = [
    'message=' + message.type
  ];
  if (deliveryMs !== null) {
    details.push('deliveryMs=' + Math.round(deliveryMs));
  }
  if (message.type !== 'update-repository-status') {
    const payload = message.state;
    if (payload.scene) {
      details.push('nodes=' + ((payload.scene.nodes && payload.scene.nodes.length) || 0));
      details.push('edges=' + ((payload.scene.edges && payload.scene.edges.length) || 0));
    }
    if (payload.references) {
      details.push('refs=' + payload.references.length);
    }
  }
  if (extraDetail) {
    details.push(extraDetail);
  }
  return details.join('; ');
}

function applyRepositoryStatusUpdate(status: RevisionGraphWebviewRepositoryStatusUpdate) {
  if (
    !currentState ||
    currentState.viewMode !== 'ready' ||
    currentState.repositoryPath !== status.repositoryPath ||
    sceneLayoutKey !== status.sceneLayoutKey
  ) {
    return;
  }

  currentState = {
    ...currentState,
    currentHeadName: status.currentHeadName,
    currentHeadUpstreamName: status.currentHeadUpstreamName,
    publishedLocalBranchNames: status.publishedLocalBranchNames,
    isWorkspaceDirty: status.isWorkspaceDirty,
    hasMergeConflicts: status.hasMergeConflicts,
    hasConflictedMerge: status.hasConflictedMerge,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
  currentHeadName = status.currentHeadName ?? null;
  currentHeadUpstreamName = status.currentHeadUpstreamName ?? null;
  publishedLocalBranchNames = new Set(status.publishedLocalBranchNames);
  isWorkspaceDirty = status.isWorkspaceDirty;
  hasMergeConflicts = status.hasMergeConflicts;
  hasConflictedMerge = status.hasConflictedMerge;
  syncToolbarActions();
  hideLoading();
  hideStatus();
}

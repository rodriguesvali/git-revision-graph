function isRevisionGraphWebviewHostState(value: unknown): value is RevisionGraphWebviewHostState {
  if (!isRevisionGraphWebviewRecord(value)) {
    return false;
  }

  return (value.viewMode === 'ready' || value.viewMode === 'empty')
    && typeof value.hasRepositories === 'boolean'
    && isOptionalString(value.repositoryPath)
    && isOptionalString(value.currentHeadName)
    && isOptionalString(value.currentHeadUpstreamName)
    && isStringArray(value.publishedLocalBranchNames)
    && typeof value.isWorkspaceDirty === 'boolean'
    && typeof value.hasMergeConflicts === 'boolean'
    && typeof value.hasConflictedMerge === 'boolean'
    && isRevisionGraphWebviewRecord(value.projectionOptions)
    && isStringArray(value.mergeBlockedTargets)
    && isStringRecord(value.primaryAncestorNextByHash)
    && isRevisionGraphWebviewHostScene(value.scene)
    && isRecordArray(value.nodeLayouts)
    && isRevisionGraphWebviewHostReferenceArray(value.references)
    && (value.flowGovernance === undefined || isRevisionGraphWebviewRecord(value.flowGovernance))
    && typeof value.sceneLayoutKey === 'string'
    && typeof value.baseCanvasWidth === 'number' && Number.isFinite(value.baseCanvasWidth)
    && typeof value.baseCanvasHeight === 'number' && Number.isFinite(value.baseCanvasHeight)
    && isOptionalString(value.emptyMessage)
    && typeof value.loading === 'boolean'
    && isOptionalString(value.loadingLabel)
    && isOptionalString(value.errorMessage);
}

function isRevisionGraphWebviewHostScene(value: unknown): value is RevisionGraphWebviewHostScene {
  return isRevisionGraphWebviewRecord(value)
    && isRecordArray(value.nodes)
    && isRecordArray(value.edges);
}

function isRevisionGraphWebviewHostReferenceArray(
  value: unknown
): value is readonly RevisionGraphWebviewHostReference[] {
  return Array.isArray(value) && value.every(isRevisionGraphWebviewHostReference);
}

function isRevisionGraphWebviewHostReference(value: unknown): value is RevisionGraphWebviewHostReference {
  return isRevisionGraphWebviewRecord(value)
    && typeof value.id === 'string'
    && typeof value.hash === 'string'
    && typeof value.name === 'string'
    && isRevisionGraphWebviewRefKind(value.kind);
}

function isRevisionGraphWebviewRefKind(value: unknown): value is RevisionGraphWebviewRefKind {
  return value === 'head' || value === 'branch' || value === 'remote' || value === 'tag' || value === 'stash';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecordArray(value: unknown): value is readonly Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRevisionGraphWebviewRecord);
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRevisionGraphWebviewRecord(value)
    && Object.values(value).every((item) => typeof item === 'string');
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isRevisionGraphWebviewRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

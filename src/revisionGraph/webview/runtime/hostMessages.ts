function isRevisionGraphWebviewHostMessage(value: unknown): value is RevisionGraphWebviewHostMessage {
  if (!isRevisionGraphWebviewRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  return value.type === 'set-flow-ai-text-result'
    ? isRevisionGraphWebviewFlowAiTextResultMessage(value)
    : isRevisionGraphWebviewStateHostMessage(value) || isRevisionGraphWebviewActionHostMessage(value);
}

function isRevisionGraphWebviewStateHostMessage(value: Record<string, unknown>): boolean {
  switch (value.type) {
    case 'init-state':
    case 'update-state':
      return isRevisionGraphWebviewHostState(value.state)
        && (value.trace === undefined || isRevisionGraphWebviewRecord(value.trace));
    case 'update-repository-status':
      return isRevisionGraphWebviewRepositoryStatusUpdate(value.status)
        && (value.trace === undefined || isRevisionGraphWebviewRecord(value.trace));
    case 'set-remote-tag-state':
      return typeof value.tagName === 'string' && typeof value.state === 'string';
    case 'set-commit-short-stat':
      return typeof value.commitHash === 'string'
        && (value.shortStat === null || isRevisionGraphWebviewRecord(value.shortStat));
    default:
      return false;
  }
}

function isRevisionGraphWebviewRepositoryStatusUpdate(
  value: unknown
): value is RevisionGraphWebviewRepositoryStatusUpdate {
  return isRevisionGraphWebviewRecord(value)
    && typeof value.repositoryPath === 'string'
    && typeof value.sceneLayoutKey === 'string'
    && isOptionalString(value.currentHeadName)
    && isOptionalString(value.currentHeadUpstreamName)
    && isStringArray(value.publishedLocalBranchNames)
    && typeof value.isWorkspaceDirty === 'boolean'
    && typeof value.hasMergeConflicts === 'boolean'
    && typeof value.hasConflictedMerge === 'boolean';
}

function isRevisionGraphWebviewActionHostMessage(value: Record<string, unknown>): boolean {
  switch (value.type) {
    case 'show-flow-branch-form':
      return isRevisionGraphWebviewFlowBranchFormMessage(value);
    case 'set-loading':
      return typeof value.label === 'string'
        && (value.mode === undefined || value.mode === 'blocking' || value.mode === 'subtle');
    case 'set-error':
      return typeof value.message === 'string';
    default:
      return false;
  }
}

function isRevisionGraphWebviewFlowAiTextResultMessage(value: Record<string, unknown>): boolean {
  return typeof value.requestId === 'number'
    && Number.isFinite(value.requestId)
    && value.requestId >= 0
    && isRevisionGraphWebviewFlowAiTextSurface(value.surface)
    && (value.field === 'title' || value.field === 'description')
    && !(value.surface !== 'pull-request' && value.field !== 'description')
    && (value.status === 'ready' || value.status === 'unavailable')
    && (value.status === 'ready'
      ? typeof value.content === 'string'
      : value.content === undefined);
}

function isRevisionGraphWebviewFlowAiTextSurface(value: unknown): boolean {
  return value === 'pull-request' || value === 'release' || value === 'feature'
    || value === 'task' || value === 'bug' || value === 'hotfix';
}

function isRevisionGraphWebviewFlowBranchFormMessage(value: Record<string, unknown>): boolean {
  return typeof value.sourceRefName === 'string'
    && (value.branchKind === 'release'
      || value.branchKind === 'package'
      || value.branchKind === 'feature'
      || value.branchKind === 'task'
      || value.branchKind === 'bug'
      || value.branchKind === 'hotfix');
}

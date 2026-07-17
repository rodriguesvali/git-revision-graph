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
    case 'set-remote-tag-state':
      return typeof value.tagName === 'string' && typeof value.state === 'string';
    case 'set-commit-short-stat':
      return typeof value.commitHash === 'string'
        && (value.shortStat === null || isRevisionGraphWebviewRecord(value.shortStat));
    default:
      return false;
  }
}

function isRevisionGraphWebviewActionHostMessage(value: Record<string, unknown>): boolean {
  switch (value.type) {
    case 'show-flow-pr-context':
      return isRevisionGraphWebviewFlowPullRequestContextMessage(value);
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
    && (value.surface === 'pull-request' || value.surface === 'release')
    && (value.field === 'title' || value.field === 'description')
    && !(value.surface === 'release' && value.field !== 'description')
    && (value.status === 'ready' || value.status === 'unavailable')
    && (value.status === 'ready'
      ? typeof value.content === 'string'
      : value.content === undefined);
}

function isRevisionGraphWebviewFlowPullRequestContextMessage(value: Record<string, unknown>): boolean {
  return typeof value.sourceRefName === 'string'
    && typeof value.targetRefName === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string';
}

function isRevisionGraphWebviewFlowBranchFormMessage(value: Record<string, unknown>): boolean {
  return typeof value.sourceRefName === 'string'
    && (value.branchKind === 'release'
      || value.branchKind === 'feature'
      || value.branchKind === 'task'
      || value.branchKind === 'bug'
      || value.branchKind === 'hotfix');
}

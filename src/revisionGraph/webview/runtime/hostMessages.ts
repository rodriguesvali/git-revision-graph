function isRevisionGraphWebviewHostMessage(value: unknown): value is RevisionGraphWebviewHostMessage {
  if (!isRevisionGraphWebviewRecord(value) || typeof value.type !== 'string') {
    return false;
  }

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

function isBisectStateMessage(value: Record<string, unknown>): boolean {
  if (typeof value.repositoryPath !== 'string' || typeof value.reveal !== 'boolean') return false;
  if (value.state === null) return true;
  const state = value.state;
  if (!isRevisionGraphWebviewRecord(state)) return false;
  return state.repositoryPath === value.repositoryPath && isBisectViewIdentity(state) && isBisectViewData(state);
}

function isBisectViewIdentity(state: Record<string, unknown>): boolean {
  return typeof state.id === 'string' && Number.isSafeInteger(state.version) && (state.version as number) > 0
    && typeof state.repositoryPath === 'string'
    && ['preparing', 'testing', 'found', 'inconclusive', 'outside'].includes(String(state.status))
    && isBisectViewCommit(state.selected) && isBisectViewCommit(state.original)
    && (state.current === undefined || isBisectViewCommit(state.current))
    && isOptionalString(state.branch) && typeof state.swapped === 'boolean'
;
}

function isBisectViewData(state: Record<string, unknown>): boolean {
  return typeof state.busy === 'boolean' && typeof state.mergeBaseCheck === 'boolean'
    && isOptionalString(state.error)
    && (state.stepsRemaining === undefined || (Number.isSafeInteger(state.stepsRemaining) && (state.stepsRemaining as number) >= 0))
    && Array.isArray(state.candidates) && state.candidates.every(isBisectViewCommit)
    && Array.isArray(state.history) && state.history.every((entry) => isRevisionGraphWebviewRecord(entry)
      && isBisectViewCommit(entry.commit) && ['good', 'bad', 'skip'].includes(String(entry.answer)));
}

function isBisectViewCommit(value: unknown): boolean {
  return isRevisionGraphWebviewRecord(value) && typeof value.hash === 'string'
    && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value.hash) && typeof value.subject === 'string';
}


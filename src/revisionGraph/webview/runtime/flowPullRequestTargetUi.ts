interface RevisionGraphWebviewFlowPullRequestTargetOption {
  readonly targetRefName: string;
  readonly status?: string;
}

function initializeRevisionGraphWebviewFlowPullRequestTargetSelect(
  select: HTMLSelectElement,
  targets: readonly RevisionGraphWebviewFlowPullRequestTargetOption[]
): void {
  select.textContent = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = targets.length > 0 ? 'Select a target branch...' : 'No target branches available';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  for (const candidate of targets) {
    const option = document.createElement('option');
    option.value = candidate.targetRefName;
    option.textContent = candidate.status && candidate.status !== 'ahead'
      ? `${candidate.targetRefName} — ${describeRevisionGraphWebviewFlowPullRequestTargetStatus(candidate.status)}`
      : `${candidate.targetRefName} — Ready`;
    select.appendChild(option);
  }
}

function describeRevisionGraphWebviewFlowPullRequestTargetStatus(status: string): string {
  if (status === 'not-ahead') return 'No commits ahead';
  if (status === 'production-out-of-sync') return 'Synchronization required';
  if (status === 'production-not-ancestor') return 'Equalization required';
  return 'Could not verify';
}

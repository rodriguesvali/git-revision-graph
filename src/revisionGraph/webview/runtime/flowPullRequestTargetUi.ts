interface RevisionGraphWebviewFlowPullRequestTargetOption {
  readonly targetRefName: string;
}

function initializeRevisionGraphWebviewFlowPullRequestTargetSelect(
  select: HTMLSelectElement,
  targets: readonly RevisionGraphWebviewFlowPullRequestTargetOption[]
): void {
  select.textContent = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = targets.length > 0 ? 'Select a release...' : 'No release branches available';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  for (const candidate of targets) {
    const option = document.createElement('option');
    option.value = candidate.targetRefName;
    option.textContent = candidate.targetRefName;
    select.appendChild(option);
  }
}

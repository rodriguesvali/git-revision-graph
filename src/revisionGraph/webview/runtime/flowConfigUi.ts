interface RevisionGraphFlowConfigUiState {
  readonly flowGovernance?: Record<string, unknown>;
  readonly repositoryPath?: string;
  readonly loading?: boolean;
}

function syncRevisionGraphWebviewFlowConfigUi(
  state: RevisionGraphFlowConfigUiState,
  postMessage: (message: RevisionGraphProtocol.MessageOf<'open-flow-config'>) => void
): void {
  const status = document.getElementById('flowConfigStatus');
  const details = document.getElementById('flowConfigDetails');
  const button = document.getElementById('flowConfigOpenButton') as HTMLButtonElement | null;
  if (!status || !details || !button) return;
  const flow = state.flowGovernance;
  status.textContent = '';
  details.textContent = '';
  button.hidden = true;
  button.onclick = null;
  if (!flow) return;
  const invalid = flow.configSource === 'invalid';
  const hasConfig = flow.configSource === 'repository' || invalid;
  status.textContent = invalid ? 'Configuration error — Flow Governance is unavailable.'
    : flow.enabled === true ? 'Enabled for this repository.'
    : hasConfig ? 'Disabled in the repository configuration.'
    : 'No repository configuration. Enable Flow Governance to create it.';
  const diagnostics = Array.isArray(flow.diagnostics) ? flow.diagnostics : [];
  details.textContent = diagnostics
    .filter((item): item is { code: string; message: string } => !!item
      && typeof item === 'object' && item.code === 'invalid-config' && typeof item.message === 'string')
    .map((item) => item.message).join('\n');
  if (invalid) details.textContent += '\nOpen the configuration, correct the reported issue, then reload the graph.';
  button.hidden = !hasConfig;
  button.disabled = state.loading === true || flow.saving === true || !state.repositoryPath;
  const repositoryPath = state.repositoryPath;
  button.onclick = () => {
    if (!button.disabled && repositoryPath) postMessage({ type: 'open-flow-config', repositoryPath });
  };
}

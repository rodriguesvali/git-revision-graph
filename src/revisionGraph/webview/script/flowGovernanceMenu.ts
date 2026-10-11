function appendFlowGovernanceActions(
  flowBranch: RevisionGraphWebviewLegacyFlowReference | null,
  target: RevisionGraphWebviewTarget
) {
  if (!flowBranch) {
    return;
  }
  const entries: RevisionGraphWebviewMenuEntry[] = [];
  if (flowBranch.kind === 'main') {
    entries.push(
      { label: 'Start New Release', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'release')) },
      { label: 'Start New Feature', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'feature')) },
      { label: 'Start New Package', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'package')) },
      { label: 'Start New Hot Fix', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'hotfix')) }
    );
  } else if (flowBranch.kind === 'feature') {
    entries.push(
      { label: 'Start New Package', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'package')) },
      { label: 'Start New Task', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'task')) },
      { label: 'Start New Bug', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'bug')) },
      { label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) }
    );
  } else if (flowBranch.kind === 'release') {
    entries.push({ label: 'Start New Feature', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'feature')) }, { label: 'Start New Package', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'package')) }, { label: 'Start New Task', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'task')) }, { label: 'Start New Bug', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'bug')) });
    entries.push({ label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) });
  } else if (flowBranch.kind === 'package') {
    entries.push(
      { label: 'Start New Feature', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'feature')) },
      { label: 'Start New Bug', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'bug')) }
    );
  }

  if (entries.length > 0) {
    appendMenuSection('Flow Governance');
    appendMenuSubmenu('Flow Governance', entries);
  }
}

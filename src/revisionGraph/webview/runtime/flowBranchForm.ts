function showRevisionGraphWebviewFlowBranchForm(
  message: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-branch-form' }>,
  targets: readonly RevisionGraphWebviewTarget[],
  showForm: (target: RevisionGraphWebviewTarget, branchKind: RevisionGraphWebviewFlowBranchKind) => void
): void {
  const target = targets.find((candidate) => candidate.kind !== 'commit' && candidate.name === message.sourceRefName);
  if (target) {
    showForm(target, message.branchKind);
  }
}

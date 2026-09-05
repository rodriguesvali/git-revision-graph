interface RevisionGraphWebviewViewOptionsToolbarControls {
  readonly showTagsToggle: HTMLInputElement | null;
  readonly showRemoteBranchesToggle: HTMLInputElement | null;
  readonly showStashesToggle: HTMLInputElement | null;
  readonly showMergeCommitsToggle: HTMLInputElement | null;
  readonly showMinimapToggle: HTMLInputElement | null;
  readonly flowGovernanceEnabledToggle: HTMLInputElement | null;
  readonly rangeFilterClearButton: HTMLButtonElement | null;
  readonly descendantFilterClearButton: HTMLButtonElement | null;
}

function syncRevisionGraphWebviewViewOptionsToolbarUi(
  controls: RevisionGraphWebviewViewOptionsToolbarControls,
  toolbarBusy: boolean,
  hasFlowGovernanceState: boolean,
  flowGovernanceSaving = false
): void {
  for (const control of [
    controls.showTagsToggle,
    controls.showRemoteBranchesToggle,
    controls.showStashesToggle,
    controls.showMergeCommitsToggle,
    controls.showMinimapToggle,
    controls.rangeFilterClearButton,
    controls.descendantFilterClearButton
  ]) {
    if (control !== null) {
      control.disabled = toolbarBusy;
    }
  }
  if (controls.flowGovernanceEnabledToggle !== null) {
    controls.flowGovernanceEnabledToggle.disabled = toolbarBusy || !hasFlowGovernanceState || flowGovernanceSaving;
  }
}

function syncRevisionGraphWebviewFlowSavingStatus(saving: boolean): void {
  const status = document.getElementById('flowGovernanceSaveStatus');
  if (status) status.textContent = saving ? 'Saving…' : '';
}

function syncRevisionGraphWebviewCenterHeadToolbarUi(
  centerHeadButton: HTMLButtonElement | null,
  toolbarBusy: boolean
): void {
  if (centerHeadButton !== null) {
    centerHeadButton.disabled = toolbarBusy;
  }
}

function syncRevisionGraphWebviewCenterHeadToolbarUi(
  centerHeadButton: HTMLButtonElement | null,
  toolbarBusy: boolean,
  hasHeadInGraph: boolean
): void {
  if (centerHeadButton !== null) {
    centerHeadButton.disabled = toolbarBusy || !hasHeadInGraph;
    centerHeadButton.title = hasHeadInGraph
      ? 'Center on HEAD'
      : 'HEAD is not available in the current graph';
  }
}

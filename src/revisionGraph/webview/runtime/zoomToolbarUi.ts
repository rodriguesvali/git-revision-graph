interface RevisionGraphWebviewZoomToolbarControls {
  readonly zoomInButton: HTMLButtonElement | null;
  readonly zoomOutButton: HTMLButtonElement | null;
  readonly zoomResetButton: HTMLButtonElement | null;
  readonly minimapZoomInButton: HTMLButtonElement | null;
  readonly minimapZoomOutButton: HTMLButtonElement | null;
  readonly minimapZoomResetButton: HTMLButtonElement | null;
}

function syncRevisionGraphWebviewZoomToolbarUi(
  controls: RevisionGraphWebviewZoomToolbarControls,
  toolbarBusy: boolean,
  minimapEnabled: boolean,
  canZoomIn: boolean,
  canZoomOut: boolean,
  canResetZoom: boolean,
  canZoomInMinimap: boolean,
  canZoomOutMinimap: boolean,
  canResetMinimapZoom: boolean
): void {
  syncRevisionGraphWebviewZoomToolbarButton(controls.zoomInButton, toolbarBusy || !canZoomIn);
  syncRevisionGraphWebviewZoomToolbarButton(controls.zoomOutButton, toolbarBusy || !canZoomOut);
  syncRevisionGraphWebviewZoomToolbarButton(controls.zoomResetButton, toolbarBusy || !canResetZoom);
  syncRevisionGraphWebviewZoomToolbarButton(controls.minimapZoomInButton, toolbarBusy || !minimapEnabled || !canZoomInMinimap);
  syncRevisionGraphWebviewZoomToolbarButton(controls.minimapZoomOutButton, toolbarBusy || !minimapEnabled || !canZoomOutMinimap);
  syncRevisionGraphWebviewZoomToolbarButton(controls.minimapZoomResetButton, toolbarBusy || !minimapEnabled || !canResetMinimapZoom);
}

function syncRevisionGraphWebviewZoomToolbarButton(button: HTMLButtonElement | null, disabled: boolean): void {
  if (button !== null) {
    button.disabled = disabled;
  }
}

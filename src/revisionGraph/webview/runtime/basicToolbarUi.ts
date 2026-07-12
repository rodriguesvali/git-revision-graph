interface RevisionGraphWebviewBasicToolbarControls {
  readonly scopeSelect: HTMLSelectElement | null;
  readonly viewOptionsButton: HTMLButtonElement | null;
  readonly reloadButton: HTMLButtonElement | null;
  readonly reloadMenuButton: HTMLButtonElement | null;
  readonly fetchAllButton: HTMLButtonElement | null;
}

function syncRevisionGraphWebviewBasicToolbarUi(
  controls: RevisionGraphWebviewBasicToolbarControls,
  toolbarBusy: boolean,
  hasRepository: boolean
): void {
  syncRevisionGraphWebviewBasicToolbarControl(controls.scopeSelect, toolbarBusy);
  syncRevisionGraphWebviewBasicToolbarControl(controls.viewOptionsButton, toolbarBusy);
  syncRevisionGraphWebviewBasicToolbarControl(controls.reloadButton, toolbarBusy);
  syncRevisionGraphWebviewBasicToolbarControl(controls.reloadMenuButton, toolbarBusy);
  syncRevisionGraphWebviewBasicToolbarControl(controls.fetchAllButton, toolbarBusy || !hasRepository);
}

function syncRevisionGraphWebviewBasicToolbarControl(
  control: HTMLButtonElement | HTMLSelectElement | null,
  disabled: boolean
): void {
  if (control !== null) {
    control.disabled = disabled;
  }
}

interface RevisionGraphWebviewRemoteToolbarControls {
  readonly pullButton: HTMLButtonElement | null;
  readonly pushButton: HTMLButtonElement | null;
  readonly pushMenuButton: HTMLButtonElement | null;
  readonly syncButton: HTMLButtonElement | null;
}

function syncRevisionGraphWebviewRemoteToolbarUi(
  controls: RevisionGraphWebviewRemoteToolbarControls,
  toolbarBusy: boolean,
  canUseCurrentHeadRemote: boolean,
  upstreamLabel: string
): void {
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pullButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `Pull from ${upstreamLabel}`
  );
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pushButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `Push to ${upstreamLabel}`
  );
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pushMenuButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `More push options for ${upstreamLabel}`
  );
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.syncButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `Sync with ${upstreamLabel}`
  );
}

function syncRevisionGraphWebviewRemoteToolbarButton(
  button: HTMLButtonElement | null,
  disabled: boolean,
  title: string
): void {
  if (button === null) {
    return;
  }
  button.disabled = disabled;
  button.title = title;
  button.setAttribute('aria-label', title);
}

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
  upstreamLabel: string,
  canPublishCurrentHead = false
): void {
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pullButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `Pull from ${upstreamLabel}`
  );
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pushButton,
    toolbarBusy || !(canUseCurrentHeadRemote || canPublishCurrentHead),
    canPublishCurrentHead ? 'Publish Branch to Remote' : `Push to ${upstreamLabel}`
  );
  syncRevisionGraphWebviewRemoteToolbarButton(
    controls.pushMenuButton,
    toolbarBusy || !canUseCurrentHeadRemote,
    `More push options for ${upstreamLabel}`
  );
  controls.pushButton?.setAttribute('data-push-action', canPublishCurrentHead ? 'publish' : 'push');
  if (controls.pushMenuButton) {
    controls.pushMenuButton.hidden = canPublishCurrentHead;
  }
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

function getRevisionGraphWebviewRemoteActionState(
  ready: boolean,
  references: readonly RevisionGraphWebviewHostReference[],
  headName: string | null,
  upstreamName: string | null,
  publishedNames: ReadonlySet<string>
) {
  const head = ready ? references.find((ref) => ref.kind === 'head' && ref.name === headName) : undefined;
  const published = !!headName && publishedNames.has(headName);
  return {
    canUseCurrentHeadRemote: !!head && !!upstreamName && published,
    publishTarget: head && !published ? { ...head, revision: head.name, label: head.name } : undefined,
    upstreamLabel: upstreamName || 'upstream'
  };
}

function runRevisionGraphWebviewPrimaryPushAction(
  action: ReturnType<typeof getRevisionGraphWebviewRemoteActionState>,
  disabled: boolean,
  publish: (target: RevisionGraphWebviewTarget) => void,
  push: (mode: 'normal') => void
): void {
  if (disabled) {
    return;
  }
  if (action.publishTarget) {
    publish(action.publishTarget);
  } else if (action.canUseCurrentHeadRemote) {
    push('normal');
  }
}

function postMessageWithLoading(
  message: RevisionGraphWebviewMessage,
  label: string,
  pendingControl: HTMLElement | null = null,
  mode: RevisionGraphWebviewLoadingMode = 'blocking'
) {
  const boundMessage = bindRevisionGraphWebviewMessage(message, currentState);
  if (toolbarBusy || !boundMessage) {
    return;
  }
  showLoading(label, pendingControl, mode);
  requestAnimationFrame(() => {
    vscode.postMessage(boundMessage);
  });
}

function waitForNextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

async function runWithLoading(
  label: string,
  work: () => void | Promise<void>,
  pendingControl: HTMLElement | null = null,
  mode: RevisionGraphWebviewLoadingMode = 'blocking'
) {
  if (toolbarBusy) {
    return;
  }
  showLoading(label, pendingControl, mode);
  await waitForNextFrame();
  try {
    await work();
  } finally {
    await waitForNextFrame();
    hideLoading();
  }
}

function showLoading(
  label: string,
  pendingControl: HTMLElement | null = null,
  mode: RevisionGraphWebviewLoadingMode = 'blocking'
) {
  showRevisionGraphWebviewLoading({
    body: document.body as HTMLBodyElement,
    overlay: loadingOverlay,
    message: loadingMessage
  }, label, mode);
  setToolbarBusy(true, pendingControl);
  closeViewOptionsMenu();
  closeContextMenu();
}

function hideLoading() {
  hideRevisionGraphWebviewLoading({
    body: document.body as HTMLBodyElement,
    overlay: loadingOverlay,
    message: loadingMessage
  });
  setToolbarBusy(false);
}

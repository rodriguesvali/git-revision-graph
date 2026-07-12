function applyRevisionGraphWebviewToolbarBusyState(
  controls: readonly HTMLElement[],
  isBusy: boolean,
  pendingControl: HTMLElement | null
): void {
  for (const control of controls) {
    if (isBusy && control === pendingControl) {
      control.setAttribute('data-pending', 'true');
      control.setAttribute('aria-busy', 'true');
      continue;
    }

    control.removeAttribute('data-pending');
    control.removeAttribute('aria-busy');
  }
}

function calculateRevisionGraphWebviewToolbarSafeHeight(renderedHeight: number): number | null {
  if (!Number.isFinite(renderedHeight) || renderedHeight <= 0) {
    return null;
  }
  return Math.ceil(renderedHeight);
}

function syncRevisionGraphWebviewToolbarSafeHeight(
  root: HTMLElement,
  toolbar: HTMLElement
): boolean {
  const height = calculateRevisionGraphWebviewToolbarSafeHeight(
    toolbar.getBoundingClientRect().height
  );
  if (height === null) {
    return false;
  }
  const nextValue = `${height}px`;
  if (root.style.getPropertyValue('--toolbar-safe-height').trim() === nextValue) {
    return false;
  }
  root.style.setProperty('--toolbar-safe-height', nextValue);
  return true;
}

function observeRevisionGraphWebviewToolbarSafeHeight(
  root: HTMLElement,
  toolbar: HTMLElement,
  onHeightChange: () => void
): void {
  syncRevisionGraphWebviewToolbarSafeHeight(root, toolbar);
  if (typeof ResizeObserver !== 'function') {
    return;
  }
  const observer = new ResizeObserver(() => {
    if (syncRevisionGraphWebviewToolbarSafeHeight(root, toolbar)) {
      onHeightChange();
    }
  });
  observer.observe(toolbar);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

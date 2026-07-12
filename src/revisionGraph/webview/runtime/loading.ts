type RevisionGraphWebviewLoadingMode = 'blocking' | 'subtle';

interface RevisionGraphWebviewLoadingElements {
  readonly body: HTMLBodyElement;
  readonly overlay: HTMLDivElement;
  readonly message: HTMLDivElement;
}

function showRevisionGraphWebviewLoading(
  elements: RevisionGraphWebviewLoadingElements,
  label: string | undefined,
  mode: RevisionGraphWebviewLoadingMode
): void {
  if (typeof label === 'string') {
    elements.message.textContent = label;
  }
  elements.overlay.setAttribute('aria-hidden', 'false');
  elements.overlay.setAttribute('data-mode', mode);
  elements.body.classList.remove('loading', 'loading-subtle');

  if (mode === 'subtle') {
    elements.body.classList.add('loading-subtle');
    elements.body.removeAttribute('aria-busy');
    return;
  }

  elements.body.classList.add('loading');
  elements.body.setAttribute('aria-busy', 'true');
}

function hideRevisionGraphWebviewLoading(elements: RevisionGraphWebviewLoadingElements): void {
  elements.overlay.setAttribute('aria-hidden', 'true');
  elements.overlay.removeAttribute('data-mode');
  elements.body.classList.remove('loading', 'loading-subtle');
  elements.body.removeAttribute('aria-busy');
}

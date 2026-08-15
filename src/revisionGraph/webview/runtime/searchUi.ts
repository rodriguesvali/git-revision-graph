interface RevisionGraphWebviewSearchUiElements {
  readonly button: HTMLButtonElement;
  readonly buttonBadge: HTMLSpanElement;
  readonly panel: HTMLDivElement;
  readonly input: HTMLInputElement;
  readonly resultBadge: HTMLSpanElement;
  readonly previousButton: HTMLButtonElement;
  readonly nextButton: HTMLButtonElement;
  readonly closeButton: HTMLButtonElement;
}

interface RevisionGraphWebviewSearchUiState {
  readonly isPanelOpen: boolean;
  readonly query: string;
  readonly isQueryActive: boolean;
  readonly resultCount: number;
  readonly activeResultIndex: number;
  readonly isToolbarBusy: boolean;
}

function syncRevisionGraphWebviewSearchUi(
  elements: RevisionGraphWebviewSearchUiElements,
  state: RevisionGraphWebviewSearchUiState
): void {
  elements.panel.hidden = !state.isPanelOpen;
  elements.button.setAttribute('aria-expanded', state.isPanelOpen ? 'true' : 'false');
  elements.button.classList.toggle('active', state.isQueryActive);

  if (elements.input.value !== state.query) {
    elements.input.value = state.query;
  }

  elements.resultBadge.textContent =
    state.resultCount > 0 && state.activeResultIndex >= 0
      ? `${state.activeResultIndex + 1}/${state.resultCount}`
      : '0 results';
  elements.buttonBadge.textContent = state.resultCount > 0
    ? `${state.activeResultIndex + 1}/${state.resultCount}`
    : state.isQueryActive
      ? '0'
      : '';
  elements.buttonBadge.hidden = !state.isQueryActive;

  const cannotNavigate = !state.isQueryActive || state.resultCount < 2;
  elements.previousButton.disabled = state.isToolbarBusy || cannotNavigate;
  elements.nextButton.disabled = state.isToolbarBusy || cannotNavigate;
  elements.closeButton.disabled = state.isToolbarBusy;
  elements.input.disabled = state.isToolbarBusy;
}

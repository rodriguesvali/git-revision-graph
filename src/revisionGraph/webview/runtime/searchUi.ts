interface RevisionGraphWebviewSearchUiElements {
  readonly input: HTMLInputElement;
  readonly resultBadge: HTMLSpanElement;
  readonly previousButton: HTMLButtonElement;
  readonly nextButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
}

interface RevisionGraphWebviewSearchUiState {
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
  if (elements.input.value !== state.query) {
    elements.input.value = state.query;
  }

  elements.resultBadge.textContent =
    state.resultCount > 0 && state.activeResultIndex >= 0
      ? `${state.activeResultIndex + 1}/${state.resultCount}`
      : '0 results';

  const cannotNavigate = !state.isQueryActive || state.resultCount < 2;
  elements.previousButton.disabled = state.isToolbarBusy || cannotNavigate;
  elements.nextButton.disabled = state.isToolbarBusy || cannotNavigate;
  elements.clearButton.disabled = state.isToolbarBusy || !state.isQueryActive;
  elements.input.disabled = state.isToolbarBusy;
}

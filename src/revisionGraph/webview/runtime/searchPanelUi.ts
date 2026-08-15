interface RevisionGraphSearchPanelController {
  isOpen(): boolean;
  open(selectText?: boolean): void;
  close(restoreButtonFocus?: boolean): void;
  toggle(): void;
}

function createRevisionGraphSearchPanelController(
  button: HTMLButtonElement,
  input: HTMLInputElement,
  syncUi: () => void
): RevisionGraphSearchPanelController {
  let open = false;
  return {
    isOpen: () => open,
    open(selectText = false) {
      open = true;
      syncUi();
      input.focus();
      if (selectText) {
        input.select();
      }
    },
    close(restoreButtonFocus = false) {
      open = false;
      syncUi();
      input.blur();
      if (restoreButtonFocus) {
        button.focus();
      }
    },
    toggle() {
      if (open) {
        this.close();
      } else {
        this.open(true);
      }
    }
  };
}

interface RevisionGraphSearchPanelBindings {
  readonly button: HTMLButtonElement;
  readonly input: HTMLInputElement;
  readonly previousButton: HTMLButtonElement;
  readonly nextButton: HTMLButtonElement;
  readonly closeButton: HTMLButtonElement;
  readonly controller: RevisionGraphSearchPanelController;
  readonly setQuery: (query: string) => void;
  readonly focusPrevious: () => void;
  readonly focusNext: () => void;
}

function bindRevisionGraphSearchPanelEvents(bindings: RevisionGraphSearchPanelBindings): void {
  bindings.button.addEventListener('click', () => bindings.controller.toggle());
  bindings.input.addEventListener('input', () => bindings.setQuery(bindings.input.value));
  bindings.previousButton.addEventListener('click', bindings.focusPrevious);
  bindings.nextButton.addEventListener('click', bindings.focusNext);
  bindings.closeButton.addEventListener('click', () => bindings.controller.close(true));
}

interface RevisionGraphSearchKeyboardContext {
  readonly isInputFocused: boolean;
  readonly hasQuery: boolean;
  readonly controller: RevisionGraphSearchPanelController;
  readonly focusPrevious: () => void;
  readonly focusNext: () => void;
  readonly clearQuery: () => void;
}

function handleRevisionGraphSearchKeyboardEvent(
  event: KeyboardEvent,
  context: RevisionGraphSearchKeyboardContext
): boolean {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    context.controller.open(true);
    return true;
  }
  if (!context.isInputFocused) {
    return false;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    event.shiftKey ? context.focusPrevious() : context.focusNext();
    return true;
  }
  if (event.key !== 'Escape') {
    return false;
  }
  event.preventDefault();
  context.hasQuery ? context.clearQuery() : context.controller.close(true);
  return true;
}

function closeRevisionGraphSearchPanelAfterOutsideClick(
  target: Node | null,
  panel: HTMLDivElement,
  button: HTMLButtonElement,
  controller: RevisionGraphSearchPanelController,
  hasQuery: boolean
): void {
  if (controller.isOpen() && !hasQuery && !panel.contains(target) && !button.contains(target)) {
    controller.close();
  }
}

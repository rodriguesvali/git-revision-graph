interface RevisionGraphWebviewStatusAction {
  readonly action: string;
  readonly label: string;
}

interface RevisionGraphWebviewStatusElements {
  readonly card: HTMLDivElement;
  readonly message: HTMLDivElement;
  readonly actionButton: HTMLButtonElement;
}

function showRevisionGraphWebviewStatus(
  elements: RevisionGraphWebviewStatusElements,
  message: string,
  isError: boolean,
  action?: RevisionGraphWebviewStatusAction | null
): void {
  elements.message.textContent = message;
  elements.card.hidden = false;
  elements.card.classList.toggle('error', isError);

  if (action) {
    elements.actionButton.hidden = false;
    elements.actionButton.textContent = action.label;
    elements.actionButton.dataset.action = action.action;
    return;
  }

  elements.actionButton.hidden = true;
  elements.actionButton.textContent = '';
  delete elements.actionButton.dataset.action;
}

function hideRevisionGraphWebviewStatus(elements: RevisionGraphWebviewStatusElements): void {
  elements.card.hidden = true;
  elements.card.classList.remove('error');
  elements.message.textContent = '';
  elements.actionButton.hidden = true;
  elements.actionButton.textContent = '';
  delete elements.actionButton.dataset.action;
}

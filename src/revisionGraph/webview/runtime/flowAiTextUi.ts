function createRevisionGraphWebviewFlowAiTextButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'flow-ai-text-action';
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = [
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">',
    '<path d="M7.5 1 8.7 4.3 12 5.5 8.7 6.7 7.5 10 6.3 6.7 3 5.5 6.3 4.3 7.5 1Z"></path>',
    '<path d="M12.5 9.2 13.1 10.9 14.8 11.5 13.1 12.1 12.5 13.8 11.9 12.1 10.2 11.5 11.9 10.9 12.5 9.2Z"></path>',
    '</svg>'
  ].join('');
  return button;
}

function setRevisionGraphWebviewFlowAiTextButtonState(
  button: HTMLButtonElement,
  enabled: boolean,
  busy: boolean
): void {
  const label = busy ? 'Improving text with AI...' : 'Improve with AI';
  button.disabled = !enabled || busy;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  button.dataset.loading = busy ? 'true' : 'false';
}

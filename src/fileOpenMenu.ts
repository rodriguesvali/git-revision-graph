export function renderFileOpenMenuScript(): string {
  return `
    function renderFileOpenButton(entry) {
      return '<button class="context-menu-item" type="button" data-menu-action="' + escapeHtml(entry.action)
        + '"' + (entry.title ? ' title="' + escapeHtml(entry.title) + '"' : '') + (entry.disabled ? ' disabled aria-disabled="true"' : '')
        + '>' + escapeHtml(entry.label) + '</button>';
    }
`;
}

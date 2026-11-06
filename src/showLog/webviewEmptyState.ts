export function renderShowLogEmptyStateScript(): string {
  return `
    function renderShowLogEmptyState(state) {
      const canClear = state.kind === 'visible' && !state.loading && !state.errorMessage && (state.filterText || '').trim();
      const action = canClear ? '<button type="button" class="empty-state-clear" data-clear-show-log-filter>Clear search</button>' : '';
      return '<div class="empty-state"><span>' + escapeHtml(state.emptyMessage) + '</span>' + action + '</div>';
    }

    function clearShowLogFilter() {
      if (!currentState || currentState.kind !== 'visible' || !(filterInput instanceof HTMLInputElement)) return;
      filterInput.value = '';
      filterInput.focus();
      scheduleFilterUpdate('');
    }

`;
}

export function renderShowLogEmptyStateStyles(): string {
  return `
    .status-card,
    .empty-state {
      margin: 10px 12px 0;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 72%, transparent);
      border-radius: 10px;
      color: var(--vscode-descriptionForeground);
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 55%, transparent);
      line-height: 1.45;
    }
    .empty-state-clear {
      display: block; margin-top: 8px; padding: 4px 8px; cursor: pointer;
      border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px;
      color: var(--vscode-button-foreground); background: var(--vscode-button-background);
      font: inherit;
    }
    .empty-state-clear:hover { background: var(--vscode-button-hoverBackground); }
    .empty-state-clear:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
  `;
}

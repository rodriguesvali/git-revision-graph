export function renderShowLogHostMessageScript(): string {
  return `
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'state') {
        const previousSourceToken = getCurrentSourceToken();
        const previousFilterText = currentState && currentState.filterText;
        closeContextMenu();
        rememberCommitFileFilterFocus();
        currentState = event.data.state;
        if (previousSourceToken !== getCurrentSourceToken() || previousFilterText !== currentState.filterText) resetCommitFileFilters();
        if (previousSourceToken !== getCurrentSourceToken()) {
          clearPendingFilterUpdate();
        }
        render();
        return;
      }

      if (event.data && event.data.type === 'append') {
        if (!applyAppendPatch(event.data.patch)) {
          postMessage({ type: 'ready' });
        }
      }
    });

`;
}

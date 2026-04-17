import { createNonce } from './revisionGraph/webview/shared';

export interface CompareResultsWebviewItem {
  readonly id: string;
  readonly path: string;
  readonly fullPath: string;
  readonly status: string;
  readonly leftRef: string | undefined;
  readonly rightRef: string | undefined;
  readonly worktreeRef: string | undefined;
  readonly worktreeLabel: string | undefined;
}

export interface CompareResultsWebviewState {
  readonly kind: 'empty' | 'results';
  readonly summary: string;
  readonly emptyMessage?: string | undefined;
  readonly items: readonly CompareResultsWebviewItem[];
}

export function renderCompareResultsWebviewHtml(): string {
  const nonce = createNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compare Results</title>
  <style>
    :root {
      color-scheme: var(--vscode-color-scheme);
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px 12px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--vscode-sideBar-background) 96%, transparent),
          var(--vscode-sideBar-background)
        );
      backdrop-filter: blur(4px);
    }
    .search-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .search-input {
      width: 100%;
      height: 30px;
      padding: 0 10px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 7px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      outline: none;
    }
    .search-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .icon-button {
      min-width: 30px;
      height: 30px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 7px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }
    .icon-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      min-height: 18px;
    }
    .summary {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px 14px;
    }
    .row {
      display: block;
      padding: 8px 9px;
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 72%, transparent);
      border-radius: 10px;
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 60%, transparent);
      cursor: context-menu;
    }
    .row:hover {
      border-color: color-mix(in srgb, var(--vscode-focusBorder) 45%, transparent);
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 55%, transparent);
    }
    .row[data-selected="true"] {
      border-color: color-mix(in srgb, var(--vscode-focusBorder) 85%, transparent);
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 45%, var(--vscode-list-hoverBackground));
    }
    .row:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--vscode-list-focusOutline) 18%, var(--vscode-list-hoverBackground));
    }
    .file-entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      width: 100%;
    }
    .file-path {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      word-break: break-word;
    }
    .file-meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-state {
      padding: 22px 16px 18px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.45;
    }
    .context-menu {
      position: fixed;
      z-index: 1000;
      min-width: 180px;
      padding: 6px;
      border: 1px solid var(--vscode-menu-border, var(--vscode-widget-border, transparent));
      border-radius: 10px;
      color: var(--vscode-menu-foreground, var(--vscode-foreground));
      background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
      box-shadow: 0 10px 24px color-mix(in srgb, var(--vscode-widget-shadow, #000) 60%, transparent);
    }
    .context-menu[hidden] {
      display: none;
    }
    .context-menu-button {
      display: block;
      width: 100%;
      padding: 7px 10px;
      border: 0;
      border-radius: 7px;
      color: inherit;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 12px;
    }
    .context-menu-button:hover,
    .context-menu-button:focus-visible {
      outline: none;
      background: var(--vscode-list-hoverBackground);
    }
    .context-menu-group {
      position: relative;
    }
    .context-menu-parent {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      padding: 7px 10px;
      border: 0;
      border-radius: 7px;
      color: inherit;
      background: transparent;
      text-align: left;
      cursor: default;
      font-size: 12px;
    }
    .context-menu-parent:hover,
    .context-menu-parent:focus-visible,
    .context-menu-group:focus-within > .context-menu-parent {
      outline: none;
      background: var(--vscode-list-hoverBackground);
    }
    .context-menu-chevron {
      flex-shrink: 0;
      opacity: 0.8;
    }
    .context-submenu {
      position: absolute;
      top: -6px;
      left: calc(100% + 6px);
      min-width: 170px;
      padding: 6px;
      border: 1px solid var(--vscode-menu-border, var(--vscode-widget-border, transparent));
      border-radius: 10px;
      color: inherit;
      background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
      box-shadow: 0 10px 24px color-mix(in srgb, var(--vscode-widget-shadow, #000) 60%, transparent);
      opacity: 0;
      pointer-events: none;
      transform: translateX(-4px);
      transition: opacity 90ms ease, transform 90ms ease;
    }
    .context-menu-group:hover > .context-submenu,
    .context-menu-group:focus-within > .context-submenu {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <div class="search-row">
        <input
          id="searchInput"
          class="search-input"
          type="text"
          placeholder="Filter files by path or status..."
          aria-label="Filter compare result files"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button id="clearSearchButton" class="icon-button" type="button" title="Clear filter" aria-label="Clear filter">×</button>
      </div>
      <div class="summary-row">
        <div id="summary" class="summary"></div>
        <div id="countBadge" class="count">0</div>
      </div>
    </div>
    <div id="content"></div>
  </div>
  <div id="contextMenu" class="context-menu" hidden></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const clearSearchButton = document.getElementById('clearSearchButton');
    const summary = document.getElementById('summary');
    const countBadge = document.getElementById('countBadge');
    const content = document.getElementById('content');
    const contextMenu = document.getElementById('contextMenu');

    let currentState = {
      kind: 'empty',
      summary: '',
      emptyMessage: 'Run a compare from the revision graph or Command Palette to keep the changed files here.',
      items: []
    };
    let selectedItemIds = [];
    let selectionAnchorItemId = undefined;
    let contextMenuItemIds = [];

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message && message.type === 'state') {
        currentState = message.state;
        searchInput.value = '';
        selectedItemIds = [];
        selectionAnchorItemId = undefined;
        closeContextMenu();
        render();
      }
    });

    searchInput.addEventListener('input', () => {
      closeContextMenu();
      render();
    });

    clearSearchButton.addEventListener('click', () => {
      searchInput.value = '';
      closeContextMenu();
      render();
      searchInput.focus();
    });

    content.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        return;
      }

      closeContextMenu();
      updateSelection(itemId, event);
      render();
      focusItem(itemId);
    });

    content.addEventListener('contextmenu', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        closeContextMenu();
        return;
      }

      event.preventDefault();
      updateContextMenuSelection(itemId, event);
      render();
      openContextMenu(getSelectionForContextMenu(itemId), event.clientX, event.clientY);
    });

    content.addEventListener('keydown', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        return;
      }

      const shouldExtendSelection =
        event.shiftKey
        && (event.key === 'ArrowDown' || event.key === 'ArrowUp');

      if (shouldExtendSelection) {
        event.preventDefault();
        extendSelectionWithArrow(itemId, event.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      const shouldOpenMenu =
        event.key === 'ContextMenu'
        || (event.shiftKey && event.key === 'F10')
        || event.key === 'Enter'
        || event.key === ' ';

      if (!shouldOpenMenu) {
        return;
      }

      event.preventDefault();
      if (!selectedItemIds.includes(itemId)) {
        selectedItemIds = [itemId];
        selectionAnchorItemId = itemId;
        render();
      }
      openContextMenuForElement(getSelectionForContextMenu(itemId), target);
    });

    contextMenu.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-menu-action]')?.getAttribute('data-menu-action');
      if (!action || contextMenuItemIds.length === 0) {
        return;
      }

      const itemIds = [...contextMenuItemIds];
      closeContextMenu();
      if (action === 'copyFileName' || action === 'copyFullPath') {
        postMultiAction(action, itemIds);
        return;
      }

      postSingleAction(action, itemIds[0]);
    });

    window.addEventListener('click', (event) => {
      if (!contextMenu.hidden && !event.target?.closest?.('#contextMenu')) {
        closeContextMenu();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (!contextMenu.hidden) {
          closeContextMenu();
          return;
        }

        if (selectedItemIds.length > 0) {
          selectedItemIds = [];
          selectionAnchorItemId = undefined;
          render();
        }

        closeContextMenu();
      }
    });

    window.addEventListener('blur', () => {
      closeContextMenu();
    });

    window.addEventListener('resize', () => {
      closeContextMenu();
    });

    window.addEventListener('scroll', () => {
      closeContextMenu();
    }, true);

    function render() {
      const filterQuery = normalizeQuery(searchInput.value);
      const filteredItems = getFilteredItems(filterQuery);
      const totalCount = currentState.items.length;
      const selectedCount = selectedItemIds.length;

      summary.textContent = currentState.summary;
      countBadge.textContent = totalCount + '/' + selectedCount;
      countBadge.title = filterQuery
        ? totalCount + ' files, ' + selectedCount + ' selected, ' + filteredItems.length + ' visible after filtering'
        : totalCount + ' files, ' + selectedCount + ' selected';
      clearSearchButton.disabled = filterQuery.length === 0;

      if (currentState.kind === 'empty') {
        content.innerHTML = '<div class="empty-state">' + escapeHtml(currentState.emptyMessage || '') + '</div>';
        return;
      }

      if (filteredItems.length === 0) {
        content.innerHTML = '<div class="empty-state">No files match <strong>' + escapeHtml(searchInput.value.trim()) + '</strong>.</div>';
        return;
      }

      content.innerHTML = '<div class="list" role="listbox" aria-multiselectable="true">' + filteredItems.map((item) => {
        const secondaryLabel = item.worktreeRef
          ? (item.worktreeLabel || item.worktreeRef) + ' <-> worktree'
          : item.leftRef + ' <-> ' + item.rightRef;
        const isSelected = selectedItemIds.includes(item.id);

        return ''
          + '<div'
          + ' class="row"'
          + ' data-item-id="' + escapeHtml(item.id) + '"'
          + ' data-selected="' + (isSelected ? 'true' : 'false') + '"'
          + ' tabindex="0"'
          + ' role="option"'
          + ' aria-haspopup="menu"'
          + ' aria-selected="' + (isSelected ? 'true' : 'false') + '"'
          + ' aria-label="' + escapeHtml(item.path + '. ' + item.status + '. ' + secondaryLabel + '. Press Shift+F10 or Enter for actions.') + '"'
          + '>'
          + '  <div class="file-entry" data-item-id="' + escapeHtml(item.id) + '">'
          + '    <div class="file-path">' + escapeHtml(item.path) + '</div>'
          + '    <div class="file-meta">' + escapeHtml(item.status) + ' • ' + escapeHtml(secondaryLabel) + '</div>'
          + '  </div>'
          + '</div>';
      }).join('') + '</div>';
    }

    function getFilteredItems(query) {
      return filterItems(currentState.items, query);
    }

    function getVisibleItemIds() {
      return getFilteredItems(normalizeQuery(searchInput.value)).map((item) => item.id);
    }

    function filterItems(items, query) {
      if (!query) {
        return items;
      }

      return items.filter((item) => {
        const candidateValues = [
          item.path,
          item.fullPath,
          item.status,
          item.leftRef,
          item.rightRef,
          item.worktreeRef,
          item.worktreeLabel
        ];

        return candidateValues.some((value) => String(value || '').toLowerCase().includes(query));
      });
    }

    function normalizeQuery(value) {
      return String(value || '').trim().toLowerCase();
    }

    function getItemById(itemId) {
      return currentState.items.find((item) => item.id === itemId);
    }

    function getMenuActions(items) {
      if (items.length > 1) {
        return [
          {
            label: 'Copy to Clipboard',
            submenu: [
              { action: 'copyFileName', label: 'File Name' },
              { action: 'copyFullPath', label: 'Full Path' }
            ]
          }
        ];
      }

      const item = items[0];
      const actions = [
        { action: 'base', label: 'Compare with Base' }
      ];

      if (item.worktreeRef) {
        actions.push({ action: 'worktree', label: 'Compare with Worktree' });
        actions.push({ action: 'revert', label: 'Revert to This' });
      }

      actions.push({
        label: 'Copy to Clipboard',
        submenu: [
          { action: 'copyFileName', label: 'File Name' },
          { action: 'copyFullPath', label: 'Full Path' }
        ]
      });

      return actions;
    }

    function updateSelection(itemId, event) {
      const isToggleSelection = event.ctrlKey || event.metaKey;
      const isRangeSelection = event.shiftKey;
      const currentSelection = new Set(selectedItemIds);

      if (isRangeSelection && selectionAnchorItemId) {
        const visibleItemIds = getVisibleItemIds();
        const startIndex = visibleItemIds.indexOf(selectionAnchorItemId);
        const endIndex = visibleItemIds.indexOf(itemId);
        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          selectedItemIds = visibleItemIds.slice(from, to + 1);
          return;
        }
      }

      if (isToggleSelection) {
        if (currentSelection.has(itemId)) {
          currentSelection.delete(itemId);
        } else {
          currentSelection.add(itemId);
        }
        selectedItemIds = currentState.items
          .map((item) => item.id)
          .filter((id) => currentSelection.has(id));
        selectionAnchorItemId = itemId;
        return;
      }

      selectedItemIds = [itemId];
      selectionAnchorItemId = itemId;
    }

    function extendSelectionWithArrow(itemId, direction) {
      const visibleItemIds = getVisibleItemIds();
      const currentIndex = visibleItemIds.indexOf(itemId);
      if (currentIndex < 0) {
        return;
      }

      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= visibleItemIds.length) {
        return;
      }

      if (!selectionAnchorItemId || !visibleItemIds.includes(selectionAnchorItemId)) {
        selectionAnchorItemId = itemId;
      }

      const targetItemId = visibleItemIds[targetIndex];
      const anchorIndex = visibleItemIds.indexOf(selectionAnchorItemId);
      const [from, to] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      selectedItemIds = visibleItemIds.slice(from, to + 1);
      render();
      focusItem(targetItemId);
    }

    function updateContextMenuSelection(itemId, event) {
      if (selectedItemIds.includes(itemId) && selectedItemIds.length > 1 && !(event.ctrlKey || event.metaKey || event.shiftKey)) {
        return;
      }

      selectedItemIds = [itemId];
      selectionAnchorItemId = itemId;
    }

    function getSelectionForContextMenu(itemId) {
      if (selectedItemIds.includes(itemId) && selectedItemIds.length > 0) {
        return currentState.items.filter((item) => selectedItemIds.includes(item.id));
      }

      const item = getItemById(itemId);
      return item ? [item] : [];
    }

    function openContextMenu(items, x, y) {
      if (items.length === 0) {
        closeContextMenu();
        return;
      }

      const actions = getMenuActions(items);
      if (actions.length === 0) {
        closeContextMenu();
        return;
      }

      contextMenuItemIds = items.map((item) => item.id);
      contextMenu.innerHTML = actions.map((entry) => {
        if (entry.submenu) {
          return ''
            + '<div class="context-menu-group">'
            + '  <div class="context-menu-parent" tabindex="0" role="button" aria-haspopup="menu" aria-label="' + escapeHtml(entry.label) + '">'
            + '    <span>' + escapeHtml(entry.label) + '</span>'
            + '    <span class="context-menu-chevron">›</span>'
            + '  </div>'
            + '  <div class="context-submenu" role="menu" aria-label="' + escapeHtml(entry.label) + '">'
            + entry.submenu.map((child) =>
              '<button class="context-menu-button" type="button" data-menu-action="' + escapeHtml(child.action) + '">' + escapeHtml(child.label) + '</button>'
            ).join('')
            + '  </div>'
            + '</div>';
        }

        return '<button class="context-menu-button" type="button" data-menu-action="' + escapeHtml(entry.action) + '">' + escapeHtml(entry.label) + '</button>';
      }).join('');
      contextMenu.hidden = false;
      contextMenu.style.left = '0px';
      contextMenu.style.top = '0px';

      const rect = contextMenu.getBoundingClientRect();
      const margin = 8;
      const left = Math.min(x, window.innerWidth - rect.width - margin);
      const top = Math.min(y, window.innerHeight - rect.height - margin);
      contextMenu.style.left = Math.max(margin, left) + 'px';
      contextMenu.style.top = Math.max(margin, top) + 'px';

      contextMenu.querySelector('.context-menu-button')?.focus();
    }

    function openContextMenuForElement(items, element) {
      const rect = element.getBoundingClientRect();
      openContextMenu(items, rect.left + Math.min(24, rect.width / 2), rect.top + Math.min(16, rect.height / 2));
    }

    function closeContextMenu() {
      contextMenu.hidden = true;
      contextMenuItemIds = [];
      contextMenu.innerHTML = '';
    }

    function focusItem(itemId) {
      for (const row of content.querySelectorAll('.row[data-item-id]')) {
        if (row.getAttribute('data-item-id') === itemId) {
          row.focus();
          break;
        }
      }
    }

    function postSingleAction(type, itemId) {
      vscode.postMessage({ type, itemId });
    }

    function postMultiAction(type, itemIds) {
      vscode.postMessage({ type, itemIds });
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

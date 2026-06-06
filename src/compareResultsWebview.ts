import {
  createWebviewContentSecurityPolicy,
  createWebviewNonce
} from './webviewSecurity';

export interface CompareResultsWebviewItem {
  readonly id: string;
  readonly path: string;
  readonly originalPath: string | undefined;
  readonly name: string;
  readonly directory: string;
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
  readonly sourceLabel?: string | undefined;
  readonly targetLabel?: string | undefined;
  readonly emptyMessage?: string | undefined;
  readonly items: readonly CompareResultsWebviewItem[];
}

export function renderCompareResultsWebviewHtml(): string {
  const nonce = createWebviewNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${createWebviewContentSecurityPolicy(nonce)}" />
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
      gap: 9px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      background: var(--vscode-sideBar-background);
    }
    .comparison-row,
    .controls-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .comparison-row {
      justify-content: space-between;
    }
    .comparison-direction {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      font-size: 12px;
      font-weight: 600;
    }
    .comparison-ref {
      min-width: 0;
      max-width: min(42vw, 420px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .comparison-arrow {
      flex: 0 0 auto;
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }
    .comparison-direction[data-empty="true"] .comparison-arrow {
      display: none;
    }
    .result-count,
    .selection-summary {
      flex: 0 0 auto;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      white-space: nowrap;
    }
    .comparison-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .selection-summary:not(:empty)::before {
      content: '·';
      margin-right: 8px;
      color: var(--vscode-descriptionForeground);
    }
    .controls-row {
      justify-content: space-between;
    }
    .status-filters {
      display: flex;
      align-items: center;
      gap: 2px;
      min-width: 0;
      overflow-x: auto;
    }
    .status-filter {
      min-height: 24px;
      padding: 3px 7px;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      font: inherit;
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
    }
    .status-filter:hover,
    .status-filter:focus-visible {
      outline: none;
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
    .status-filter[data-active="true"] {
      color: var(--vscode-foreground);
      border-color: var(--vscode-focusBorder);
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 42%, transparent);
    }
    .search-control {
      position: relative;
      flex: 0 1 320px;
      min-width: 180px;
    }
    .search-input {
      width: 100%;
      height: 26px;
      padding: 3px 28px 3px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      outline: none;
      font: inherit;
      font-size: 11px;
    }
    .search-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .icon-button {
      position: absolute;
      top: 50%;
      right: 4px;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 0;
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      transform: translateY(-50%);
      cursor: pointer;
    }
    .icon-button:hover,
    .icon-button:focus-visible {
      outline: none;
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
    .icon-button:disabled {
      visibility: hidden;
    }
    .list-header,
    .row {
      display: grid;
      grid-template-columns: 88px minmax(180px, 1.4fr) minmax(120px, 0.8fr) 116px;
      gap: 10px;
      align-items: center;
      min-width: 0;
    }
    .list-header {
      position: sticky;
      top: 76px;
      z-index: 4;
      min-height: 26px;
      padding: 4px 12px;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 58%, transparent);
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBar-background);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .list {
      display: flex;
      flex-direction: column;
      padding: 0 0 14px;
    }
    .row {
      min-height: 36px;
      padding: 4px 12px;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 32%, transparent);
      cursor: pointer;
      user-select: none;
    }
    .row:hover {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 72%, transparent);
    }
    .row[data-selected="true"] {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 52%, var(--vscode-list-hoverBackground));
    }
    .row:focus-visible {
      outline: none;
      box-shadow: inset 2px 0 0 var(--vscode-focusBorder);
    }
    .status-cell,
    .file-cell,
    .folder-cell,
    .actions-cell {
      min-width: 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--vscode-descriptionForeground);
    }
    .status-badge[data-status="modified"] .status-dot {
      background: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d);
    }
    .status-badge[data-status="added"] .status-dot {
      background: var(--vscode-gitDecoration-addedResourceForeground, #81b88b);
    }
    .status-badge[data-status="deleted"] .status-dot {
      background: var(--vscode-gitDecoration-deletedResourceForeground, #c74e39);
    }
    .status-badge[data-status="renamed"] .status-dot {
      background: var(--vscode-gitDecoration-renamedResourceForeground, #73c991);
    }
    .file-cell {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .file-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      font-weight: 550;
      color: var(--vscode-foreground);
    }
    .rename-path,
    .folder-cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10.5px;
      color: var(--vscode-descriptionForeground);
    }
    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .actions-column {
      text-align: center;
    }
    .row-action {
      min-height: 24px;
      padding: 3px 7px;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--vscode-foreground);
      background: transparent;
      font: inherit;
      font-size: 10.5px;
      white-space: nowrap;
      cursor: pointer;
    }
    .row-action:hover,
    .row-action:focus-visible {
      outline: none;
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
    .row-action.more {
      width: 24px;
      padding: 0;
      font-size: 15px;
    }
    .empty-state {
      padding: 22px 16px 18px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.45;
    }
    @media (max-width: 760px) {
      .controls-row {
        align-items: stretch;
        flex-direction: column-reverse;
      }
      .search-control {
        flex-basis: auto;
        width: 100%;
      }
      .list-header,
      .row {
        grid-template-columns: 78px minmax(150px, 1fr) 100px;
      }
      .list-header .folder-column,
      .folder-cell {
        display: none;
      }
      .list-header {
        top: 108px;
      }
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
      <div class="comparison-row">
        <div class="comparison-direction" id="comparisonDirection" aria-label="Comparison direction">
          <span class="comparison-ref" id="sourceLabel"></span>
          <span class="comparison-arrow" aria-hidden="true">→</span>
          <span class="comparison-ref" id="targetLabel"></span>
        </div>
        <div class="comparison-meta">
          <div class="result-count" id="resultCount"></div>
          <div id="selectionSummary" class="selection-summary"></div>
        </div>
      </div>
      <div class="controls-row">
        <div class="status-filters" id="statusFilters" aria-label="Filter by change status"></div>
        <div class="search-control">
          <input
            id="searchInput"
            class="search-input"
            type="text"
            placeholder="Filter files..."
            aria-label="Filter compare result files"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button id="clearSearchButton" class="icon-button" type="button" title="Clear filter" aria-label="Clear filter">×</button>
        </div>
      </div>
    </div>
    <div id="content"></div>
  </div>
  <div id="contextMenu" class="context-menu" hidden></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const clearSearchButton = document.getElementById('clearSearchButton');
    const comparisonDirection = document.getElementById('comparisonDirection');
    const sourceLabel = document.getElementById('sourceLabel');
    const targetLabel = document.getElementById('targetLabel');
    const resultCount = document.getElementById('resultCount');
    const statusFilters = document.getElementById('statusFilters');
    const selectionSummary = document.getElementById('selectionSummary');
    const content = document.getElementById('content');
    const contextMenu = document.getElementById('contextMenu');

    let currentState = {
      kind: 'empty',
      summary: '',
      sourceLabel: '',
      targetLabel: '',
      emptyMessage: 'Run a compare from the revision graph or Command Palette to keep the changed files here.',
      items: []
    };
    let activeStatusFilter = 'all';
    let selectedItemIds = [];
    let selectionAnchorItemId = undefined;
    let contextMenuItemIds = [];
    let lastPrimaryClickItemId = undefined;
    let lastPrimaryClickAt = 0;
    const doubleClickThresholdMs = 500;

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message && message.type === 'state') {
        currentState = message.state;
        searchInput.value = '';
        activeStatusFilter = 'all';
        selectedItemIds = currentState.items.length === 1 ? [currentState.items[0].id] : [];
        selectionAnchorItemId = selectedItemIds[0];
        resetDoubleClickTracking();
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

    statusFilters.addEventListener('click', (event) => {
      const filter = event.target?.closest?.('[data-status-filter]')?.getAttribute('data-status-filter');
      if (!filter) {
        return;
      }
      activeStatusFilter = filter;
      closeContextMenu();
      render();
    });

    content.addEventListener('click', (event) => {
      const actionButton = event.target?.closest?.('[data-row-action]');
      const action = actionButton?.getAttribute('data-row-action');
      const actionItemId = actionButton?.getAttribute('data-item-id');
      if (action && actionItemId) {
        event.preventDefault();
        event.stopPropagation();
        resetDoubleClickTracking();
        if (action === 'menu') {
          const item = getItemById(actionItemId);
          if (item) {
            selectedItemIds = [actionItemId];
            selectionAnchorItemId = actionItemId;
            render();
            openContextMenu([item], event.clientX, event.clientY);
          }
          return;
        }
        postSingleAction(action, actionItemId);
        return;
      }

      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        return;
      }

      const isPrimaryPlainClick =
        event.button === 0
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && !event.altKey;
      const now = Date.now();
      const isDoubleClick =
        isPrimaryPlainClick
        && lastPrimaryClickItemId === itemId
        && now - lastPrimaryClickAt <= doubleClickThresholdMs;

      lastPrimaryClickItemId = isPrimaryPlainClick ? itemId : undefined;
      lastPrimaryClickAt = isPrimaryPlainClick ? now : 0;

      closeContextMenu();
      updateSelection(itemId, event);
      render();
      focusItem(itemId);

      if (isDoubleClick) {
        resetDoubleClickTracking();
        postSingleAction('base', itemId);
      }
    });

    content.addEventListener('mousedown', (event) => {
      if (event.button !== 1) {
        return;
      }

      if (event.target?.closest?.('[data-item-id]')) {
        event.preventDefault();
      }
    });

    content.addEventListener('auxclick', (event) => {
      if (event.button !== 1) {
        return;
      }

      if (event.target?.closest?.('[data-item-id]')) {
        event.preventDefault();
        resetDoubleClickTracking();
      }
    });

    content.addEventListener('contextmenu', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        resetDoubleClickTracking();
        closeContextMenu();
        return;
      }

      event.preventDefault();
      resetDoubleClickTracking();
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

      sourceLabel.textContent = currentState.sourceLabel || 'Compare';
      sourceLabel.title = currentState.sourceLabel || '';
      targetLabel.textContent = currentState.targetLabel || '';
      targetLabel.title = currentState.targetLabel || '';
      comparisonDirection.dataset.empty = currentState.kind === 'empty' ? 'true' : 'false';
      resultCount.textContent = formatFileCount(totalCount);
      resultCount.title = currentState.summary || '';
      selectionSummary.textContent = formatSelectionSummary(totalCount, filteredItems.length, selectedCount);
      statusFilters.innerHTML = renderStatusFilters(currentState.items);
      clearSearchButton.disabled = filterQuery.length === 0;

      if (currentState.kind === 'empty') {
        sourceLabel.textContent = 'Compare Results';
        targetLabel.textContent = '';
        resultCount.textContent = '';
        selectionSummary.textContent = '';
        statusFilters.innerHTML = '';
        content.innerHTML = '<div class="empty-state">' + escapeHtml(currentState.emptyMessage || '') + '</div>';
        return;
      }

      if (filteredItems.length === 0) {
        content.innerHTML = '<div class="empty-state">No files match the active filters.</div>';
        return;
      }

      content.innerHTML = ''
        + '<div class="list-header" aria-hidden="true">'
        + '  <div>Status</div>'
        + '  <div>File</div>'
        + '  <div class="folder-column">Folder</div>'
        + '  <div class="actions-column">Actions</div>'
        + '</div>'
        + '<div class="list" role="listbox" aria-multiselectable="true">' + filteredItems.map((item) => {
        const isSelected = selectedItemIds.includes(item.id);
        const statusKey = normalizeStatus(item.status);
        const renameLabel = item.originalPath
          ? '<div class="rename-path" title="' + escapeHtml(item.originalPath + ' → ' + item.path) + '">' + escapeHtml(item.originalPath) + ' → ' + escapeHtml(item.path) + '</div>'
          : '';

        return ''
          + '<div'
          + ' class="row"'
          + ' data-item-id="' + escapeHtml(item.id) + '"'
          + ' data-selected="' + (isSelected ? 'true' : 'false') + '"'
          + ' tabindex="0"'
          + ' role="option"'
          + ' aria-haspopup="menu"'
          + ' aria-selected="' + (isSelected ? 'true' : 'false') + '"'
          + ' aria-label="' + escapeHtml(item.path + '. ' + item.status + '. Double-click to open diff. Press Shift+F10 or Enter for actions.') + '"'
          + '>'
          + '  <div class="status-cell">'
          + '    <span class="status-badge" data-status="' + statusKey + '"><span class="status-dot"></span>' + escapeHtml(item.status) + '</span>'
          + '  </div>'
          + '  <div class="file-cell">'
          + '    <div class="file-name" title="' + escapeHtml(item.path) + '">' + escapeHtml(item.name) + '</div>'
          + renameLabel
          + '  </div>'
          + '  <div class="folder-cell" title="' + escapeHtml(item.directory || '.') + '">' + escapeHtml(item.directory || '.') + '</div>'
          + '  <div class="actions-cell">'
          + '    <button class="row-action more" type="button" data-row-action="menu" data-item-id="' + escapeHtml(item.id) + '" title="More actions" aria-label="More actions">…</button>'
          + '  </div>'
          + '</div>';
      }).join('') + '</div>';
    }

    function getFilteredItems(query) {
      return filterItems(currentState.items, query, activeStatusFilter);
    }

    function getVisibleItemIds() {
      return getFilteredItems(normalizeQuery(searchInput.value)).map((item) => item.id);
    }

    function filterItems(items, query, statusFilter) {
      return items.filter((item) => {
        if (statusFilter !== 'all' && normalizeStatus(item.status) !== statusFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        const candidateValues = [
          item.path,
          item.originalPath,
          item.name,
          item.directory,
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

    function renderStatusFilters(items) {
      const counts = countItemsByStatus(items);
      const filters = [
        { key: 'all', label: 'All', count: items.length },
        { key: 'modified', label: 'Modified', count: counts.modified },
        { key: 'added', label: 'Added', count: counts.added },
        { key: 'deleted', label: 'Deleted', count: counts.deleted },
        { key: 'renamed', label: 'Renamed', count: counts.renamed },
        { key: 'changed', label: 'Changed', count: counts.changed }
      ];
      return filters
        .filter((filter) => filter.key === 'all' || filter.count > 0)
        .map((filter) => '<button class="status-filter" type="button" data-status-filter="' + filter.key + '" data-active="' + (activeStatusFilter === filter.key ? 'true' : 'false') + '">' + filter.label + ' ' + filter.count + '</button>')
        .join('');
    }

    function countItemsByStatus(items) {
      const counts = { modified: 0, added: 0, deleted: 0, renamed: 0, changed: 0 };
      for (const item of items) {
        counts[normalizeStatus(item.status)] += 1;
      }
      return counts;
    }

    function normalizeStatus(status) {
      const normalized = String(status || '').toLowerCase();
      return normalized === 'modified' || normalized === 'added' || normalized === 'deleted' || normalized === 'renamed'
        ? normalized
        : 'changed';
    }

    function formatFileCount(count) {
      return count === 1 ? '1 file changed' : count + ' files changed';
    }

    function formatSelectionSummary(totalCount, visibleCount, selectedCount) {
      if (selectedCount > 0) {
        return selectedCount === 1 ? '1 selected' : selectedCount + ' selected';
      }
      if (visibleCount !== totalCount) {
        return visibleCount + ' of ' + totalCount + ' visible';
      }
      return '';
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
        { action: 'base', label: 'Open Diff' }
      ];

      if (item.worktreeRef) {
        actions.push({ action: 'revert', label: 'Restore from ' + (item.worktreeLabel || item.worktreeRef) });
      } else if (item.leftRef || item.rightRef) {
        actions.push({ action: 'worktree', label: 'Compare with Worktree' });
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

    function resetDoubleClickTracking() {
      lastPrimaryClickItemId = undefined;
      lastPrimaryClickAt = 0;
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

import { createNonce } from './revisionGraph/webview/shared';

export interface CompareResultsWebviewItem {
  readonly id: string;
  readonly path: string;
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
    .row:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
      border-color: var(--vscode-focusBorder);
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
    let contextMenuItemId = undefined;

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message && message.type === 'state') {
        currentState = message.state;
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

    content.addEventListener('contextmenu', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
        closeContextMenu();
        return;
      }

      event.preventDefault();
      openContextMenu(itemId, event.clientX, event.clientY);
    });

    content.addEventListener('keydown', (event) => {
      const target = event.target?.closest?.('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (!itemId) {
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
      openContextMenuForElement(itemId, target);
    });

    contextMenu.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-menu-action]')?.getAttribute('data-menu-action');
      if (!action || !contextMenuItemId) {
        return;
      }

      const itemId = contextMenuItemId;
      closeContextMenu();
      postAction(action, itemId);
    });

    window.addEventListener('click', (event) => {
      if (!contextMenu.hidden && !event.target?.closest?.('#contextMenu')) {
        closeContextMenu();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
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
      const filteredItems = filterItems(currentState.items, filterQuery);
      const totalCount = currentState.items.length;
      const visibleCount = filteredItems.length;

      summary.textContent = currentState.summary;
      countBadge.textContent = String(visibleCount);
      countBadge.title = filterQuery
        ? visibleCount + ' of ' + totalCount + ' files shown'
        : visibleCount + ' files';
      clearSearchButton.disabled = filterQuery.length === 0;

      if (currentState.kind === 'empty') {
        content.innerHTML = '<div class="empty-state">' + escapeHtml(currentState.emptyMessage || '') + '</div>';
        return;
      }

      if (filteredItems.length === 0) {
        content.innerHTML = '<div class="empty-state">No files match <strong>' + escapeHtml(searchInput.value.trim()) + '</strong>.</div>';
        return;
      }

      content.innerHTML = '<div class="list">' + filteredItems.map((item) => {
        const secondaryLabel = item.worktreeRef
          ? (item.worktreeLabel || item.worktreeRef) + ' <-> worktree'
          : item.leftRef + ' <-> ' + item.rightRef;

        return ''
          + '<div'
          + ' class="row"'
          + ' data-item-id="' + escapeHtml(item.id) + '"'
          + ' tabindex="0"'
          + ' role="button"'
          + ' aria-haspopup="menu"'
          + ' aria-label="' + escapeHtml(item.path + '. ' + item.status + '. ' + secondaryLabel + '. Press Shift+F10 or Enter for actions.') + '"'
          + '>'
          + '  <div class="file-entry" data-item-id="' + escapeHtml(item.id) + '">'
          + '    <div class="file-path">' + escapeHtml(item.path) + '</div>'
          + '    <div class="file-meta">' + escapeHtml(item.status) + ' • ' + escapeHtml(secondaryLabel) + '</div>'
          + '  </div>'
          + '</div>';
      }).join('') + '</div>';
    }

    function filterItems(items, query) {
      if (!query) {
        return items;
      }

      return items.filter((item) => {
        const candidateValues = [
          item.path,
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

    function getMenuActions(item) {
      const actions = [
        { action: 'base', label: 'Compare with Base' }
      ];

      if (item.worktreeRef) {
        actions.push({ action: 'worktree', label: 'Compare with Worktree' });
        actions.push({ action: 'revert', label: 'Revert to This' });
      }

      return actions;
    }

    function openContextMenu(itemId, x, y) {
      const item = getItemById(itemId);
      if (!item) {
        closeContextMenu();
        return;
      }

      const actions = getMenuActions(item);
      if (actions.length === 0) {
        closeContextMenu();
        return;
      }

      contextMenuItemId = itemId;
      contextMenu.innerHTML = actions.map((entry) =>
        '<button class="context-menu-button" type="button" data-menu-action="' + escapeHtml(entry.action) + '">' + escapeHtml(entry.label) + '</button>'
      ).join('');
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

    function openContextMenuForElement(itemId, element) {
      const rect = element.getBoundingClientRect();
      openContextMenu(itemId, rect.left + Math.min(24, rect.width / 2), rect.top + Math.min(16, rect.height / 2));
    }

    function closeContextMenu() {
      contextMenu.hidden = true;
      contextMenuItemId = undefined;
      contextMenu.innerHTML = '';
    }

    function postAction(type, itemId) {
      vscode.postMessage({ type, itemId });
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

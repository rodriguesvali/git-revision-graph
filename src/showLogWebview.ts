import { createNonce } from './revisionGraph/webview/shared';

export function renderShowLogWebviewHtml(): string {
  const nonce = createNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Show Log</title>
  <style>
    :root {
      color-scheme: var(--vscode-color-scheme);
      --show-log-row-hover: color-mix(in srgb, var(--vscode-list-hoverBackground) 68%, transparent);
      --show-log-row-active: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 22%, transparent);
    }
    * { box-sizing: border-box; }
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
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 12px 11px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--vscode-sideBar-background) 96%, transparent),
          var(--vscode-sideBar-background)
        );
    }
    .summary {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .loading-chip {
      display: none;
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      color: var(--vscode-badge-foreground);
      background: var(--vscode-badge-background);
    }
    .loading-chip[data-visible="true"] {
      display: inline-flex;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 6px 0 18px;
    }
    .status-card,
    .empty-state {
      margin: 8px 12px 0;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 72%, transparent);
      border-radius: 10px;
      color: var(--vscode-descriptionForeground);
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 55%, transparent);
      line-height: 1.45;
    }
    .status-card.error {
      color: var(--vscode-errorForeground);
      border-color: color-mix(in srgb, var(--vscode-errorForeground) 45%, transparent);
    }
    .commit-list {
      position: relative;
    }
    .commit-entry {
      position: relative;
    }
    .commit-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0;
      margin: 0;
      padding: 0 8px 0 0;
      border-top: 1px solid color-mix(in srgb, var(--vscode-panel-border) 32%, transparent);
      cursor: pointer;
      user-select: none;
      min-height: 28px;
    }
    .commit-row:first-of-type {
      border-top: 0;
    }
    .commit-row:hover {
      background: color-mix(in srgb, var(--show-log-row-hover) 70%, transparent);
    }
    .commit-row[data-expanded="true"] {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--show-log-row-active) 94%, transparent) 0 2px,
          transparent 2px 100%
        ),
        color-mix(in srgb, var(--show-log-row-active) 18%, transparent);
    }
    .commit-row:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--vscode-list-focusOutline) 10%, var(--show-log-row-hover));
    }
    .commit-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
      justify-content: center;
      padding: 4px 0 4px;
    }
    .commit-headline {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      white-space: nowrap;
    }
    .commit-subject {
      flex: 1 1 0;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12.5px;
      line-height: 1.2;
      font-weight: 500;
    }
    .commit-hash {
      flex-shrink: 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--vscode-descriptionForeground);
      opacity: 0.86;
    }
    .commit-author-inline {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.82;
    }
    .commit-secondary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .refs {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .ref-badge {
      display: inline-flex;
      align-items: center;
      max-width: 180px;
      padding: 0 5px 1px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--vscode-badge-background) 16%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 8px;
      font-weight: 600;
      color: var(--vscode-badge-foreground);
      background: color-mix(in srgb, var(--vscode-badge-background) 22%, transparent);
    }
    .commit-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 10px;
      line-height: 1.2;
      color: var(--vscode-descriptionForeground);
      opacity: 0.68;
    }
    .commit-files {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0 12px 4px 12px;
      padding: 0 0 0 12px;
      border-left: 1px solid color-mix(in srgb, var(--vscode-panel-border) 42%, transparent);
    }
    .file-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 8px 4px 0;
      border-radius: 6px;
      cursor: context-menu;
    }
    .file-row:hover,
    .file-row:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 70%, transparent);
    }
    .file-path {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 400;
    }
    .file-status {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.9;
    }
    .load-more {
      margin: 10px 12px 0;
      padding: 8px 10px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 8px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }
    .load-more:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }
    .load-more:disabled {
      cursor: default;
      opacity: 0.7;
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
    .context-menu[hidden] { display: none; }
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
      <div class="summary" id="summary"></div>
      <div class="loading-chip" id="loadingChip" data-visible="false">Loading</div>
    </div>
    <div class="content" id="content"></div>
  </div>
  <div class="context-menu" id="contextMenu" hidden></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentState = null;
    let contextMenuState = null;
    const summary = document.getElementById('summary');
    const content = document.getElementById('content');
    const loadingChip = document.getElementById('loadingChip');
    const contextMenu = document.getElementById('contextMenu');

    function render() {
      if (!summary || !content || !loadingChip) {
        return;
      }
      const state = currentState || {
        kind: 'hidden',
        loading: false,
        loadingMore: false,
        summary: '',
        emptyMessage: 'Use Show Log from the graph context menu to load a commit stack or range here.',
        errorMessage: undefined,
        commits: [],
        hasMore: false
      };

      summary.textContent = state.summary || 'Show Log';
      loadingChip.dataset.visible = state.loading || state.loadingMore ? 'true' : 'false';
      loadingChip.textContent = state.loadingMore ? 'Loading More' : 'Loading';

      const sections = [];
      if (state.errorMessage) {
        sections.push('<div class="status-card error">' + escapeHtml(state.errorMessage) + '</div>');
      }
      if (state.commits.length === 0 && state.emptyMessage) {
        sections.push('<div class="empty-state">' + escapeHtml(state.emptyMessage) + '</div>');
      } else {
        sections.push(renderCommitList(state.commits));
      }
      if (state.hasMore) {
        sections.push(
          '<button class="load-more" id="loadMoreButton" type="button"' + (state.loadingMore ? ' disabled' : '') + '>'
          + (state.loadingMore ? 'Loading more commits...' : 'Load More')
          + '</button>'
        );
      }
      content.innerHTML = sections.join('');
    }

    function renderCommitList(commits) {
      return ''
        + '<div class="commit-list">'
        + commits.map((commit) => ''
          + '<div class="commit-entry">'
          + renderCommit(commit)
          + (commit.expanded ? renderCommitFiles(commit) : '')
          + '</div>'
        ).join('')
        + '</div>';
    }

    function renderCommit(commit) {
      return ''
        + '<div class="commit-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-expanded="' + (commit.expanded ? 'true' : 'false') + '">'
        + '  <div class="commit-main">'
        + '    <div class="commit-headline">'
        + '      <span class="commit-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + '      <span class="commit-subject">' + escapeHtml(commit.subject) + '</span>'
        + '      <span class="commit-author-inline">' + escapeHtml(commit.author) + '</span>'
        + '    </div>'
        + ((commit.refs.length > 0 || commit.date || commit.stats)
          ? '    <div class="commit-secondary">'
            + (commit.refs.length > 0
              ? '      <div class="refs">' + commit.refs.map((ref) => '<span class="ref-badge">' + escapeHtml(ref) + '</span>').join('') + '</div>'
              : '')
            + '      <div class="commit-meta">'
            + (commit.date ? '        <span>' + escapeHtml(commit.date) + '</span>' : '')
            + (commit.stats ? '        <span>' + escapeHtml(commit.stats) + '</span>' : '')
            + '      </div>'
            + '    </div>'
          : '')
        + '  </div>'
        + '</div>';
    }

    function renderCommitFiles(commit) {
      if (commit.loadingChanges) {
        return '<div class="commit-files"><div class="status-card">Loading changed files...</div></div>';
      }
      if (commit.changeError) {
        return '<div class="commit-files"><div class="status-card error">' + escapeHtml(commit.changeError) + '</div></div>';
      }
      if (!commit.changes.length) {
        return '<div class="commit-files"><div class="status-card">No changed files found for this commit.</div></div>';
      }
      return ''
        + '<div class="commit-files">'
        + commit.changes.map((change) => ''
          + '<div class="file-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-change-id="' + escapeHtml(change.id) + '" aria-haspopup="menu" aria-label="' + escapeHtml(change.path + '. ' + change.status + '. Press Shift+F10 or Enter for actions.') + '">'
          + '  <span class="file-path">' + escapeHtml(change.path) + '</span>'
          + '  <span class="file-status">' + escapeHtml(change.status) + '</span>'
          + '</div>'
        ).join('')
        + '</div>';
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function handleContextMenu(commitHash, clientX, clientY) {
      contextMenuState = { kind: 'commit', commitHash };
      if (!contextMenu) {
        return;
      }
      contextMenu.innerHTML = '<button class="context-menu-button" type="button" data-menu-action="openCommitDetails">Open Commit Details</button>';
      showContextMenuAt(clientX, clientY);
    }

    function openFileContextMenu(commitHash, changeId, clientX, clientY) {
      contextMenuState = { kind: 'file', commitHash, changeId };
      if (!contextMenu) {
        return;
      }
      contextMenu.innerHTML = ''
        + '<button class="context-menu-button" type="button" data-menu-action="openFile">Open Diff</button>'
        + '<div class="context-menu-group">'
        + '  <div class="context-menu-parent" tabindex="0" role="button" aria-haspopup="menu" aria-label="Copy to Clipboard">'
        + '    <span>Copy to Clipboard</span>'
        + '    <span class="context-menu-chevron">›</span>'
        + '  </div>'
        + '  <div class="context-submenu" role="menu" aria-label="Copy to Clipboard">'
        + '    <button class="context-menu-button" type="button" data-menu-action="copyFileName">File Name</button>'
        + '    <button class="context-menu-button" type="button" data-menu-action="copyFullPath">Full Path</button>'
        + '  </div>'
        + '</div>';
      showContextMenuAt(clientX, clientY);
    }

    function openFileContextMenuForElement(commitHash, changeId, element) {
      const rect = element.getBoundingClientRect();
      openFileContextMenu(
        commitHash,
        changeId,
        rect.left + Math.min(24, rect.width / 2),
        rect.top + Math.min(16, rect.height / 2)
      );
    }

    function showContextMenuAt(clientX, clientY) {
      contextMenu.hidden = false;
      contextMenu.style.left = '0px';
      contextMenu.style.top = '0px';
      const rect = contextMenu.getBoundingClientRect();
      const margin = 8;
      const left = Math.min(clientX, window.innerWidth - rect.width - margin);
      const top = Math.min(clientY, window.innerHeight - rect.height - margin);
      contextMenu.style.left = Math.max(margin, left) + 'px';
      contextMenu.style.top = Math.max(margin, top) + 'px';
      contextMenu.querySelector('.context-menu-button')?.focus();
    }

    function closeContextMenu() {
      if (!contextMenu) {
        return;
      }
      contextMenuState = null;
      contextMenu.hidden = true;
      contextMenu.innerHTML = '';
    }

    content.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const loadMoreButton = target.closest('#loadMoreButton');
      if (loadMoreButton) {
        vscode.postMessage({ type: 'loadMore' });
        return;
      }
      const fileRow = target.closest('[data-change-id]');
      if (fileRow instanceof HTMLElement) {
        closeContextMenu();
        fileRow.focus();
        return;
      }
      const commitRow = target.closest('[data-commit-hash]');
      if (commitRow instanceof HTMLElement) {
        vscode.postMessage({ type: 'toggleCommit', commitHash: commitRow.getAttribute('data-commit-hash') || '' });
      }
    });

    content.addEventListener('keydown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && target.matches('[data-commit-hash]')) {
        event.preventDefault();
        vscode.postMessage({ type: 'toggleCommit', commitHash: target.getAttribute('data-commit-hash') || '' });
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && target.matches('[data-change-id]')) {
        event.preventDefault();
        openFileContextMenuForElement(
          target.getAttribute('data-commit-hash') || '',
          target.getAttribute('data-change-id') || '',
          target
        );
        return;
      }
      if (target.matches('[data-change-id]') && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
        event.preventDefault();
        openFileContextMenuForElement(
          target.getAttribute('data-commit-hash') || '',
          target.getAttribute('data-change-id') || '',
          target
        );
        return;
      }
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        const commitRow = target.closest('[data-commit-hash]');
        if (commitRow instanceof HTMLElement) {
          event.preventDefault();
          const rect = commitRow.getBoundingClientRect();
          handleContextMenu(commitRow.getAttribute('data-commit-hash') || '', rect.left + 24, rect.top + 18);
        }
      }
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    });

    content.addEventListener('contextmenu', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const fileRow = target.closest('[data-change-id]');
      if (fileRow instanceof HTMLElement) {
        event.preventDefault();
        openFileContextMenu(
          fileRow.getAttribute('data-commit-hash') || '',
          fileRow.getAttribute('data-change-id') || '',
          event.clientX,
          event.clientY
        );
        return;
      }
      const commitRow = target.closest('[data-commit-hash]');
      if (!(commitRow instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      handleContextMenu(commitRow.getAttribute('data-commit-hash') || '', event.clientX, event.clientY);
    });

    contextMenu.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-menu-action]')?.getAttribute('data-menu-action');
      if (!action || !contextMenuState) {
        return;
      }

      const state = contextMenuState;
      closeContextMenu();

      if (state.kind === 'commit') {
        if (action === 'openCommitDetails') {
          vscode.postMessage({ type: 'openCommitDetails', commitHash: state.commitHash });
        }
        return;
      }

      if (action === 'openFile' || action === 'copyFileName' || action === 'copyFullPath') {
        vscode.postMessage({
          type: action,
          commitHash: state.commitHash,
          changeId: state.changeId
        });
      }
    });

    document.addEventListener('click', (event) => {
      if (!contextMenu.hidden && !event.target?.closest?.('#contextMenu')) {
        closeContextMenu();
      }
    });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'state') {
        currentState = event.data.state;
        render();
      }
    });

    vscode.postMessage({ type: 'ready' });
    render();
  </script>
</body>
</html>`;
}

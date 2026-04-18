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
    :root { color-scheme: var(--vscode-color-scheme); }
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
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      background: var(--vscode-sideBar-background);
    }
    .summary {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
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
      padding: 8px 0 16px;
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
    .commit-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
      padding: 3px 12px 3px 8px;
      cursor: pointer;
      user-select: none;
    }
    .commit-row:hover {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 75%, transparent);
    }
    .commit-row[data-expanded="true"] {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 26%, transparent);
    }
    .commit-row:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--vscode-list-focusOutline) 18%, transparent);
    }
    .commit-graph {
      width: 56px;
      min-height: 28px;
      overflow: visible;
    }
    .commit-main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      justify-content: center;
      padding: 3px 0;
    }
    .commit-subject-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .commit-subject {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
    }
    .commit-hash {
      flex-shrink: 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .refs {
      display: inline-flex;
      gap: 4px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .ref-badge {
      display: inline-flex;
      align-items: center;
      max-width: 180px;
      padding: 1px 6px;
      border-radius: 999px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 700;
      color: var(--vscode-badge-foreground);
      background: color-mix(in srgb, var(--vscode-badge-background) 78%, transparent);
    }
    .commit-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .commit-files {
      display: flex;
      flex-direction: column;
      gap: 1px;
      margin: 0 12px 4px 56px;
      padding: 4px 0 0 20px;
      border-left: 1px solid color-mix(in srgb, var(--vscode-panel-border) 70%, transparent);
    }
    .file-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      cursor: pointer;
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
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      font-weight: 600;
    }
    .file-status {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
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
    .context-button {
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
    .context-button:hover,
    .context-button:focus-visible {
      outline: none;
      background: var(--vscode-list-hoverBackground);
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
    let contextCommitHash = null;
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
        for (const commit of state.commits) {
          sections.push(renderCommit(commit));
          if (commit.expanded) {
            sections.push(renderCommitFiles(commit));
          }
        }
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

    function renderCommit(commit) {
      return ''
        + '<div class="commit-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-expanded="' + (commit.expanded ? 'true' : 'false') + '">'
        + '  <svg class="commit-graph" viewBox="0 0 56 28" aria-hidden="true">' + renderTopology(commit.topology) + '</svg>'
        + '  <div class="commit-main">'
        + '    <div class="commit-subject-row">'
        + '      <span class="commit-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + '      <span class="commit-subject">' + escapeHtml(commit.subject) + '</span>'
        + (commit.refs.length > 0
          ? '      <span class="refs">' + commit.refs.map((ref) => '<span class="ref-badge">' + escapeHtml(ref) + '</span>').join('') + '</span>'
          : '')
        + '    </div>'
        + '    <div class="commit-meta">'
        + '      <span>' + escapeHtml(commit.author) + '</span>'
        + '      <span>' + escapeHtml(commit.date) + '</span>'
        + (commit.stats ? '      <span>' + escapeHtml(commit.stats) + '</span>' : '')
        + '    </div>'
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
          + '<div class="file-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-change-id="' + escapeHtml(change.id) + '">'
          + '  <span class="file-path">' + escapeHtml(change.path) + '</span>'
          + '  <span class="file-status">' + escapeHtml(change.status) + '</span>'
          + '</div>'
        ).join('')
        + '</div>';
    }

    function renderTopology(topology) {
      const laneGap = 12;
      const xOffset = 10;
      const topY = 0;
      const centerY = 14;
      const bottomY = 28;
      const activeLanes = new Set([...(topology.activeBefore || []), ...(topology.activeAfter || []), topology.lane]);
      const pieces = [];
      for (const lane of activeLanes) {
        const x = xOffset + lane * laneGap;
        const hasTop = (topology.activeBefore || []).includes(lane);
        const hasBottom = (topology.activeAfter || []).includes(lane);
        if (hasTop) {
          pieces.push('<line x1="' + x + '" y1="' + topY + '" x2="' + x + '" y2="' + centerY + '" stroke="var(--vscode-descriptionForeground)" stroke-width="1.1" opacity="0.55" />');
        }
        if (hasBottom) {
          pieces.push('<line x1="' + x + '" y1="' + centerY + '" x2="' + x + '" y2="' + bottomY + '" stroke="var(--vscode-descriptionForeground)" stroke-width="1.1" opacity="0.55" />');
        }
      }
      const commitX = xOffset + topology.lane * laneGap;
      for (const parentLane of topology.parentLanes || []) {
        if (parentLane === topology.lane) {
          continue;
        }
        const parentX = xOffset + parentLane * laneGap;
        pieces.push('<path d="M ' + commitX + ' 14 C ' + commitX + ' 18, ' + parentX + ' 18, ' + parentX + ' 22" fill="none" stroke="var(--vscode-descriptionForeground)" stroke-width="1.1" opacity="0.65" />');
      }
      pieces.push('<circle cx="' + commitX + '" cy="' + centerY + '" r="4" fill="var(--vscode-list-activeSelectionBackground, var(--vscode-focusBorder))" stroke="var(--vscode-sideBar-background)" stroke-width="1.4" />');
      return pieces.join('');
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
      contextCommitHash = commitHash;
      if (!contextMenu) {
        return;
      }
      contextMenu.innerHTML = '<button class="context-button" type="button" id="openCommitDetailsButton">Open Commit Details</button>';
      contextMenu.hidden = false;
      contextMenu.style.left = clientX + 'px';
      contextMenu.style.top = clientY + 'px';
    }

    function closeContextMenu() {
      if (!contextMenu) {
        return;
      }
      contextCommitHash = null;
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
        vscode.postMessage({
          type: 'openFile',
          commitHash: fileRow.getAttribute('data-commit-hash') || '',
          changeId: fileRow.getAttribute('data-change-id') || ''
        });
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
        vscode.postMessage({
          type: 'openFile',
          commitHash: target.getAttribute('data-commit-hash') || '',
          changeId: target.getAttribute('data-change-id') || ''
        });
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
      const commitRow = target.closest('[data-commit-hash]');
      if (!(commitRow instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      handleContextMenu(commitRow.getAttribute('data-commit-hash') || '', event.clientX, event.clientY);
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && contextMenu && contextMenu.contains(target)) {
        if (target.id === 'openCommitDetailsButton' && contextCommitHash) {
          vscode.postMessage({ type: 'openCommitDetails', commitHash: contextCommitHash });
          closeContextMenu();
        }
        return;
      }
      closeContextMenu();
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

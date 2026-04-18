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
      --show-log-row-active: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 18%, transparent);
      --show-log-graph-width: 64px;
      --show-log-author-width: 132px;
      --show-log-date-width: 84px;
      --show-log-resizer-hit-width: 8px;
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
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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
    .toolbar-main {
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex: 1 1 auto;
    }
    .toolbar-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      user-select: none;
      white-space: nowrap;
    }
    .toolbar-toggle[hidden] {
      display: none;
    }
    .toolbar-toggle input {
      margin: 0;
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
      padding: 0 0 14px;
    }
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
    .status-card.error {
      color: var(--vscode-errorForeground);
      border-color: color-mix(in srgb, var(--vscode-errorForeground) 45%, transparent);
    }
    .table-header {
      position: sticky;
      top: 40px;
      z-index: 2;
      display: grid;
      grid-template-columns: var(--show-log-graph-width) minmax(0, 1fr) var(--show-log-author-width) var(--show-log-date-width);
      gap: 0;
      padding: 5px 12px 4px;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 42%, transparent);
      color: var(--vscode-descriptionForeground);
      background: color-mix(in srgb, var(--vscode-sideBar-background) 94%, transparent);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.82;
    }
    .header-cell {
      position: relative;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .header-cell.graph {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 0;
      overflow: visible;
    }
    .graph-header-label {
      padding-left: 0;
    }
    .graph-resizer {
      position: absolute;
      top: -4px;
      right: calc(var(--show-log-resizer-hit-width) * -0.5);
      width: var(--show-log-resizer-hit-width);
      height: calc(100% + 8px);
      cursor: col-resize;
      touch-action: none;
    }
    .graph-resizer::before {
      content: '';
      position: absolute;
      top: 3px;
      bottom: 3px;
      left: 50%;
      width: 1px;
      background: color-mix(in srgb, var(--vscode-panel-border) 72%, transparent);
      transform: translateX(-50%);
      opacity: 0.55;
      transition: opacity 90ms ease, background 90ms ease;
    }
    .graph-resizer:hover::before,
    .graph-resizer:focus-visible::before,
    body[data-resizing-graph="true"] .graph-resizer::before {
      opacity: 0.9;
      background: var(--vscode-focusBorder);
    }
    .graph-resizer:focus-visible {
      outline: none;
    }
    .commit-list {
      display: flex;
      flex-direction: column;
    }
    .commit-entry {
      position: relative;
    }
    .commit-entry[data-selected="true"] {
      background: color-mix(in srgb, var(--show-log-row-active) 22%, transparent);
    }
    .commit-row {
      position: relative;
      display: grid;
      grid-template-columns: var(--show-log-graph-width) minmax(0, 1fr) var(--show-log-author-width) var(--show-log-date-width);
      grid-template-areas:
        'graph subject author date'
        'graph files files files';
      gap: 0;
      align-items: stretch;
      min-height: 30px;
      padding: 0 12px;
      cursor: pointer;
      user-select: none;
    }
    .commit-entry + .commit-entry .commit-row::before {
      content: '';
      position: absolute;
      top: 0;
      left: calc(12px + var(--show-log-graph-width));
      right: 0;
      height: 1px;
      background: color-mix(in srgb, var(--vscode-panel-border) 32%, transparent);
    }
    .commit-row:hover {
      background: color-mix(in srgb, var(--show-log-row-hover) 70%, transparent);
    }
    .commit-row[data-expanded="true"] {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--show-log-row-active) 96%, transparent) 0 2px,
          transparent 2px 100%
        ),
        color-mix(in srgb, var(--show-log-row-active) 16%, transparent);
    }
    .commit-row:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--vscode-list-focusOutline) 10%, var(--show-log-row-hover));
    }
    .graph-cell {
      grid-area: graph;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }
    .graph-stack {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 30px;
    }
    .graph-main {
      display: flex;
      min-height: 30px;
      overflow: hidden;
    }
    .graph-continuation {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .graph-continuation-row {
      display: flex;
      min-height: 24px;
      overflow: hidden;
    }
    .graph-continuation-row.status {
      min-height: 34px;
    }
    .graph-svg {
      flex: none;
      width: auto;
      height: 100%;
      min-height: 30px;
      display: block;
      overflow: visible;
    }
    .graph-line {
      fill: none;
      stroke-width: 1.3;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.88;
    }
    .graph-node-ring {
      fill: var(--vscode-sideBar-background);
      stroke-width: 1.35;
    }
    .graph-node-core {
      fill: var(--vscode-sideBar-background);
      opacity: 0.92;
    }
    .subject-cell,
    .author-cell,
    .date-cell {
      min-width: 0;
      display: flex;
      align-items: center;
    }
    .subject-cell {
      grid-area: subject;
      padding: 3px 12px 3px 0;
    }
    .author-cell,
    .date-cell {
      padding: 3px 10px 3px 0;
      color: var(--vscode-descriptionForeground);
      font-size: 10.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.82;
    }
    .author-cell {
      grid-area: author;
      justify-content: flex-start;
    }
    .date-cell {
      grid-area: date;
      justify-content: flex-end;
      font-variant-numeric: tabular-nums;
      opacity: 0.72;
    }
    .subject-stack {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .subject-line {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      white-space: nowrap;
    }
    .commit-hash {
      flex-shrink: 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9.5px;
      letter-spacing: 0.03em;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
    }
    .commit-subject {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      line-height: 1.2;
      font-weight: 480;
    }
    .subject-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      flex-wrap: wrap;
      color: var(--vscode-descriptionForeground);
      font-size: 9.5px;
      line-height: 1.15;
      opacity: 0.68;
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
      max-width: 144px;
      padding: 0 5px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--vscode-badge-background) 16%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 7.5px;
      font-weight: 600;
      color: var(--vscode-badge-foreground);
      background: color-mix(in srgb, var(--vscode-badge-background) 18%, transparent);
    }
    .stats {
      white-space: nowrap;
      opacity: 0.88;
    }
    .commit-files {
      grid-area: files;
      min-width: 0;
    }
    .commit-files-graph {
      height: 100%;
      overflow: hidden;
    }
    .commit-files-graph .graph-svg {
      height: 100%;
      min-height: 34px;
      opacity: 0.9;
    }
    .graph-continuation-row .commit-files-graph .graph-svg {
      min-height: 24px;
    }
    .graph-continuation-row.status .commit-files-graph .graph-svg {
      min-height: 34px;
    }
    .commit-files-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0 0 5px 12px;
      border-left: 1px solid color-mix(in srgb, var(--vscode-panel-border) 42%, transparent);
    }
    .commit-files-list .status-card {
      margin: 0;
    }
    .file-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 24px;
      padding: 3px 8px 3px 0;
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
      font-size: 10.5px;
      font-weight: 400;
    }
    .file-status {
      flex-shrink: 0;
      font-size: 10.5px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.9;
    }
    .load-more {
      margin: 8px 12px 0;
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
      <div class="toolbar-main">
        <div class="summary" id="summary"></div>
        <label class="toolbar-toggle" id="showAllBranchesControl" hidden>
          <input type="checkbox" id="showAllBranchesToggle" />
          <span>Show All Branches</span>
        </label>
      </div>
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
    const showAllBranchesControl = document.getElementById('showAllBranchesControl');
    const showAllBranchesToggle = document.getElementById('showAllBranchesToggle');
    const LANE_COLORS = ['#5bbaf9', '#d87cff', '#ffd24d', '#52d273', '#ff7db8', '#ff9b5e', '#8fd6c9'];
    const GRAPH_WIDTH_KEY = 'showLogGraphWidth';
    const MIN_GRAPH_WIDTH = 42;
    const GRAPH_LANE_SPACING = 10;
    const GRAPH_LEFT_INSET = 8;
    const GRAPH_RIGHT_PADDING = 6;
    const persistedUiState = vscode.getState() || {};
    let graphWidth = normalizeGraphWidth(persistedUiState[GRAPH_WIDTH_KEY]);
    let resizeState = null;
    let selectedCommitHash = persistedUiState.selectedCommitHash || null;

    applyGraphColumnWidth(graphWidth);

    function render() {
      if (!summary || !content || !loadingChip) {
        return;
      }
      const state = currentState || {
        kind: 'hidden',
        loading: false,
        loadingMore: false,
        summary: '',
        showAllBranches: false,
        canToggleAllBranches: false,
        emptyMessage: 'Use Show Log from the graph context menu to load a commit stack or range here.',
        errorMessage: undefined,
        commits: [],
        hasMore: false
      };

      summary.textContent = state.summary || 'Show Log';
      loadingChip.dataset.visible = state.loading || state.loadingMore ? 'true' : 'false';
      loadingChip.textContent = state.loadingMore ? 'Loading More' : 'Loading';
      if (showAllBranchesControl && showAllBranchesToggle instanceof HTMLInputElement) {
        showAllBranchesControl.hidden = !state.canToggleAllBranches;
        showAllBranchesToggle.checked = !!state.showAllBranches;
        showAllBranchesToggle.disabled = !!state.loading || !!state.loadingMore;
      }

      const sections = [];
      if (state.errorMessage) {
        sections.push('<div class="status-card error">' + escapeHtml(state.errorMessage) + '</div>');
      }
      if (state.commits.length === 0 && state.emptyMessage) {
        sections.push('<div class="empty-state">' + escapeHtml(state.emptyMessage) + '</div>');
      } else {
        sections.push(renderTableHeader());
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

    function renderTableHeader() {
      return ''
        + '<div class="table-header">'
        + '  <div class="header-cell graph">'
        + '    <span class="graph-header-label">Graph</span>'
        + '    <div class="graph-resizer" id="graphResizer" role="separator" tabindex="0" aria-label="Resize graph column" aria-orientation="vertical"></div>'
        + '  </div>'
        + '  <div class="header-cell">Message</div>'
        + '  <div class="header-cell">Author</div>'
        + '  <div class="header-cell">Date</div>'
        + '</div>';
    }

    function renderCommitList(commits) {
      return ''
        + '<div class="commit-list">'
        + commits.map((commit) => ''
          + '<div class="commit-entry" data-selected="' + (selectedCommitHash === commit.hash ? 'true' : 'false') + '">'
          + renderCommit(commit)
          + '</div>'
        ).join('')
        + '</div>';
    }

    function renderCommit(commit) {
      return ''
        + '<div class="commit-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-expanded="' + (commit.expanded ? 'true' : 'false') + '">'
        + '  <div class="graph-cell">'
        + '    <div class="graph-stack">'
        + '      <div class="graph-main">' + renderTopology(commit.topology) + '</div>'
        + (commit.expanded
          ? '      <div class="graph-continuation">' + renderContinuationRows(commit) + '</div>'
          : '')
        + '    </div>'
        + '  </div>'
        + '  <div class="subject-cell">'
        + '    <div class="subject-stack">'
        + '      <div class="subject-line">'
        + '        <span class="commit-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + '        <span class="commit-subject">' + escapeHtml(commit.subject) + '</span>'
        + '      </div>'
        + ((commit.refs.length > 0 || commit.stats)
          ? '      <div class="subject-meta">'
            + (commit.refs.length > 0
              ? '        <div class="refs">' + commit.refs.map((ref) => '<span class="ref-badge">' + escapeHtml(ref) + '</span>').join('') + '</div>'
              : '')
            + (commit.stats ? '        <span class="stats">' + escapeHtml(commit.stats) + '</span>' : '')
            + '      </div>'
          : '')
        + '    </div>'
        + '  </div>'
        + '  <div class="author-cell">' + escapeHtml(commit.author) + '</div>'
        + '  <div class="date-cell">' + escapeHtml(commit.date) + '</div>'
        + (commit.expanded ? renderCommitFiles(commit) : '')
        + '</div>';
    }

    function renderTopology(topology) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const height = 34;
      const centerY = 15;
      const topY = -2;
      const bottomY = 32;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        if (topology.mergeStartLanes.includes(lane)) {
          continue;
        }
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + topY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      for (const lane of topology.secondaryParentLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const startX = laneX(topology.nodeLane, laneSpacing);
        const endX = laneX(lane, laneSpacing);
        const controlY = centerY + 4;
        const controlX = startX + ((endX - startX) * 0.58);
        lineParts.push(
          '<path class="graph-line" d="M ' + startX + ' ' + centerY
          + ' C ' + startX + ' ' + controlY + ', ' + controlX + ' ' + controlY + ', ' + endX + ' ' + bottomY
          + '" stroke="' + color + '" />'
        );
      }

      const nodeColor = getLaneColor(topology.colorByLane[topology.nodeLane]);
      const nodeX = laneX(topology.nodeLane, laneSpacing);
      lineParts.push('<circle class="graph-node-ring" cx="' + nodeX + '" cy="' + centerY + '" r="3.65" stroke="' + nodeColor + '" />');
      lineParts.push('<circle class="graph-node-core" cx="' + nodeX + '" cy="' + centerY + '" r="1.45" fill="' + nodeColor + '" />');

      return '<svg class="graph-svg" width="' + width + '" viewBox="0 -2 ' + width + ' ' + height + '" aria-hidden="true">' + lineParts.join('') + '</svg>';
    }

    function renderContinuationTopology(topology) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const height = 28;
      const topY = -2;
      const bottomY = 26;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + topY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      return '<svg class="graph-svg" width="' + width + '" viewBox="0 -2 ' + width + ' ' + height + '" aria-hidden="true">' + lineParts.join('') + '</svg>';
    }

    function renderContinuationRows(commit) {
      if (commit.loadingChanges || commit.changeError || !commit.changes.length) {
        return '<div class="graph-continuation-row status"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>';
      }

      return commit.changes.map(() =>
        '<div class="graph-continuation-row"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>'
      ).join('');
    }

    function laneX(lane, laneSpacing) {
      return GRAPH_LEFT_INSET + lane * laneSpacing;
    }

    function getGraphContentWidth(laneCount, laneSpacing) {
      return GRAPH_LEFT_INSET + GRAPH_RIGHT_PADDING + (Math.max(laneCount - 1, 0) * laneSpacing) + 8;
    }

    function getLaneColor(colorIndex) {
      return LANE_COLORS[Math.abs(colorIndex || 0) % LANE_COLORS.length];
    }

    function normalizeGraphWidth(value) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return 64;
      }
      return Math.max(MIN_GRAPH_WIDTH, Math.round(numericValue));
    }

    function applyGraphColumnWidth(width) {
      graphWidth = normalizeGraphWidth(width);
      document.documentElement.style.setProperty('--show-log-graph-width', graphWidth + 'px');
    }

    function persistGraphColumnWidth() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        [GRAPH_WIDTH_KEY]: graphWidth,
        selectedCommitHash
      });
    }

    function persistUiState() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        [GRAPH_WIDTH_KEY]: graphWidth,
        selectedCommitHash
      });
    }

    function startGraphResize(clientX) {
      resizeState = {
        startX: clientX,
        startWidth: graphWidth
      };
      document.body.dataset.resizingGraph = 'true';
    }

    function updateGraphResize(clientX) {
      if (!resizeState) {
        return;
      }
      applyGraphColumnWidth(resizeState.startWidth + (clientX - resizeState.startX));
    }

    function stopGraphResize() {
      if (!resizeState) {
        return;
      }
      resizeState = null;
      delete document.body.dataset.resizingGraph;
      persistGraphColumnWidth();
    }

    function renderCommitFiles(commit) {
      if (commit.loadingChanges) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card">Loading changed files...</div></div></div>';
      }
      if (commit.changeError) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card error">' + escapeHtml(commit.changeError) + '</div></div></div>';
      }
      if (!commit.changes.length) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card">No changed files found for this commit.</div></div></div>';
      }
      return ''
        + '<div class="commit-files">'
        + '  <div class="commit-files-list">'
        + commit.changes.map((change) => ''
          + '    <div class="file-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-change-id="' + escapeHtml(change.id) + '" aria-haspopup="menu" aria-label="' + escapeHtml(change.path + '. ' + change.status + '. Press Shift+F10 or Enter for actions.') + '">'
          + '      <span class="file-path">' + escapeHtml(change.path) + '</span>'
          + '      <span class="file-status">' + escapeHtml(change.status) + '</span>'
          + '    </div>'
        ).join('')
        + '  </div>'
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
      if (target.closest('#graphResizer')) {
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
        selectedCommitHash = commitRow.getAttribute('data-commit-hash') || null;
        persistUiState();
        render();
        vscode.postMessage({ type: 'toggleCommit', commitHash: commitRow.getAttribute('data-commit-hash') || '' });
      }
    });

    content.addEventListener('keydown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.id === 'graphResizer') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          applyGraphColumnWidth(graphWidth - 8);
          persistGraphColumnWidth();
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          applyGraphColumnWidth(graphWidth + 8);
          persistGraphColumnWidth();
          return;
        }
      }
      if ((event.key === 'Enter' || event.key === ' ') && target.matches('[data-commit-hash]')) {
        event.preventDefault();
        selectedCommitHash = target.getAttribute('data-commit-hash') || null;
        persistUiState();
        render();
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
      if (target.closest('#graphResizer')) {
        event.preventDefault();
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

    showAllBranchesToggle?.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      vscode.postMessage({ type: 'toggleShowAllBranches', value: target.checked });
    });

    document.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest('#graphResizer')) {
        return;
      }
      event.preventDefault();
      target.setPointerCapture?.(event.pointerId);
      startGraphResize(event.clientX);
    });

    document.addEventListener('pointermove', (event) => {
      updateGraphResize(event.clientX);
    });

    document.addEventListener('pointerup', () => {
      stopGraphResize();
    });

    document.addEventListener('pointercancel', () => {
      stopGraphResize();
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

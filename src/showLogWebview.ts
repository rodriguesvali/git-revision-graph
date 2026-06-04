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
      --show-log-ref-branch: #19d60f;
      --show-log-ref-head: #d62828;
      --show-log-ref-tag: #f7f300;
      --show-log-ref-remote: #f6d8a8;
      --show-log-ref-stash: #8c8f97;
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
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .summary-count {
      flex: 0 0 auto;
      margin-left: auto;
      padding-left: 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      text-align: right;
    }
    .toolbar-main {
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
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
    .filter-control {
      position: relative;
      flex: 0 1 220px;
      min-width: 150px;
    }
    .filter-input {
      width: 100%;
      height: 24px;
      padding: 3px 24px 3px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      outline: none;
      font-family: inherit;
      font-size: 11px;
    }
    .filter-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .filter-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    .filter-clear {
      position: absolute;
      top: 50%;
      right: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: 0;
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      transform: translateY(-50%);
      cursor: pointer;
    }
    .filter-clear:hover,
    .filter-clear:focus-visible {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
      outline: none;
    }
    .filter-clear[hidden] {
      display: none;
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
    .commit-entry[data-compare-base="true"] {
      box-shadow: inset 3px 0 0 color-mix(in srgb, var(--vscode-list-focusOutline) 72%, var(--vscode-foreground));
    }
    .commit-entry[data-compare-target="true"] {
      box-shadow: inset 3px 0 0 var(--vscode-list-focusOutline);
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
    .commit-row:not([data-expanded="true"]) .graph-main {
      flex: 1 1 auto;
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
    .graph-node-solid {
      stroke-width: 1.2;
    }
    .graph-node-core {
      fill: var(--vscode-sideBar-background);
      opacity: 0.92;
    }
    .graph-node-merge-ring {
      fill: var(--vscode-sideBar-background);
      stroke-width: 2;
    }
    .graph-node-merge-core {
      opacity: 0.96;
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
      overflow: hidden;
      flex-wrap: nowrap;
      color: var(--vscode-descriptionForeground);
      font-size: 9.5px;
      line-height: 1.15;
      opacity: 0.68;
    }
    .refs {
      display: flex;
      flex: 1 1 auto;
      gap: 4px;
      min-width: 0;
      overflow: hidden;
      flex-wrap: nowrap;
    }
    .ref-badge {
      position: relative;
      --show-log-ref-color: var(--vscode-badge-background);
      display: inline-flex;
      flex: 0 1 auto;
      align-items: center;
      min-width: 0;
      max-width: 144px;
      padding: 1px 5px 4px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--show-log-ref-color) 34%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 8.5px;
      line-height: 1.15;
      font-weight: 600;
      color: color-mix(in srgb, var(--vscode-foreground) 88%, var(--show-log-ref-color) 12%);
      background: color-mix(in srgb, var(--show-log-ref-color) 14%, transparent);
    }
    .ref-badge::after {
      content: '';
      position: absolute;
      left: 5px;
      right: 5px;
      bottom: 2px;
      height: 2px;
      border-radius: 999px;
      background: var(--show-log-ref-color);
    }
    .ref-badge[data-ref-kind="head"] {
      --show-log-ref-color: var(--show-log-ref-head);
    }
    .ref-badge[data-ref-kind="branch"] {
      --show-log-ref-color: var(--show-log-ref-branch);
    }
    .ref-badge[data-ref-kind="remote"] {
      --show-log-ref-color: var(--show-log-ref-remote);
      color: color-mix(in srgb, var(--vscode-foreground) 84%, black 16%);
    }
    .ref-badge[data-ref-kind="tag"] {
      --show-log-ref-color: var(--show-log-ref-tag);
      color: color-mix(in srgb, var(--vscode-foreground) 84%, black 16%);
    }
    .ref-badge[data-ref-kind="stash"] {
      --show-log-ref-color: var(--show-log-ref-stash);
    }
    .stats {
      flex: 0 0 auto;
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
      cursor: pointer;
      user-select: none;
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
      position: relative;
      margin: 8px 12px 0;
      min-height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-align: center;
    }
    .load-more-sentinel {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 1px;
      opacity: 0;
      pointer-events: none;
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
    .commit-tooltip {
      position: fixed;
      z-index: 1200;
      width: min(520px, calc(100vw - 24px));
      max-width: calc(100vw - 24px);
      padding: 10px 12px;
      border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border, transparent));
      border-radius: 3px;
      color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground));
      background: var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background));
      box-shadow: 0 8px 24px color-mix(in srgb, var(--vscode-widget-shadow, #000) 42%, transparent);
      font-size: 12px;
      line-height: 1.35;
      pointer-events: auto;
    }
    .commit-tooltip[hidden] { display: none; }
    .commit-tooltip-header {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      margin-bottom: 7px;
    }
    .commit-tooltip-avatar {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      color: var(--vscode-button-foreground);
      background: color-mix(in srgb, var(--vscode-textLink-foreground) 70%, var(--vscode-button-background));
      font-size: 10px;
      font-weight: 700;
    }
    .commit-tooltip-author-line {
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 5px;
      flex-wrap: wrap;
    }
    .commit-tooltip-author {
      color: var(--vscode-textLink-foreground);
      font-weight: 600;
    }
    .commit-tooltip-muted {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
    .commit-tooltip-subject {
      margin: 0 0 6px;
      font-weight: 600;
    }
    .commit-tooltip-body {
      margin: 0 0 8px;
      color: color-mix(in srgb, var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground)) 88%, var(--vscode-descriptionForeground));
      white-space: pre-wrap;
    }
    .commit-tooltip-coauthor {
      margin: 0 0 8px;
      color: var(--vscode-textLink-foreground);
      font-weight: 600;
    }
    .commit-tooltip-stats {
      margin: 8px 0;
      color: var(--vscode-descriptionForeground);
    }
    .commit-tooltip-insertions {
      color: var(--vscode-gitDecoration-addedResourceForeground, #3fb950);
    }
    .commit-tooltip-deletions {
      color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
    }
    .commit-tooltip-refs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 8px 0;
    }
    .commit-tooltip-footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      font-size: 11px;
    }
    .commit-tooltip-hash {
      color: var(--vscode-textLink-foreground);
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .commit-tooltip-action {
      display: inline-flex;
      align-items: center;
      min-height: 20px;
      padding: 2px 6px;
      border: 0;
      border-radius: 3px;
      color: var(--vscode-textLink-foreground);
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    .commit-tooltip-action:hover,
    .commit-tooltip-action:focus-visible {
      outline: none;
      color: var(--vscode-button-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <div class="toolbar-main">
        <div class="summary" id="summary"></div>
        <div class="summary-count" id="summaryCount"></div>
        <div class="filter-control">
          <input class="filter-input" id="filterInput" type="search" placeholder="Filter commits" aria-label="Filter commits" spellcheck="false" />
          <button class="filter-clear" id="filterClear" type="button" title="Clear filter" aria-label="Clear filter" hidden>×</button>
        </div>
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
  <div class="commit-tooltip" id="commitTooltip" role="tooltip" hidden></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentState = null;
    let contextMenuState = null;
    const summary = document.getElementById('summary');
    const summaryCount = document.getElementById('summaryCount');
    const content = document.getElementById('content');
    const loadingChip = document.getElementById('loadingChip');
    const contextMenu = document.getElementById('contextMenu');
    const commitTooltip = document.getElementById('commitTooltip');
    const showAllBranchesControl = document.getElementById('showAllBranchesControl');
    const showAllBranchesToggle = document.getElementById('showAllBranchesToggle');
    const filterInput = document.getElementById('filterInput');
    const filterClear = document.getElementById('filterClear');
    const LANE_COLORS = ['#5bbaf9', '#d87cff', '#ffd24d', '#52d273', '#ff7db8', '#ff9b5e', '#8fd6c9'];
    const GRAPH_WIDTH_KEY = 'showLogGraphWidth';
    const MIN_GRAPH_WIDTH = 42;
    const GRAPH_LANE_SPACING = 10;
    const GRAPH_LEFT_INSET = 8;
    const GRAPH_RIGHT_PADDING = 6;
    const persistedUiState = vscode.getState() || {};
    let graphWidth = normalizeGraphWidth(persistedUiState[GRAPH_WIDTH_KEY]);
    let resizeState = null;
    let selectedCommitHashes = normalizeSelectedCommitHashes(
      persistedUiState.selectedCommitHashes || persistedUiState.selectedCommitHash
    );
    let loadMoreObserver = null;
    let filterDebounceTimer = 0;
    let tooltipCommitHash = '';
    let pendingTooltipCommitHash = '';
    let tooltipShowTimer = 0;
    let tooltipShowClientX = 0;
    let tooltipShowClientY = 0;
    let tooltipHideTimer = 0;

    applyGraphColumnWidth(graphWidth);

    function render() {
      if (!summary || !summaryCount || !content || !loadingChip) {
        return;
      }
      const state = currentState || {
        kind: 'hidden',
        loading: false,
        loadingMore: false,
        summary: '',
        summaryCount: '',
        showAllBranches: false,
        canToggleAllBranches: false,
        sourceToken: '',
        filterText: '',
        emptyMessage: 'Use Show Log from the graph context menu to load a commit stack or range here.',
        errorMessage: undefined,
        commits: [],
        hasMore: false
      };

      summary.textContent = state.summary || 'Show Log';
      summaryCount.textContent = state.summaryCount || '';
      loadingChip.dataset.visible = state.loading ? 'true' : 'false';
      loadingChip.textContent = 'Loading';
      syncSelectedCommitHashes(state.commits || []);
      if (filterInput instanceof HTMLInputElement) {
        const nextFilterText = state.filterText || '';
        if (filterInput.value !== nextFilterText) {
          filterInput.value = nextFilterText;
        }
        filterInput.disabled = state.kind !== 'visible';
      }
      if (filterClear instanceof HTMLButtonElement) {
        filterClear.hidden = !(state.filterText || '').trim();
        filterClear.disabled = state.kind !== 'visible';
      }
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
          '<div class="load-more" aria-live="polite">'
          + (state.loadingMore ? 'Loading more commits...' : '')
          + '<div class="load-more-sentinel" id="loadMoreSentinel" aria-hidden="true"></div>'
          + '</div>'
        );
      }
      hideCommitTooltip();
      content.innerHTML = sections.join('');
      syncLoadMoreObserver();
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
        + commits.map((commit, index) => ''
          + '<div class="commit-entry" data-selected="' + (selectedCommitHashes.includes(commit.hash) ? 'true' : 'false') + '" data-compare-base="' + (selectedCommitHashes[0] === commit.hash ? 'true' : 'false') + '" data-compare-target="' + (selectedCommitHashes[1] === commit.hash ? 'true' : 'false') + '" data-merge="' + (commit.isMerge ? 'true' : 'false') + '">'
          + renderCommit(commit, index)
          + '</div>'
        ).join('')
        + '</div>';
    }

    function renderCommit(commit, index) {
      return ''
        + '<div class="commit-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-expanded="' + (commit.expanded ? 'true' : 'false') + '">'
        + '  <div class="graph-cell">'
        + '    <div class="graph-stack">'
        + '      <div class="graph-main">' + renderTopology(commit.topology, commit.isMerge, index === 0) + '</div>'
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
              ? '        <div class="refs">' + commit.refs.map(renderRefBadge).join('') + '</div>'
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

    function renderRefBadge(ref) {
      return '<span class="ref-badge" data-ref-kind="' + escapeHtml(ref.kind) + '" title="' + escapeHtml(ref.name) + '">' + escapeHtml(ref.label) + '</span>';
    }

    function renderTooltipRefBadge(ref) {
      return '<span class="ref-badge" data-ref-kind="' + escapeHtml(ref.kind) + '">' + escapeHtml(ref.label) + '</span>';
    }

    function renderTopology(topology, isMerge, isFirstVisible) {
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
        const laneTopY = isFirstVisible && lane === topology.nodeLane ? centerY : topY;
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + laneTopY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
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
      if (isMerge) {
        lineParts.push('<circle class="graph-node-merge-ring" cx="' + nodeX + '" cy="' + centerY + '" r="5.1" stroke="' + nodeColor + '" />');
        lineParts.push('<circle class="graph-node-ring" cx="' + nodeX + '" cy="' + centerY + '" r="3.05" stroke="' + nodeColor + '" />');
        lineParts.push('<circle class="graph-node-merge-core" cx="' + nodeX + '" cy="' + centerY + '" r="1.85" fill="' + nodeColor + '" />');
      } else {
        lineParts.push('<circle class="graph-node-solid" cx="' + nodeX + '" cy="' + centerY + '" r="3.85" fill="' + nodeColor + '" stroke="' + nodeColor + '" />');
      }

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>';
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

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>';
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
        selectedCommitHashes
      });
    }

    function persistUiState() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        [GRAPH_WIDTH_KEY]: graphWidth,
        selectedCommitHashes
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
          + '    <div class="file-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-change-id="' + escapeHtml(change.id) + '" aria-haspopup="menu" aria-label="' + escapeHtml(change.path + '. ' + change.status + '. Double-click to compare. Press Shift+F10 or Enter for actions.') + '">'
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

    function renderCommitTooltip(commit) {
      const coAuthors = parseCoAuthors(commit.message);
      const body = getTooltipBody(commit.message, commit.subject);
      const refs = commit.refs && commit.refs.length
        ? '<div class="commit-tooltip-refs">' + commit.refs.map(renderTooltipRefBadge).join('') + '</div>'
        : '';
      const stats = renderTooltipStats(commit.stats);
      return ''
        + '<div class="commit-tooltip-header">'
        + '  <span class="commit-tooltip-avatar">' + escapeHtml(getAuthorInitials(commit.author)) + '</span>'
        + '  <div class="commit-tooltip-author-line">'
        + '    <span class="commit-tooltip-author">' + escapeHtml(commit.author || 'Unknown author') + '</span>'
        + '    <span class="commit-tooltip-muted">committed on ' + escapeHtml(commit.date || 'unknown date') + '</span>'
        + '  </div>'
        + '</div>'
        + refs
        + '<p class="commit-tooltip-subject">' + escapeHtml(commit.subject) + '</p>'
        + (body ? '<p class="commit-tooltip-body">' + escapeHtml(body) + '</p>' : '')
        + coAuthors.map((coAuthor) => '<p class="commit-tooltip-coauthor">' + escapeHtml(coAuthor.name) + ' <span class="commit-tooltip-muted">(Co-author)</span><br><span class="commit-tooltip-muted">' + escapeHtml(coAuthor.email) + '</span></p>').join('')
        + stats
        + '<div class="commit-tooltip-footer">'
        + '  <span class="commit-tooltip-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + '  <button class="commit-tooltip-action" type="button" data-tooltip-action="copyCommitHash" data-commit-hash="' + escapeHtml(commit.hash) + '">Copy Hash</button>'
        + '  <button class="commit-tooltip-action" type="button" data-tooltip-action="openCommitOnGitHub" data-commit-hash="' + escapeHtml(commit.hash) + '">Open on GitHub</button>'
        + '</div>';
    }

    function renderTooltipStats(stats) {
      const parsed = parseTooltipStats(stats);
      if (!parsed) {
        return '';
      }
      const fileLabel = parsed.files === 1 ? 'file' : 'files';
      const parts = [parsed.files + ' ' + fileLabel + ' changed'];
      if (parsed.insertions > 0) {
        parts.push('<span class="commit-tooltip-insertions">' + parsed.insertions + ' insertion(+)</span>');
      }
      if (parsed.deletions > 0) {
        parts.push('<span class="commit-tooltip-deletions">' + parsed.deletions + ' deletion(-)</span>');
      }
      return '<div class="commit-tooltip-stats">' + parts.join(', ') + '</div>';
    }

    function parseTooltipStats(stats) {
      if (!stats) {
        return null;
      }
      const files = Number(stats.match(/^(\\d+)\\s+files?/)?.[1] || 0);
      const insertions = Number(stats.match(/\\+(\\d+)/)?.[1] || 0);
      const deletions = Number(stats.match(/-(\\d+)/)?.[1] || 0);
      return files > 0 ? { files, insertions, deletions } : null;
    }

    function parseCoAuthors(message) {
      return String(message || '')
        .split('\\n')
        .map((line) => line.match(/^Co-authored-by:\\s*(.+?)\\s*<([^>]+)>\\s*$/i))
        .filter(Boolean)
        .map((match) => ({ name: match[1], email: match[2] }));
    }

    function getTooltipBody(message, subject) {
      const lines = String(message || '')
        .split('\\n')
        .filter((line) => !/^Co-authored-by:/i.test(line.trim()));
      if (lines[0] === subject) {
        lines.shift();
      }
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      return lines.join('\\n').trim();
    }

    function getAuthorInitials(author) {
      const parts = String(author || '')
        .trim()
        .split(/\\s+/)
        .filter(Boolean);
      if (parts.length === 0) {
        return '?';
      }
      return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    }

    function findCommitByHash(commitHash) {
      const commits = (currentState && currentState.commits) || [];
      return commits.find((commit) => commit.hash === commitHash) || null;
    }

    function showCommitTooltip(commitHash, event) {
      if (!commitTooltip) {
        return;
      }
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      const commit = findCommitByHash(commitHash);
      if (!commit) {
        hideCommitTooltip();
        return;
      }
      const shouldPosition = tooltipCommitHash !== commitHash || commitTooltip.hidden;
      if (tooltipCommitHash !== commitHash) {
        tooltipCommitHash = commitHash;
        commitTooltip.innerHTML = renderCommitTooltip(commit);
      }
      commitTooltip.hidden = false;
      if (shouldPosition) {
        positionCommitTooltip(event.clientX, event.clientY);
      }
    }

    function positionCommitTooltip(clientX, clientY) {
      if (!commitTooltip || commitTooltip.hidden) {
        return;
      }
      const margin = 12;
      const offset = 14;
      const rect = commitTooltip.getBoundingClientRect();
      const preferredLeft = clientX + offset;
      const preferredTop = clientY + offset;
      const left = preferredLeft + rect.width + margin <= window.innerWidth
        ? preferredLeft
        : Math.max(margin, clientX - rect.width - offset);
      const top = Math.min(
        Math.max(margin, preferredTop),
        Math.max(margin, window.innerHeight - rect.height - margin)
      );
      commitTooltip.style.left = left + 'px';
      commitTooltip.style.top = top + 'px';
    }

    function hideCommitTooltip() {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      tooltipCommitHash = '';
      if (commitTooltip) {
        commitTooltip.hidden = true;
        commitTooltip.innerHTML = '';
      }
    }

    function scheduleShowCommitTooltip(commitHash, event) {
      cancelCommitTooltipHide();
      tooltipShowClientX = event.clientX;
      tooltipShowClientY = event.clientY;
      if (tooltipCommitHash === commitHash && commitTooltip && !commitTooltip.hidden) {
        return;
      }
      if (tooltipShowTimer && pendingTooltipCommitHash === commitHash) {
        return;
      }

      cancelCommitTooltipShow();
      pendingTooltipCommitHash = commitHash;
      tooltipShowTimer = window.setTimeout(() => {
        const pendingCommitHash = pendingTooltipCommitHash;
        const clientX = tooltipShowClientX;
        const clientY = tooltipShowClientY;
        tooltipShowTimer = 0;
        pendingTooltipCommitHash = '';
        showCommitTooltip(pendingCommitHash, { clientX, clientY });
      }, 500);
    }

    function cancelCommitTooltipShow() {
      if (tooltipShowTimer) {
        window.clearTimeout(tooltipShowTimer);
        tooltipShowTimer = 0;
      }
      pendingTooltipCommitHash = '';
    }

    function scheduleHideCommitTooltip() {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      tooltipHideTimer = window.setTimeout(() => {
        hideCommitTooltip();
      }, 160);
    }

    function cancelCommitTooltipHide() {
      if (tooltipHideTimer) {
        window.clearTimeout(tooltipHideTimer);
        tooltipHideTimer = 0;
      }
    }

    function handleContextMenu(commitHash, clientX, clientY) {
      const compareSelection = getCompareSelectionForCommit(commitHash);
      contextMenuState = {
        kind: 'commit',
        commitHash,
        baseCommitHash: compareSelection?.baseCommitHash,
        compareCommitHash: compareSelection?.compareCommitHash
      };
      if (!contextMenu) {
        return;
      }
      if (compareSelection) {
        contextMenu.innerHTML = '<button class="context-menu-button" type="button" data-menu-action="compareCommits">Compare</button>';
        showContextMenuAt(clientX, clientY);
        return;
      }
      contextMenu.innerHTML = ''
        + '<button class="context-menu-button" type="button" data-menu-action="compareCommitWithWorktree">Compare with Worktree</button>'
        + '<button class="context-menu-button" type="button" data-menu-action="openCommitDetails">Open Commit Details</button>'
        + '<button class="context-menu-button" type="button" data-menu-action="resetToCommit">Reset to this</button>';
      showContextMenuAt(clientX, clientY);
    }

    function openFileContextMenu(commitHash, changeId, clientX, clientY) {
      contextMenuState = { kind: 'file', commitHash, changeId };
      if (!contextMenu) {
        return;
      }
      contextMenu.innerHTML = ''
        + '<button class="context-menu-button" type="button" data-menu-action="openFile">Compare</button>'
        + '<button class="context-menu-button" type="button" data-menu-action="compareWithWorktree">Compare with Worktree</button>'
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

    function requestAutoLoadMore() {
      const state = currentState;
      if (!state || state.kind !== 'visible' || state.loading || state.loadingMore || !state.hasMore) {
        return;
      }
      vscode.postMessage({ type: 'loadMore' });
    }

    function scheduleFilterUpdate(value) {
      const sourceToken = getCurrentSourceToken();
      window.clearTimeout(filterDebounceTimer);
      filterDebounceTimer = window.setTimeout(() => {
        if (sourceToken !== getCurrentSourceToken()) {
          return;
        }
        vscode.postMessage({ type: 'setFilterText', value, sourceToken });
      }, 250);
    }

    function clearPendingFilterUpdate() {
      window.clearTimeout(filterDebounceTimer);
      filterDebounceTimer = 0;
    }

    function getCurrentSourceToken() {
      return (currentState && currentState.sourceToken) || '';
    }

    function normalizeSelectedCommitHashes(value) {
      const rawValues = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
      return rawValues
        .filter((hash, index, values) => typeof hash === 'string' && hash.length > 0 && values.indexOf(hash) === index)
        .slice(-2);
    }

    function syncSelectedCommitHashes(commits) {
      const loadedCommitHashes = new Set(commits.map((commit) => commit.hash));
      const nextSelected = selectedCommitHashes.filter((hash) => loadedCommitHashes.has(hash));
      if (nextSelected.length !== selectedCommitHashes.length) {
        selectedCommitHashes = nextSelected;
        persistUiState();
      }
    }

    function selectCommit(commitHash, append) {
      if (!commitHash) {
        return;
      }

      if (!append) {
        selectedCommitHashes = [commitHash];
        persistUiState();
        return;
      }

      if (selectedCommitHashes.includes(commitHash)) {
        selectedCommitHashes = selectedCommitHashes.filter((hash) => hash !== commitHash);
        persistUiState();
        return;
      }

      selectedCommitHashes = selectedCommitHashes.filter((hash) => hash !== commitHash);
      selectedCommitHashes.push(commitHash);
      selectedCommitHashes = selectedCommitHashes.slice(-2);
      persistUiState();
    }

    function getCompareSelectionForCommit(commitHash) {
      if (selectedCommitHashes.length !== 2 || !selectedCommitHashes.includes(commitHash)) {
        return undefined;
      }

      return {
        baseCommitHash: selectedCommitHashes[0],
        compareCommitHash: selectedCommitHashes[1]
      };
    }

    function syncLoadMoreObserver() {
      if (loadMoreObserver) {
        loadMoreObserver.disconnect();
      }

      const sentinel = document.getElementById('loadMoreSentinel');
      if (!sentinel) {
        loadMoreObserver = null;
        return;
      }

      if (typeof IntersectionObserver !== 'function') {
        loadMoreObserver = null;
        return;
      }

      loadMoreObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            requestAutoLoadMore();
            break;
          }
        }
      }, {
        root: null,
        rootMargin: '0px 0px 160px 0px',
        threshold: 0
      });

      loadMoreObserver.observe(sentinel);
    }

    function maybeLoadMoreFromScroll() {
      const state = currentState;
      if (!state || state.kind !== 'visible' || state.loading || state.loadingMore || !state.hasMore) {
        return;
      }

      const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (remaining <= 160) {
        requestAutoLoadMore();
      }
    }

    content.addEventListener('click', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest('#graphResizer')) {
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
        const commitHash = commitRow.getAttribute('data-commit-hash') || '';
        if (event.ctrlKey) {
          selectCommit(commitHash, true);
          closeContextMenu();
          render();
          return;
        }
        selectCommit(commitHash, false);
        closeContextMenu();
        render();
        vscode.postMessage({ type: 'toggleCommit', commitHash });
      }
    });

    content.addEventListener('dblclick', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const fileRow = target.closest('[data-change-id]');
      if (!(fileRow instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      closeContextMenu();
      fileRow.focus();
      vscode.postMessage({
        type: 'openFile',
        commitHash: fileRow.getAttribute('data-commit-hash') || '',
        changeId: fileRow.getAttribute('data-change-id') || ''
      });
    });

    content.addEventListener('mousedown', (event) => {
      hideCommitTooltip();
      if (event.button !== 1) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-change-id]')) {
        event.preventDefault();
      }
    });

    content.addEventListener('auxclick', (event) => {
      hideCommitTooltip();
      if (event.button !== 1) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-change-id]')) {
        event.preventDefault();
      }
    });

    content.addEventListener('keydown', (event) => {
      hideCommitTooltip();
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
        const commitHash = target.getAttribute('data-commit-hash') || '';
        selectCommit(commitHash, false);
        closeContextMenu();
        render();
        vscode.postMessage({ type: 'toggleCommit', commitHash });
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
      hideCommitTooltip();
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

    content.addEventListener('mousemove', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        scheduleHideCommitTooltip();
        return;
      }
      const row = target.closest('.commit-row[data-commit-hash]');
      if (!(row instanceof HTMLElement) || target.closest('[data-change-id]')) {
        scheduleHideCommitTooltip();
        return;
      }
      const commitHash = row.dataset.commitHash || '';
      if (!commitHash) {
        scheduleHideCommitTooltip();
        return;
      }
      scheduleShowCommitTooltip(commitHash, event);
    });

    content.addEventListener('mouseleave', () => {
      scheduleHideCommitTooltip();
    });

    commitTooltip?.addEventListener('mouseenter', () => {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
    });

    commitTooltip?.addEventListener('mouseleave', () => {
      scheduleHideCommitTooltip();
    });

    commitTooltip?.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-tooltip-action]')?.getAttribute('data-tooltip-action');
      const commitHash = event.target?.closest?.('[data-commit-hash]')?.getAttribute('data-commit-hash') || tooltipCommitHash;
      if (!action || !commitHash) {
        return;
      }
      event.preventDefault();
      if (action === 'copyCommitHash') {
        vscode.postMessage({ type: 'copyCommitHash', commitHash });
      }
      if (action === 'openCommitOnGitHub') {
        vscode.postMessage({ type: 'openCommitOnGitHub', commitHash });
      }
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
        if (action === 'compareCommits' && state.baseCommitHash && state.compareCommitHash) {
          vscode.postMessage({
            type: 'compareCommits',
            baseCommitHash: state.baseCommitHash,
            compareCommitHash: state.compareCommitHash
          });
        }
        if (action === 'compareCommitWithWorktree') {
          vscode.postMessage({ type: 'compareCommitWithWorktree', commitHash: state.commitHash });
        }
        if (action === 'resetToCommit') {
          vscode.postMessage({ type: 'resetToCommit', commitHash: state.commitHash });
        }
        return;
      }

      if (action === 'openFile' || action === 'compareWithWorktree' || action === 'copyFileName' || action === 'copyFullPath') {
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

    filterInput?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      scheduleFilterUpdate(target.value);
    });

    filterClear?.addEventListener('click', () => {
      if (!(filterInput instanceof HTMLInputElement)) {
        return;
      }
      filterInput.value = '';
      filterInput.focus();
      scheduleFilterUpdate('');
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

    window.addEventListener('scroll', () => {
      maybeLoadMoreFromScroll();
    }, { passive: true });

    window.addEventListener('resize', () => {
      maybeLoadMoreFromScroll();
    });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'state') {
        const previousSourceToken = getCurrentSourceToken();
        currentState = event.data.state;
        if (previousSourceToken !== getCurrentSourceToken()) {
          clearPendingFilterUpdate();
        }
        render();
      }
    });

    vscode.postMessage({ type: 'ready' });
    render();
  </script>
</body>
</html>`;
}

export function renderShowLogWebviewStyles(): string {
  return `
    :root {
      color-scheme: var(--vscode-color-scheme);
      --show-log-row-hover: color-mix(
        in srgb,
        var(--vscode-list-hoverBackground, var(--vscode-editorHoverWidget-background)) 86%,
        var(--vscode-list-inactiveSelectionBackground, transparent)
      );
      --show-log-row-hover-accent: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 44%, transparent);
      --show-log-row-hover-outline: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 22%, transparent);
      --show-log-menu-item-hover: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 12%, transparent);
      --show-log-row-active: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 18%, transparent);
      --show-log-graph-width: 64px;
      --show-log-author-width: 132px;
      --show-log-date-width: 84px;
      --show-log-resizer-hit-width: 8px;
      --show-log-ref-base-branch: #19d60f;
      --show-log-ref-base-head: #d62828;
      --show-log-ref-base-tag: #f7f300;
      --show-log-ref-base-remote: #f6d8a8;
      --show-log-ref-base-stash: #8c8f97;
      --show-log-ref-branch: color-mix(in srgb, var(--show-log-ref-base-branch) 88%, white 12%);
      --show-log-ref-head: color-mix(in srgb, var(--show-log-ref-base-head) 92%, white 8%);
      --show-log-ref-tag: color-mix(in srgb, var(--show-log-ref-base-tag) 90%, white 10%);
      --show-log-ref-remote: color-mix(in srgb, var(--show-log-ref-base-remote) 88%, white 12%);
      --show-log-ref-stash: color-mix(in srgb, var(--show-log-ref-base-stash) 92%, white 8%);
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
      --show-log-selection-color: var(--vscode-charts-blue, #3794ff);
    }
    .commit-entry[data-selected="true"] .commit-row {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--show-log-selection-color) 86%, transparent) 0 3px,
          transparent 3px 100%
        ),
        color-mix(in srgb, var(--show-log-selection-color) 13%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--show-log-selection-color) 34%, transparent);
    }
    .commit-entry[data-selected="true"] .commit-row:hover {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--show-log-selection-color) 92%, transparent) 0 3px,
          transparent 3px 100%
        ),
        color-mix(in srgb, var(--show-log-selection-color) 18%, var(--show-log-row-hover));
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
      transition: background 90ms ease, box-shadow 90ms ease;
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
      background:
        linear-gradient(
          90deg,
          var(--show-log-row-hover-accent) 0 3px,
          transparent 3px 100%
        ),
        var(--show-log-row-hover);
      box-shadow: inset 0 0 0 1px var(--show-log-row-hover-outline);
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
    .commit-row[data-expanded="true"]:hover {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 52%, var(--show-log-row-active)) 0 3px,
          transparent 3px 100%
        ),
        color-mix(in srgb, var(--show-log-row-hover) 58%, var(--show-log-row-active));
      box-shadow: inset 0 0 0 1px var(--show-log-row-hover-outline);
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
      min-height: var(--show-log-main-graph-height, 30px);
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
    .graph-continuation-row.search {
      min-height: 36px;
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
    .commit-entry[data-compare-base="true"] .subject-cell::after {
      flex: 0 0 auto;
      margin-left: 10px;
      padding: 1px 7px 2px;
      border: 1px solid color-mix(in srgb, var(--show-log-selection-color) 48%, transparent);
      border-radius: 999px;
      color: color-mix(in srgb, var(--show-log-selection-color) 76%, var(--vscode-foreground));
      background: color-mix(in srgb, var(--show-log-selection-color) 16%, transparent);
      font-size: 9px;
      font-weight: 700;
      line-height: 1.25;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .commit-entry[data-compare-base="true"] .subject-cell::after {
      content: 'Base';
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
      flex: 1 1 auto;
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
      gap: 3px;
      min-width: 0;
      max-width: 180px;
      min-height: 17px;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--show-log-ref-color) 72%, transparent);
      overflow: hidden;
      font-size: 9.5px;
      line-height: 13px;
      font-weight: 600;
      color: color-mix(in srgb, black 88%, var(--show-log-ref-color) 12%);
      background: var(--show-log-ref-color);
    }
    .ref-badge-icon {
      flex: 0 0 auto;
      width: 11px;
      height: 11px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .ref-badge-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ref-badge[data-ref-kind="head"] {
      --show-log-ref-color: var(--show-log-ref-head);
      color: white;
    }
    .ref-badge[data-ref-kind="branch"] {
      --show-log-ref-color: var(--show-log-ref-branch);
    }
    .ref-badge[data-ref-kind="remote"] {
      --show-log-ref-color: var(--show-log-ref-remote);
    }
    .ref-badge[data-ref-kind="tag"] {
      --show-log-ref-color: var(--show-log-ref-tag);
    }
    .ref-badge[data-ref-kind="stash"] {
      --show-log-ref-color: var(--show-log-ref-stash);
      color: white;
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
    .graph-continuation-row.search .commit-files-graph .graph-svg {
      min-height: 36px;
    }
    .commit-files-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0 0 5px 12px;
      border-left: 1px solid color-mix(in srgb, var(--vscode-panel-border) 42%, transparent);
    }
    .commit-file-search-row {
      display: flex;
      justify-content: flex-end;
      padding: 4px 8px 6px 0;
    }
    .commit-file-search-control {
      position: relative;
      flex: 0 1 320px;
      min-width: 180px;
      max-width: 320px;
    }
    .commit-file-search-input {
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
    .commit-file-search-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .commit-file-search-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    .commit-file-search-clear {
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
    .commit-file-search-clear:hover,
    .commit-file-search-clear:focus-visible {
      outline: none;
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
    .commit-file-search-clear:disabled {
      visibility: hidden;
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
    .context-menu-item {
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
    .context-menu-item:hover,
    .context-menu-item:focus-visible {
      outline: none;
      background: var(--show-log-menu-item-hover);
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
    .context-menu-group:focus-within > .context-menu-parent {
      outline: none;
      background: var(--show-log-menu-item-hover);
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
      color: var(--vscode-textLink-foreground, var(--vscode-focusBorder));
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
    .commit-tooltip-action-icon {
      justify-content: center;
      width: 22px;
      min-width: 22px;
      padding: 2px;
    }
    .commit-tooltip-action-icon svg {
      width: 13px;
      height: 13px;
      fill: currentColor;
    }
    .commit-tooltip-action:hover,
    .commit-tooltip-action:focus-visible {
      outline: none;
      color: var(--vscode-button-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
  `;
}

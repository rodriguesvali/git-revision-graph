export function renderCompareResultsWebviewStyles(): string {
  return `
    :root {
      color-scheme: var(--vscode-color-scheme);
      --compare-row-hover: color-mix(
        in srgb,
        var(--vscode-list-hoverBackground, var(--vscode-editorHoverWidget-background)) 86%,
        var(--vscode-list-inactiveSelectionBackground, transparent)
      );
      --compare-row-hover-accent: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 44%, transparent);
      --compare-row-hover-outline: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 22%, transparent);
      --compare-menu-item-hover: color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 12%, transparent);
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
    .toolbar-action {
      min-height: 24px;
      padding: 3px 8px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
      background: var(--vscode-button-secondaryBackground, transparent);
      font: inherit;
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
    }
    .toolbar-action:hover,
    .toolbar-action:focus-visible {
      outline: none;
      background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }
    .toolbar-action:disabled {
      opacity: 0.75;
      cursor: wait;
    }
    .toolbar-action[hidden] {
      display: none;
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
      transition: background 90ms ease, box-shadow 90ms ease;
    }
    .row:hover {
      background:
        linear-gradient(
          90deg,
          var(--compare-row-hover-accent) 0 3px,
          transparent 3px 100%
        ),
        var(--compare-row-hover);
      box-shadow: inset 0 0 0 1px var(--compare-row-hover-outline);
    }
    .row[data-selected="true"] {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 52%, var(--vscode-list-hoverBackground));
    }
    .row[data-selected="true"]:hover {
      background:
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--vscode-focusBorder, #3794ff) 52%, var(--vscode-list-activeSelectionBackground)) 0 3px,
          transparent 3px 100%
        ),
        color-mix(in srgb, var(--compare-row-hover) 58%, var(--vscode-list-activeSelectionBackground));
      box-shadow: inset 0 0 0 1px var(--compare-row-hover-outline);
    }
    .row:focus-visible {
      outline: none;
      background:
        linear-gradient(
          90deg,
          var(--compare-row-hover-accent) 0 3px,
          transparent 3px 100%
        ),
        var(--compare-row-hover);
      box-shadow:
        inset 3px 0 0 var(--compare-row-hover-accent),
        inset 0 0 0 1px var(--compare-row-hover-outline);
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
    .loading-state {
      display: grid;
      min-height: calc(100vh - 96px);
      place-items: center;
      padding: 24px 16px;
    }
    .loading-dialog {
      min-width: min(320px, 100%);
      max-width: 420px;
      padding: 18px 20px;
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, transparent));
      border-radius: 6px;
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground));
      background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
      box-shadow: 0 10px 28px color-mix(in srgb, var(--vscode-widget-shadow, #000) 55%, transparent);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
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
      background: var(--compare-menu-item-hover);
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
      background: var(--compare-menu-item-hover);
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
  `;
}

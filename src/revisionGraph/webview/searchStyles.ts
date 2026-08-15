export function renderRevisionGraphSearchStyles(): string {
  return `
    .view-controls .search-button {
      position: relative;
      flex: 0 0 auto;
    }
    .view-controls .search-button.active {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .search-button-badge {
      position: absolute;
      top: -5px;
      right: -7px;
      min-width: 15px;
      height: 15px;
      padding: 0 3px;
      border: 1px solid var(--panel);
      border-radius: 8px;
      background: var(--accent);
      color: var(--vscode-button-foreground, #fff);
      font-size: 9px;
      font-weight: 700;
      line-height: 13px;
      white-space: nowrap;
    }
    .search-button-badge[hidden] { display: none; }
    .search-panel {
      position: fixed;
      top: calc(var(--graph-top-offset) + 8px);
      right: 12px;
      z-index: 69;
      display: flex;
      align-items: center;
      gap: 2px;
      width: min(440px, calc(100vw - 24px));
      height: 38px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: color-mix(in srgb, var(--panel) 96%, var(--bg));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.26);
    }
    .search-panel[hidden] { display: none; }
    .search-panel .search-field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
    }
    .search-panel .search-input {
      min-width: 0;
      width: min(100%, 320px);
      flex: 1 1 auto;
      height: 32px;
      padding: 0 10px;
      border-radius: 0;
      border-color: transparent;
      background: transparent;
      font-size: 12px;
      line-height: 1;
    }
    .search-panel .search-input:not(:disabled):hover {
      border-color: color-mix(in srgb, var(--accent) 18%, transparent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      box-shadow: none;
    }
    .search-panel .search-input:focus-visible {
      outline-offset: -2px;
      border-color: color-mix(in srgb, var(--accent) 44%, transparent);
      background: color-mix(in srgb, var(--panel) 62%, transparent);
    }
    .search-panel .search-result-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 68px;
      height: 32px;
      padding: 0 10px;
      border: 1px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .search-panel .toolbar-button {
      flex: 0 0 32px;
      width: 32px;
      min-width: 32px;
      height: 32px;
      padding: 0;
      border-color: transparent;
      background: transparent;
    }`;
}

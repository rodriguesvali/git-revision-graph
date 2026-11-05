export function renderRevisionGraphContextMenuStyles(): string {
  return `
    .context-menu-item {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      color: var(--text);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }
    .context-menu-item.primary {
      font-weight: 700;
    }
    .context-menu-item.destructive {
      color: var(--vscode-errorForeground);
    }
    .context-menu-item:not(:disabled):hover,
    .context-menu-item:not(:disabled):focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .context-menu-item:disabled { opacity: 0.45; cursor: default; }
    .context-menu-item[aria-disabled="true"] { cursor: default; }
    .context-menu-disabled-reason {
      display: block;
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      font-weight: normal;
    }
    .context-menu-submenu {
      position: relative;
    }
    .context-submenu-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .context-menu-label {
      min-width: 0;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .context-menu-chevron {
      flex: 0 0 auto;
      color: var(--muted);
    }
    .context-submenu {
      position: fixed;
      z-index: 61;
      min-width: min(220px, calc(100vw - 16px));
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      padding: 6px;
      display: none;
    }
    .context-menu-submenu.open > .context-submenu {
      display: block;
    }
    .context-separator {
      height: 1px;
      margin: 6px 4px;
      background: color-mix(in srgb, var(--border) 72%, transparent);
    }
  `;
}

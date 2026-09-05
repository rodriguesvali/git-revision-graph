export function renderRevisionGraphFlowFormStyles(): string {
  return `
    .flow-config-status, .flow-config-details {
      max-width: 320px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 6px 0;
      color: var(--vscode-descriptionForeground);
    }
    .flow-config-details { max-height: 160px; overflow-y: auto; }
    .flow-form-preview {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      height: 120px;
      box-sizing: border-box;
      scrollbar-gutter: stable;
      overflow-y: auto;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
    }
    .flow-dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 75;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: color-mix(in srgb, var(--bg) 58%, transparent);
    }
    .flow-dialog-backdrop[hidden] {
      display: none;
    }
    .flow-dialog {
      width: min(380px, calc(100vw - 40px));
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
    }
    .flow-dialog-title {
      margin: 0 0 14px;
      color: var(--text);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .flow-dialog-description {
      margin: -6px 0 16px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .flow-form-field {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }
    .flow-form-field[hidden] {
      display: none;
    }
    .flow-form-label {
      color: var(--muted);
      font-size: 12px;
    }
    .flow-form-input {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--panel);
      color: var(--text);
      padding: 7px 8px;
      font: inherit;
    }
    .flow-form-input:focus {
      outline: 1px solid var(--accent);
      outline-offset: 1px;
    }
    .flow-form-textarea {
      min-height: 76px;
      resize: vertical;
    }
    .flow-ai-field-row {
      display: grid; grid-template-columns: minmax(0, 1fr) 26px; align-items: start; gap: 4px;
    }
    .flow-ai-text-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      min-width: 26px;
      height: 30px;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-textLink-foreground, var(--accent));
      padding: 0;
      cursor: pointer;
    }
    .flow-ai-text-action:hover, .flow-ai-text-action:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--vscode-textLink-activeForeground, var(--text));
    }
    .flow-ai-text-action[data-loading="true"] { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--vscode-textLink-activeForeground, var(--text)); }
    .flow-ai-text-action[hidden] { display: none; }
    .flow-ai-text-action svg {
      position: static;
      width: 17px;
      height: 17px;
      fill: currentColor;
    }
    .flow-ai-field-row .flow-form-textarea { min-height: 96px; }
    .flow-ai-text-action:disabled { opacity: 0.45; cursor: default; }
    .flow-form-error {
      margin: 0 0 12px;
      color: var(--vscode-errorForeground);
      font-size: 12px;
    }
    .flow-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .flow-dialog-button {
      min-height: 28px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: transparent;
      color: var(--text);
      padding: 5px 10px;
      cursor: pointer;
    }
    .flow-dialog-button:hover,
    .flow-dialog-button:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .flow-dialog-button.primary {
      border-color: color-mix(in srgb, var(--accent) 72%, var(--border));
      background: color-mix(in srgb, var(--accent) 22%, transparent);
    }
  `;
}

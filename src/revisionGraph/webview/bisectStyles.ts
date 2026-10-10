export function renderBisectStyles(): string {
  return `
    .bisect-announcement { position: absolute; width: 1px; height: 1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; }
    .bisect-banner { position: fixed; bottom: 16px; left: 16px; right: 16px;
      z-index: 73; display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
      padding: 10px 14px; border: 1px solid var(--vscode-focusBorder);
      background: var(--vscode-editorWidget-background); box-shadow: 0 4px 16px var(--vscode-widget-shadow); }
    .bisect-banner[hidden], .bisect-backdrop[hidden] { display: none; }
    .bisect-banner span { flex: 1; min-width: 160px; overflow-wrap: anywhere; }
    .bisect-backdrop { position: fixed; inset: 0; z-index: 90; display: grid;
      place-items: center; padding: 16px; background: rgba(0, 0, 0, .35); }
    .bisect-dialog { width: min(600px, 100%); max-height: calc(100vh - 32px); overflow: auto;
      padding: 22px; border: 1px solid var(--vscode-widget-border, var(--border));
      border-radius: 8px; background: var(--vscode-editorWidget-background, var(--panel));
      color: var(--vscode-editorWidget-foreground, var(--text)); box-shadow: 0 8px 30px var(--vscode-widget-shadow); }
    .bisect-dialog h2 { font-size: 18px; margin: 0; }
    .bisect-dialog h3 { font-size: 13px; margin: 0 0 8px; }
    .bisect-heading, .bisect-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .bisect-heading { justify-content: space-between; margin-bottom: 16px; }
    .bisect-muted { color: var(--vscode-descriptionForeground); font-size: 12px; overflow-wrap: anywhere; }
    .bisect-commit { padding: 14px; border: 1px solid var(--border); border-radius: 6px;
      margin: 14px 0; overflow-wrap: anywhere; }
    .bisect-commit code { user-select: text; font-family: var(--vscode-editor-font-family); }
    .bisect-commit p { margin: 6px 0 12px; }
    .bisect-decisions button { flex: 1; min-width: 125px; padding: 10px 14px; }
    .bisect-dialog button { border-radius: 4px; }
    .bisect-primary { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
    .bisect-primary:hover { background: var(--vscode-button-hoverBackground); }
    .bisect-dialog :focus-visible, .bisect-banner :focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
    .bisect-dialog button:disabled { opacity: .5; cursor: default; }
    .bisect-status { min-height: 20px; margin: 12px 0; }
    .bisect-error { padding: 10px; border-left: 3px solid var(--vscode-inputValidation-warningBorder);
      background: var(--vscode-inputValidation-warningBackground); overflow-wrap: anywhere; }
    .bisect-dialog details { margin: 18px 0; }
    .bisect-dialog summary { cursor: pointer; }
    .bisect-history { padding-left: 22px; font-size: 12px; }
    .bisect-history li { margin: 8px 0; overflow-wrap: anywhere; }
    .bisect-footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border); }
    @media (max-width: 420px) { .bisect-backdrop { padding: 8px; }
      .bisect-dialog { padding: 14px; max-height: calc(100vh - 16px); }
      .bisect-decisions { flex-direction: column; align-items: stretch; }
      .bisect-decisions button { width: 100%; } }
  `;
}

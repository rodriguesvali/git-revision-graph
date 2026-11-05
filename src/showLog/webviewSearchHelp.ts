import { REVISION_LOG_FILTER_SCAN_MAX_COMMITS } from '../revisionGraph/revisionLogTypes';

export function renderShowLogSearchHelp(): string {
  const limit = REVISION_LOG_FILTER_SCAN_MAX_COMMITS.toLocaleString('en-US');
  return `<details class="search-help">
    <summary aria-label="Search help" title="Search help">?</summary>
    <div class="search-help-panel">
      <strong>Search commits</strong>
      <p>Search commit messages, authors, hashes and references with ordinary text.</p>
      <p><code>file:src/auth/</code> finds changes to a repository-relative path.</p>
      <p><code>change:&quot;validateToken(&quot;</code> finds literal text in added or removed lines.</p>
      <p>Combine filters and text: <code>file:src/auth/ change:&quot;validateToken(&quot; fix parser</code></p>
      <p>Quote values containing spaces. Paths and changed text are case-sensitive; wildcards and regular expressions are not supported. Paths match their names at each commit and do not follow renames.</p>
      <p>Search scans up to the first ${limit} commits in the selected scope; older history may not be searched.</p>
    </div>
  </details>`;
}

export function renderShowLogSearchStyles(): string { return `
    .filter-control {
      position: relative;
      display: flex;
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
      font: 11px var(--vscode-font-family);
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
    .search-help { flex: 0 0 auto; }
    .search-help summary {
      display: grid; place-items: center; width: 24px; height: 24px;
      border-radius: 4px; cursor: pointer; list-style: none;
      color: var(--vscode-foreground); background: var(--vscode-toolbar-hoverBackground);
    }
    .search-help summary::-webkit-details-marker { display: none; }
    .search-help summary:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
    .search-help-panel {
      position: absolute; top: calc(100% + 6px); right: 12px; z-index: 5;
      width: min(420px, calc(100vw - 24px)); max-height: calc(100vh - 80px); overflow: auto;
      padding: 12px; border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
      background: var(--vscode-editorWidget-background); color: var(--vscode-editorWidget-foreground, var(--vscode-foreground));
      box-shadow: 0 4px 16px var(--vscode-widget-shadow); font-size: 12px; line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .search-help-panel p { margin: 8px 0 0; }
    .search-help-panel code { user-select: text; }
  `; }

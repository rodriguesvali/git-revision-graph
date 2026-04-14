import { renderRevisionGraphScript } from './revisionGraph/webview/script';
import { renderRevisionGraphStyles } from './revisionGraph/webview/styles';
import { createNonce } from './revisionGraph/webview/shared';

export function renderRevisionGraphShellHtml(): string {
  const nonce = createNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GIT Revision Graph</title>
  ${renderRevisionGraphStyles()}
</head>
<body class="loading" aria-busy="true">
  <div class="view-controls" aria-label="Revision graph view controls">
    <label for="scopeSelect">
      <span class="control-caption">Scope</span>
      <select id="scopeSelect">
        <option value="all">All Refs</option>
        <option value="current">Current Branch</option>
        <option value="local">Local Branches</option>
      </select>
    </label>
    <label for="showTagsToggle">
      <input id="showTagsToggle" type="checkbox" />
      <span>Show Tags</span>
    </label>
    <label for="showRemoteBranchesToggle">
      <input id="showRemoteBranchesToggle" type="checkbox" />
      <span>Show Remote Branches</span>
    </label>
    <label for="showStashesToggle">
      <input id="showStashesToggle" type="checkbox" />
      <span>Show Stash</span>
    </label>
    <label for="showBranchingsToggle">
      <input id="showBranchingsToggle" type="checkbox" />
      <span>Show Branchings &amp; Merges</span>
    </label>
    <div class="search-controls" aria-label="Search the loaded revision graph">
      <label class="search-field" for="searchInput">
        <span class="control-caption">Find</span>
        <input
          id="searchInput"
          class="search-input"
          type="text"
          placeholder="Find in graph..."
          aria-label="Find commits, branches, tags, and authors in the graph"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </label>
      <span class="search-result-badge" id="searchResultBadge" aria-live="polite">0 results</span>
      <button
        id="searchPrevButton"
        class="toolbar-button icon-only"
        type="button"
        title="Previous Search Result (Shift+Enter)"
        aria-label="Previous Search Result"
      >&uarr;</button>
      <button
        id="searchNextButton"
        class="toolbar-button icon-only"
        type="button"
        title="Next Search Result (Enter)"
        aria-label="Next Search Result"
      >&darr;</button>
      <button
        id="searchClearButton"
        class="toolbar-button icon-only"
        type="button"
        title="Clear Search"
        aria-label="Clear Search"
      >&times;</button>
    </div>
    <div class="toolbar-actions" aria-label="Graph actions">
      <button
        class="workspace-led clean"
        id="workspaceLed"
        type="button"
        disabled
        aria-label="Workspace clean: no pending changes."
        title="Workspace clean: no pending changes."
      ></button>
      <button
        id="fetchButton"
        class="toolbar-button"
        type="button"
        title="Fetch current repository"
        aria-label="Fetch current repository"
      >
        <span class="button-icon">↓</span>
        <span>Fetch</span>
      </button>
      <button
        id="reorganizeButton"
        class="toolbar-button"
        type="button"
        title="Reorganize graph layout"
        aria-label="Reorganize graph layout"
      >
        <span class="button-icon">=</span>
        <span>Reorganize</span>
      </button>
      <button
        id="zoomOutButton"
        class="toolbar-button icon-only"
        type="button"
        title="Zoom Out (Alt -)"
        aria-label="Zoom Out"
      >-</button>
      <button
        id="zoomInButton"
        class="toolbar-button icon-only"
        type="button"
        title="Zoom In (Alt +)"
        aria-label="Zoom In"
      >+</button>
    </div>
  </div>
  <div class="viewport" id="viewport">
    <div class="canvas" id="canvas">
      <div class="scene-layer" id="sceneLayer">
        <svg id="graphSvg" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="var(--edge)"></polygon>
            </marker>
          </defs>
          <g id="edgeLayer"></g>
        </svg>
        <div class="node-layer" id="nodeLayer"></div>
        <div class="status-card" id="statusCard" hidden></div>
      </div>
    </div>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <div class="loading-overlay" id="loadingOverlay" aria-hidden="false">
    <div class="loading-card" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div class="loading-message" id="loadingMessage">Opening revision graph...</div>
    </div>
  </div>
  ${renderRevisionGraphScript({ nonce })}
</body>
</html>`;
}

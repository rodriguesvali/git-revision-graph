import { renderRevisionGraphScript } from './revisionGraph/webview/script';
import { renderRevisionGraphStyles } from './revisionGraph/webview/styles';
import {
  createWebviewContentSecurityPolicy,
  createWebviewNonce
} from './webviewSecurity';

type ToolbarIconName =
  | 'arrow-down'
  | 'arrow-up'
  | 'chevron-down'
  | 'cloud-download'
  | 'close'
  | 'focus-range'
  | 'minus'
  | 'plus'
  | 'refresh'
  | 'repo-pull'
  | 'repo-push'
  | 'reset'
  | 'sync'
  | 'target';

function renderToolbarIcon(iconName: ToolbarIconName): string {
  switch (iconName) {
    case 'arrow-up':
      return `<svg class="toolbar-icon" data-icon="arrow-up" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 13V3"></path>
          <path d="M4.4 6.6 8 3l3.6 3.6"></path>
        </svg>`;
    case 'arrow-down':
      return `<svg class="toolbar-icon" data-icon="arrow-down" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 3v10"></path>
          <path d="M4.4 9.4 8 13l3.6-3.6"></path>
        </svg>`;
    case 'chevron-down':
      return `<svg class="toolbar-icon" data-icon="chevron-down" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4.6 6.2 8 9.6l3.4-3.4"></path>
        </svg>`;
    case 'close':
      return `<svg class="toolbar-icon" data-icon="close" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4.4 4.4 11.6 11.6"></path>
          <path d="M11.6 4.4 4.4 11.6"></path>
        </svg>`;
    case 'focus-range':
      return `<svg class="toolbar-icon" data-icon="focus-range" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="3.5" cy="8" r="1.5"></circle>
          <path d="M5.5 8h5"></path>
          <circle cx="12.5" cy="8" r="1.5"></circle>
        </svg>`;
    case 'minus':
      return `<svg class="toolbar-icon" data-icon="minus" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 8h8"></path>
        </svg>`;
    case 'plus':
      return `<svg class="toolbar-icon" data-icon="plus" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 4v8"></path>
          <path d="M4 8h8"></path>
        </svg>`;
    case 'reset':
      return `<svg class="toolbar-icon" data-icon="reset" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.2 5.4 4.8 4v8"></path>
          <circle cx="7.8" cy="6.2" r="0.45"></circle>
          <circle cx="7.8" cy="9.8" r="0.45"></circle>
          <path d="M10.2 5.4 11.8 4v8"></path>
        </svg>`;
    case 'target':
      return `<svg class="toolbar-icon" data-icon="target" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="5.3"></circle>
          <circle cx="8" cy="8" r="1.65"></circle>
        </svg>`;
    case 'sync':
      return `<svg class="toolbar-icon" data-icon="sync" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M12.4 5.2A4.8 4.8 0 0 0 4.1 3.9L3 5"></path>
          <path d="M3 2.2V5h2.8"></path>
          <path d="M3.6 10.8a4.8 4.8 0 0 0 8.3 1.3L13 11"></path>
          <path d="M13 13.8V11h-2.8"></path>
        </svg>`;
    case 'repo-pull':
      return `<svg class="toolbar-icon" data-icon="repo-pull" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 2v8.2"></path>
          <path d="M5.2 7.6 8 10.4l2.8-2.8"></path>
          <path d="M4 13.2h8"></path>
          <circle cx="4" cy="13.2" r="1"></circle>
          <circle cx="12" cy="13.2" r="1"></circle>
        </svg>`;
    case 'repo-push':
      return `<svg class="toolbar-icon" data-icon="repo-push" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 14V5.8"></path>
          <path d="M5.2 8.4 8 5.6l2.8 2.8"></path>
          <path d="M4 2.8h8"></path>
          <circle cx="4" cy="2.8" r="1"></circle>
          <circle cx="12" cy="2.8" r="1"></circle>
        </svg>`;
    case 'cloud-download':
      return `<svg class="toolbar-icon" data-icon="cloud-download" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M5.2 12.4H4.4a3 3 0 0 1-.2-6 4.1 4.1 0 0 1 7.8-1 3.4 3.4 0 0 1 .5 6.9h-1.7"></path>
          <path d="M8 6.7v6.1"></path>
          <path d="M5.6 10.4 8 12.8l2.4-2.4"></path>
        </svg>`;
    case 'refresh':
      return `<svg class="toolbar-icon" data-icon="refresh" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M12.6 6.2A4.7 4.7 0 1 0 13 8"></path>
          <path d="M12.8 2.8v3.6H9.2"></path>
        </svg>`;
  }
}

export function renderRevisionGraphShellHtml(): string {
  const nonce = createWebviewNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${createWebviewContentSecurityPolicy(nonce)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Git Revision Graph</title>
  ${renderRevisionGraphStyles()}
</head>
<body class="loading" aria-busy="true">
  <div class="view-controls" aria-label="Revision graph view controls">
    <label for="scopeSelect">
      <span class="control-caption">Scope</span>
      <select id="scopeSelect">
        <option value="all">All Refs</option>
        <option value="current">Current Branch</option>
        <option value="remoteHead">origin/HEAD</option>
        <option value="local">Local Branches</option>
      </select>
    </label>
    <div class="view-options" id="viewOptions">
      <button
        id="viewOptionsButton"
        class="toolbar-button"
        type="button"
        title="Show graph view options"
        aria-label="Show graph view options"
        aria-expanded="false"
        aria-controls="viewOptionsMenu"
      >
        <span class="button-icon">&#9776;</span>
        <span>View</span>
      </button>
      <div class="view-options-menu" id="viewOptionsMenu" role="menu" aria-label="Graph view options" hidden>
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
        <label for="showMergeCommitsToggle">
          <input id="showMergeCommitsToggle" type="checkbox" />
          <span>Show Merge Commits</span>
        </label>
        <label for="showMinimapToggle">
          <input id="showMinimapToggle" type="checkbox" />
          <span>Show Minimap</span>
        </label>
        <div class="view-options-section flow-governance-options" id="flowGovernanceOptions" hidden>
          <label for="flowGovernanceEnabledToggle">
            <input id="flowGovernanceEnabledToggle" type="checkbox" />
            <span>Flow Governance</span>
          </label>
        </div>
      </div>
    </div>
    <div class="search-controls toolbar-action-slot" aria-label="Search the loaded revision graph">
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
      >${renderToolbarIcon('arrow-up')}</button>
      <button
        id="searchNextButton"
        class="toolbar-button icon-only"
        type="button"
        title="Next Search Result (Enter)"
        aria-label="Next Search Result"
      >${renderToolbarIcon('arrow-down')}</button>
      <button
        id="searchClearButton"
        class="toolbar-button icon-only"
        type="button"
        title="Clear Search"
        aria-label="Clear Search"
      >${renderToolbarIcon('close')}</button>
    </div>
    <div class="toolbar-actions" aria-label="Graph actions">
      <div class="toolbar-action-slot" aria-label="Repository actions">
        <button
          id="centerHeadButton"
          class="toolbar-button icon-only"
          type="button"
          title="Center on HEAD"
          aria-label="Center on HEAD"
        >${renderToolbarIcon('target')}</button>
        <button
          id="syncButton"
          class="toolbar-button icon-only"
          type="button"
          title="Sync current branch"
          aria-label="Sync current branch"
        >${renderToolbarIcon('sync')}</button>
        <button
          id="pullButton"
          class="toolbar-button icon-only"
          type="button"
          title="Pull current branch"
          aria-label="Pull current branch"
        >${renderToolbarIcon('repo-pull')}</button>
        <span class="toolbar-split-button" role="group" aria-label="Push actions">
          <button
            id="pushButton"
            class="toolbar-button icon-only split-primary"
            type="button"
            title="Push current branch"
            aria-label="Push current branch"
          >${renderToolbarIcon('repo-push')}</button>
          <button
            id="pushMenuButton"
            class="toolbar-button icon-only split-menu"
            type="button"
            title="More push options"
            aria-label="More push options"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="pushModeMenu"
          >${renderToolbarIcon('chevron-down')}</button>
        </span>
        <button
          id="fetchAllButton"
          class="toolbar-button icon-only"
          type="button"
          title="Fetch all remotes"
          aria-label="Fetch all remotes"
        >${renderToolbarIcon('cloud-download')}</button>
        <span class="toolbar-split-button" role="group" aria-label="Reload actions">
          <button
            id="reloadButton"
            class="toolbar-button icon-only split-primary"
            type="button"
            title="Reload revision graph"
            aria-label="Reload revision graph"
          >${renderToolbarIcon('refresh')}</button>
          <button
            id="reloadMenuButton"
            class="toolbar-button icon-only split-menu"
            type="button"
            title="More reload options"
            aria-label="More reload options"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="reloadCacheMenu"
          >${renderToolbarIcon('chevron-down')}</button>
        </span>
      </div>
      <div class="toolbar-action-slot zoom-action-slot" aria-label="Zoom controls">
        <button
          id="zoomOutButton"
          class="toolbar-button icon-only"
          type="button"
          title="Zoom Out (Alt -)"
          aria-label="Zoom Out"
        >${renderToolbarIcon('minus')}</button>
        <button
          id="zoomResetButton"
          class="toolbar-button icon-only"
          type="button"
          title="Reset Zoom (Alt 0)"
          aria-label="Reset Zoom"
        >${renderToolbarIcon('reset')}</button>
        <button
          id="zoomInButton"
          class="toolbar-button icon-only"
          type="button"
          title="Zoom In (Alt +)"
          aria-label="Zoom In"
        >${renderToolbarIcon('plus')}</button>
      </div>
    </div>
    <div
      class="range-filter"
      id="rangeFilter"
      role="group"
      aria-label="Focus Range active"
      hidden
    >
      <span class="range-filter-icon" aria-hidden="true">${renderToolbarIcon('focus-range')}</span>
      <span class="range-filter-copy">
        <span class="range-filter-caption">Focus</span>
        <span class="range-filter-label" id="rangeFilterLabel"></span>
      </span>
      <button
        id="rangeFilterClearButton"
        class="toolbar-button icon-only"
        type="button"
        title="Exit Focus Range"
        aria-label="Exit Focus Range and show all revisions"
      >${renderToolbarIcon('close')}</button>
    </div>
    <div
      class="range-filter"
      id="descendantFilter"
      role="group"
      aria-label="Focus Descendants active"
      hidden
    >
      <span class="range-filter-icon" aria-hidden="true">${renderToolbarIcon('focus-range')}</span>
      <span class="range-filter-copy">
        <span class="range-filter-caption">Descendants</span>
        <span class="range-filter-label" id="descendantFilterLabel"></span>
      </span>
      <button
        id="descendantFilterClearButton"
        class="toolbar-button icon-only"
        type="button"
        title="Exit Focus Descendants"
        aria-label="Exit Focus Descendants and show all revisions"
      >${renderToolbarIcon('close')}</button>
    </div>
  </div>
  <div
    class="graph-minimap"
    id="graphMinimap"
    role="button"
    tabindex="0"
    title="Click or drag to navigate the graph overview"
    aria-label="Graph overview. Click or drag to navigate."
    hidden
  >
    <div class="minimap-controls" aria-label="Minimap zoom controls">
      <button
        id="minimapZoomOutButton"
        class="minimap-zoom-button"
        type="button"
        title="Zoom Out Minimap"
        aria-label="Zoom Out Minimap"
      >-</button>
      <button
        id="minimapZoomResetButton"
        class="minimap-zoom-button"
        type="button"
        title="Reset Minimap Zoom"
        aria-label="Reset Minimap Zoom"
      >0</button>
      <button
        id="minimapZoomInButton"
        class="minimap-zoom-button"
        type="button"
        title="Zoom In Minimap"
        aria-label="Zoom In Minimap"
      >+</button>
    </div>
    <svg id="minimapSvg" viewBox="0 0 180 240" aria-hidden="true">
      <g id="minimapEdgeLayer"></g>
      <g id="minimapNodeLayer"></g>
      <rect id="minimapViewport" class="minimap-viewport" x="0" y="0" width="0" height="0"></rect>
    </svg>
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
        <div class="status-card" id="statusCard" hidden>
          <div class="status-message" id="statusMessage"></div>
          <button class="status-action" id="statusActionButton" type="button" hidden></button>
        </div>
      </div>
    </div>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <div class="reference-tooltip" id="referenceTooltip" role="dialog" aria-label="Reference details" hidden></div>
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

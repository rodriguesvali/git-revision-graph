import { RevisionGraphProjectionOptions, RevisionGraphScene } from './revisionGraphData';
import { renderRevisionGraphScript } from './revisionGraph/webview/script';
import { renderRevisionGraphStyles } from './revisionGraph/webview/styles';
import {
  GRAPH_PADDING_BOTTOM,
  GRAPH_PADDING_TOP,
  NODE_MIN_WIDTH,
  NODE_PADDING_X,
  ROW_HEIGHT,
  buildNodeLayouts,
  createNonce,
  createReferenceId,
  escapeHtml,
  renderEdge,
  renderNode
} from './revisionGraph/webview/shared';

export function renderRevisionGraphHtml(
  scene: RevisionGraphScene,
  currentHeadName: string | undefined,
  currentHeadUpstreamName: string | undefined,
  isWorkspaceDirty: boolean,
  projectionOptions: RevisionGraphProjectionOptions,
  mergeBlockedTargets: readonly string[],
  primaryAncestorPathsByHash: Readonly<Record<string, readonly string[]>>,
  autoArrangeOnInit: boolean
): string {
  const nonce = createNonce();
  const workspaceStatusTooltip = isWorkspaceDirty
    ? 'Workspace dirty: click to open Source Control Changes.'
    : 'Workspace clean: no pending changes.';
  const nodeLayouts = buildNodeLayouts(scene);
  const width = Math.max(
    880,
    nodeLayouts.reduce((max, node) => Math.max(max, node.defaultLeft + node.width + NODE_PADDING_X), 0)
  );
  const height = Math.max(480, scene.rowCount * ROW_HEIGHT + GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM);
  const zoomLevels = [0.6, 0.8, 1, 1.25, 1.5];
  const nodeLayoutByHash = new Map(nodeLayouts.map((node) => [node.hash, node] as const));
  const references = scene.nodes.flatMap((node) =>
    node.refs.map((ref) => ({
      id: createReferenceId(node.hash, ref.kind, ref.name),
      hash: node.hash,
      name: ref.name,
      kind: ref.kind,
      title: ref.name
    }))
  );
  const sceneLayoutKey = scene.nodes.map((node) => `${node.hash}:${node.row}:${Math.round(node.x)}`).join('|');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GIT Revision Graph</title>
  ${renderRevisionGraphStyles(width, height)}
</head>
<body>
  <div class="view-controls" aria-label="Revision graph view controls">
    <label for="scopeSelect">
      <span class="control-caption">Scope</span>
      <select id="scopeSelect">
        <option value="all" ${projectionOptions.refScope === 'all' ? 'selected' : ''}>All Refs</option>
        <option value="current" ${projectionOptions.refScope === 'current' ? 'selected' : ''}>Current Branch</option>
        <option value="local" ${projectionOptions.refScope === 'local' ? 'selected' : ''}>Local Branches</option>
      </select>
    </label>
    <label for="showTagsToggle">
      <input id="showTagsToggle" type="checkbox" ${projectionOptions.showTags ? 'checked' : ''} />
      <span>Show Tags</span>
    </label>
    <label for="showBranchingsToggle">
      <input
        id="showBranchingsToggle"
        type="checkbox"
        ${projectionOptions.showBranchingsAndMerges ? 'checked' : ''}
      />
      <span>Show Branchings &amp; Merges</span>
    </label>
    <div class="toolbar-actions" aria-label="Graph actions">
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
  <button
    class="workspace-led ${isWorkspaceDirty ? 'dirty' : 'clean'}"
    id="workspaceLed"
    type="button"
    ${isWorkspaceDirty ? '' : 'disabled'}
    aria-label="${escapeHtml(workspaceStatusTooltip)}"
    title="${escapeHtml(workspaceStatusTooltip)}"
  ></button>
  <div class="viewport" id="viewport">
    <div class="canvas" id="canvas">
      <div class="scene-layer" id="sceneLayer">
        <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="var(--edge)"></polygon>
            </marker>
          </defs>
          ${scene.edges.map((edge) => renderEdge(edge, nodeLayoutByHash)).join('')}
        </svg>
        ${scene.nodes.map((node) => renderNode(node, nodeLayoutByHash.get(node.hash)?.width ?? NODE_MIN_WIDTH, nodeLayoutByHash.get(node.hash)?.defaultLeft ?? NODE_PADDING_X)).join('')}
      </div>
    </div>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <div class="loading-overlay" id="loadingOverlay" aria-hidden="true">
    <div class="loading-card" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div class="loading-message" id="loadingMessage">Loading revision graph...</div>
    </div>
  </div>
  ${renderRevisionGraphScript({
    nonce,
    references,
    currentHeadName,
    currentHeadUpstreamName,
    isWorkspaceDirty,
    projectionOptions,
    autoArrangeOnInit,
    mergeBlockedTargets,
    zoomLevels,
    graphNodes: nodeLayouts,
    graphEdges: scene.edges,
    primaryAncestorPathsByHash,
    sceneLayoutKey,
    baseCanvasWidth: width,
    baseCanvasHeight: height
  })}
</body>
</html>`;
}

export function renderEmptyHtml(hasRepositories: boolean): string {
  const message = hasRepositories
    ? 'Choose a repository from the view toolbar to load the revision graph.'
    : 'Open a workspace with a Git repository to view the revision graph.';

  return `<!DOCTYPE html><html lang="en"><body style="font-family: sans-serif; padding: 24px;"><h2>GIT Revision Graph</h2><p>${message}</p></body></html>`;
}

export function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html><html lang="en"><body style="font-family: sans-serif; padding: 24px;"><h2>GIT Revision Graph</h2><p>${escapeHtml(message)}</p></body></html>`;
}

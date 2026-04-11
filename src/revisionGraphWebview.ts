import { RevisionGraphEdge, RevisionGraphNode, RevisionGraphScene } from './revisionGraphData';
import { RevisionGraphAncestorFilter } from './revisionGraphTypes';

const LANE_WIDTH = 220;
const ROW_HEIGHT = 140;
const NODE_MIN_WIDTH = 180;
const NODE_MAX_WIDTH = 420;
const NODE_CONTENT_CHAR_WIDTH = 8.2;
const NODE_WIDTH_PADDING = 62;
const NODE_HORIZONTAL_GAP = 28;
const NODE_PADDING_X = 26;
const NODE_PADDING_Y = 24;
const VIEWPORT_PADDING_TOP = 18;
const VIEWPORT_PADDING_RIGHT = 18;
const VIEWPORT_PADDING_BOTTOM = 18;
const VIEWPORT_PADDING_LEFT = 18;

export function renderRevisionGraphHtml(
  repositoryLabel: string,
  scene: RevisionGraphScene,
  currentHeadName: string | undefined,
  currentHeadUpstreamName: string | undefined,
  isWorkspaceDirty: boolean,
  ancestorFilter: RevisionGraphAncestorFilter | undefined,
  mergeBlockedTargets: readonly string[],
  primaryAncestorPathsByHash: Readonly<Record<string, readonly string[]>>,
  autoArrangeOnInit: boolean
): string {
  const nonce = createNonce();
  const workspaceStatusTooltip = isWorkspaceDirty
    ? 'Workspace dirty: click to open Source Control Changes.'
    : 'Workspace clean: no pending changes.';
  const nodeLayouts = scene.nodes.map((node) => ({
    hash: node.hash,
    row: node.row,
    lane: node.lane,
    width: getNodeWidth(node)
  }));
  const maxNodeWidth = nodeLayouts.reduce((max, node) => Math.max(max, node.width), NODE_MIN_WIDTH);
  const laneSpan = Math.max(LANE_WIDTH, maxNodeWidth + NODE_HORIZONTAL_GAP);
  const nodeLayoutsWithPosition = nodeLayouts.map((node) => ({
    ...node,
    defaultLeft: NODE_PADDING_X + node.lane * laneSpan
  }));
  const width = Math.max(
    880,
    nodeLayoutsWithPosition.reduce((max, node) => Math.max(max, node.defaultLeft + node.width + NODE_PADDING_X), 0)
  );
  const height = Math.max(480, scene.rowCount * ROW_HEIGHT + NODE_PADDING_Y * 2);
  const zoomLevels = [0.6, 0.8, 1, 1.25, 1.5];
  const nodeLayoutByHash = new Map(nodeLayoutsWithPosition.map((node) => [node.hash, node] as const));
  const referenceData = JSON.stringify(
    scene.nodes.flatMap((node) =>
      node.refs.map((ref) => ({
        id: createReferenceId(node.hash, ref.kind, ref.name),
        hash: node.hash,
        name: ref.name,
        kind: ref.kind,
        title: ref.name
      }))
    )
  );
  const graphNodeData = JSON.stringify(
    nodeLayoutsWithPosition
  );
  const graphEdgeData = JSON.stringify(
    scene.edges.map((edge) => ({
      from: edge.from,
      to: edge.to
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GIT Revision Graph</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-sideBar-background));
      --panel-strong: color-mix(in srgb, var(--panel) 80%, black 6%);
      --border: var(--vscode-panel-border);
      --muted: var(--vscode-descriptionForeground);
      --text: var(--vscode-editor-foreground);
      --accent: var(--vscode-focusBorder);
      --edge: color-mix(in srgb, var(--text) 55%, transparent);
      --node-branch: #ffd79a;
      --node-head: #d62828;
      --node-tag: #f7f300;
      --node-remote: #f6d8a8;
      --node-mixed: color-mix(in srgb, var(--panel) 94%, white 6%);
      --node-text-dark: #181818;
      --workspace-clean: #2dff63;
      --workspace-dirty: #ff3b30;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 5%, transparent) 1px, transparent 1px) 0 0/44px 44px,
        linear-gradient(color-mix(in srgb, var(--accent) 5%, transparent) 1px, transparent 1px) 0 0/44px 44px,
        radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 12%, transparent), transparent 28%),
        var(--bg);
      font-family: var(--vscode-font-family);
      overflow: hidden;
    }
    body.loading {
      cursor: progress;
    }
    button, select {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
    }
    button:disabled { opacity: 0.45; cursor: default; }
    .viewport {
      position: relative;
      height: 100vh;
      overflow: auto;
      padding: ${VIEWPORT_PADDING_TOP}px ${VIEWPORT_PADDING_RIGHT}px ${VIEWPORT_PADDING_BOTTOM}px ${VIEWPORT_PADDING_LEFT}px;
      cursor: grab;
    }
    .viewport.dragging {
      cursor: grabbing;
      user-select: none;
    }
    body.node-dragging,
    body.node-dragging * {
      cursor: grabbing !important;
    }
    .canvas { position: relative; width: ${width}px; height: ${height}px; transform-origin: top left; }
    .scene-layer { position: absolute; width: ${width}px; height: ${height}px; transform-origin: top left; }
    svg { position: absolute; inset: 0; overflow: visible; }
    .node {
      position: absolute; min-width: ${NODE_MIN_WIDTH}px; border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.18); box-shadow: 0 7px 18px rgba(0, 0, 0, 0.12);
      color: var(--node-text-dark); cursor: inherit; user-select: none; overflow: hidden;
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, outline-color 120ms ease;
    }
    .viewport.dragging .node { cursor: grabbing; }
    .node:hover { transform: translateY(-1px); }
    .node.selected {
      outline: 3px solid color-mix(in srgb, var(--accent) 60%, transparent);
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 42%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18), 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .node.related {
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 28%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.15), 0 0 0 2px color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .node.related.ancestor-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 46%, var(--text) 18%);
    }
    .node.related.descendant-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 68%, white 10%);
    }
    .node.related.ancestor-related.descendant-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 58%, white 12%);
    }
    .node-head { background: var(--node-head); color: white; }
    .node-branch { background: var(--node-branch); }
    .node-tag { background: var(--node-tag); }
    .node-remote { background: var(--node-remote); }
    .node-mixed { background: var(--node-mixed); }
    .graph-edge {
      transition: stroke 120ms ease, stroke-width 120ms ease, opacity 120ms ease;
    }
    .graph-edge.related {
      stroke: color-mix(in srgb, var(--accent) 66%, white 10%);
      stroke-width: 3.4;
      opacity: 1;
    }
    .graph-edge.related.ancestor-path {
      stroke: color-mix(in srgb, var(--accent) 58%, var(--text) 16%);
    }
    .graph-edge.related.descendant-path {
      stroke: color-mix(in srgb, var(--accent) 78%, white 8%);
    }
    .graph-edge.muted {
      opacity: 0.18;
    }
    .ref-line {
      padding: 8px 12px;
      font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    }
    .ref-line + .ref-line {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }
    .ref-line.kind-head {
      background: color-mix(in srgb, var(--node-head) 92%, white 8%);
      color: white;
      font-weight: 700;
    }
    .ref-line.kind-branch {
      background: color-mix(in srgb, var(--node-branch) 88%, white 12%);
    }
    .ref-line.kind-tag {
      background: color-mix(in srgb, var(--node-tag) 90%, white 10%);
      font-weight: 700;
    }
    .ref-line.kind-remote {
      background: color-mix(in srgb, var(--node-remote) 88%, white 12%);
    }
    .ref-line.base { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.55); font-weight: 700; }
    .ref-line.compare { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.25); text-decoration: underline; }
    .base-suffix { display: none; }
    .ref-line.base.has-compare .base-suffix { display: inline; }
    .context-menu {
      position: fixed;
      z-index: 60;
      min-width: 220px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      padding: 6px;
      display: none;
    }
    .context-menu.open { display: block; }
    .context-item {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      color: var(--text);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
    }
    .context-item:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
    .context-item:disabled { opacity: 0.45; cursor: default; }
    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      backdrop-filter: blur(3px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }
    body.loading .loading-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    .loading-card {
      min-width: 240px;
      max-width: min(360px, calc(100vw - 48px));
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
    }
    .loading-spinner {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      border-radius: 999px;
      border: 2px solid color-mix(in srgb, var(--accent) 18%, transparent);
      border-top-color: var(--accent);
      border-right-color: color-mix(in srgb, var(--accent) 74%, transparent);
      animation: graph-spin 0.78s linear infinite;
    }
    .loading-message {
      color: var(--text);
      font-size: 13px;
      line-height: 1.35;
    }
    @keyframes graph-spin {
      to { transform: rotate(360deg); }
    }
    .node.dragging {
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
      transform: translateY(-1px);
    }
    .node-grip {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 22px;
      height: 22px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      padding: 0;
      line-height: 0;
      appearance: none;
      -webkit-appearance: none;
      z-index: 2;
    }
    .node-grip::before {
      content: '';
      width: 2px;
      height: 2px;
      border-radius: 999px;
      opacity: 0.55;
      box-shadow:
        -3px -4px 0 currentColor,
        3px -4px 0 currentColor,
        -3px 0 0 currentColor,
        3px 0 0 currentColor,
        -3px 4px 0 currentColor,
        3px 4px 0 currentColor;
    }
    .node-grip:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .node-grip:active,
    .node.dragging .node-grip {
      cursor: grabbing;
    }
    .workspace-led {
      position: fixed;
      top: 14px;
      right: 44px;
      z-index: 70;
      width: 30px;
      height: 30px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--bg) 30%, black 28%);
      background: var(--workspace-clean);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
        0 0 20px color-mix(in srgb, var(--workspace-clean) 62%, transparent),
        inset 0 1px 2px rgba(255, 255, 255, 0.35);
      appearance: none;
      -webkit-appearance: none;
      transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }
    .workspace-led.clean {
      cursor: default;
    }
    .workspace-led.dirty {
      background: var(--workspace-dirty);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
        0 0 22px color-mix(in srgb, var(--workspace-dirty) 68%, transparent),
        inset 0 1px 2px rgba(255, 255, 255, 0.25);
      cursor: pointer;
      animation: workspace-led-pulse 1.7s ease-in-out infinite;
    }
    .workspace-led.dirty:hover {
      transform: scale(1.08);
    }
    .workspace-led:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 78%, white 8%);
      outline-offset: 3px;
    }
    @keyframes workspace-led-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
          0 0 18px color-mix(in srgb, var(--workspace-dirty) 58%, transparent),
          inset 0 1px 2px rgba(255, 255, 255, 0.24);
      }
      50% {
        box-shadow:
          0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
          0 0 30px color-mix(in srgb, var(--workspace-dirty) 82%, transparent),
          inset 0 1px 2px rgba(255, 255, 255, 0.32);
      }
    }
  </style>
</head>
<body>
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
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const references = ${referenceData};
    const currentHeadName = ${JSON.stringify(currentHeadName ?? null)};
    const currentHeadUpstreamName = ${JSON.stringify(currentHeadUpstreamName ?? null)};
    const isWorkspaceDirty = ${JSON.stringify(isWorkspaceDirty)};
    const activeAncestorFilter = ${JSON.stringify(ancestorFilter ?? null)};
    const autoArrangeOnInit = ${JSON.stringify(autoArrangeOnInit)};
    const mergeBlockedTargets = new Set(${JSON.stringify(mergeBlockedTargets)});
    const zoomLevels = ${JSON.stringify(zoomLevels)};
    const graphNodes = ${graphNodeData};
    const graphEdges = ${graphEdgeData};
    const selected = [];
    const headReference =
      references.find((ref) => ref.kind === 'head') ||
      references.find((ref) => currentHeadName && ref.name === currentHeadName) ||
      null;
    const headNodeHash = headReference ? headReference.hash : null;
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const sceneLayer = document.getElementById('sceneLayer');
    const contextMenu = document.getElementById('contextMenu');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const workspaceLed = document.getElementById('workspaceLed');
    const nodeElements = new Map(
      Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
    );
    const edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
    const graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
    const parentMap = buildDirectionalMap(graphEdges, 'from', 'to');
    const childMap = buildDirectionalMap(graphEdges, 'to', 'from');
    const headDistanceByHash = headNodeHash ? buildDistanceMap(headNodeHash, parentMap) : new Map();
    const primaryAncestorPathsByHash = ${JSON.stringify(primaryAncestorPathsByHash)};
    const sceneLayoutKey = ${JSON.stringify(
      scene.nodes.map((node) => `${node.hash}:${node.row}:${node.lane}`).join('|')
    )};
    const storedState = vscode.getState() || {};
    const nodeOffsets = storedState.sceneLayoutKey === sceneLayoutKey
      ? Object.assign({}, storedState.nodeOffsets || {})
      : {};
    const baseCanvasWidth = ${width};
    const baseCanvasHeight = ${height};
    let currentZoom = 1;
    let layoutOffsetX = 0;
    let layoutOffsetY = 0;
    let dragState = null;
    let nodeDragState = null;
    let suppressNodeClick = false;
    for (const element of document.querySelectorAll('[data-ref-id]')) {
      element.addEventListener('click', (event) => {
        if (suppressNodeClick) {
          suppressNodeClick = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const refId = element.getAttribute('data-ref-id');
        const additive = event.ctrlKey || event.metaKey;
        if (!refId) return;
        const existingIndex = selected.indexOf(refId);
        if (!additive && selected.length === 1 && existingIndex === 0) {
          selected.splice(0, selected.length);
        } else if (!additive) {
          selected.splice(0, selected.length, refId);
        } else if (existingIndex >= 0) {
          selected.splice(existingIndex, 1);
        } else if (selected.length < 2) {
          selected.push(refId);
        } else {
          selected.splice(0, selected.length, selected[1], refId);
        }
        closeContextMenu();
        syncSelection();
      });
      element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const refId = element.getAttribute('data-ref-id');
        if (!refId) return;
        const target = getReference(refId);
        if (!target) return;
        openContextMenu(event.clientX, event.clientY, target);
      });
    }
    for (const grip of document.querySelectorAll('[data-node-grip]')) {
      grip.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
          return;
        }
        const node = grip.closest('[data-node-hash]');
        const hash = node ? node.getAttribute('data-node-hash') : undefined;
        if (!node || !hash) {
          return;
        }
        nodeDragState = {
          hash,
          element: node,
          startX: event.clientX,
          startOffset: Number(nodeOffsets[hash] || 0)
        };
        document.body.classList.add('node-dragging');
        node.classList.add('dragging');
        closeContextMenu();
        event.preventDefault();
        event.stopPropagation();
      });
    }
    if (workspaceLed && isWorkspaceDirty) {
      workspaceLed.addEventListener('click', () => {
        vscode.postMessage({ type: 'open-source-control' });
      });
    }

    viewport.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        moved: false
      };
      viewport.classList.add('dragging');
      closeContextMenu();
      event.preventDefault();
    });
    viewport.addEventListener('scroll', syncMinimap);
    viewport.addEventListener('scroll', closeContextMenu);
    viewport.addEventListener('contextmenu', (event) => {
      if (event.target.closest('[data-node-hash]')) {
        return;
      }
      event.preventDefault();
      openBoardContextMenu(event.clientX, event.clientY);
    });
    window.addEventListener('resize', () => {
      syncCanvasSize();
      updateScenePlacement();
      syncMinimap();
      closeContextMenu();
    });
    window.addEventListener('mousemove', (event) => {
      if (nodeDragState) {
        const defaultLeft = getDefaultNodeLeft(nodeDragState.hash);
        const rawOffset = nodeDragState.startOffset + (event.clientX - nodeDragState.startX) / currentZoom;
        nodeOffsets[nodeDragState.hash] = clampNodeOffset(nodeDragState.hash, defaultLeft, rawOffset);
        applyNodeLayout(false);
        return;
      }
      if (!dragState) {
        return;
      }
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        dragState.moved = true;
        suppressNodeClick = true;
      }
      viewport.scrollLeft = dragState.scrollLeft - dx;
      viewport.scrollTop = dragState.scrollTop - dy;
      syncMinimap();
    });
    window.addEventListener('mouseup', () => {
      if (nodeDragState) {
        document.body.classList.remove('node-dragging');
        nodeDragState.element.classList.remove('dragging');
        persistNodeLayout();
        nodeDragState = null;
      }
      if (!dragState) {
        return;
      }
      viewport.classList.remove('dragging');
      if (!dragState.moved) {
        suppressNodeClick = false;
      } else {
        setTimeout(() => {
          suppressNodeClick = false;
        }, 0);
      }
      dragState = null;
    });
    window.addEventListener('click', (event) => {
      if (!contextMenu.contains(event.target)) {
        closeContextMenu();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
          event.preventDefault();
          zoomIn();
          return;
        }
        if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
          event.preventDefault();
          zoomOut();
          return;
        }
        if (event.key === '0' || event.code === 'Numpad0') {
          event.preventDefault();
          setZoom(1);
          return;
        }
      }
      if (event.key === 'Escape') {
        closeContextMenu();
        if (nodeDragState) {
          document.body.classList.remove('node-dragging');
          nodeDragState.element.classList.remove('dragging');
          nodeDragState = null;
          applyNodeLayout(false);
        }
      }
    });
    setZoom(1);
    applyNodeLayout(false);
    syncSelection();
    requestAnimationFrame(() => {
      if (autoArrangeOnInit) {
        autoArrangeLayout();
      }
      centerGraphInViewport();
    });

    function setZoom(zoom) {
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      syncCanvasSize();
      applyNodeLayout(false);
      syncMinimap();
    }

    function zoomIn() {
      const nextZoom = zoomLevels.find((value) => value > currentZoom);
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function zoomOut() {
      const previousLevels = zoomLevels.filter((value) => value < currentZoom);
      const nextZoom = previousLevels.length > 0 ? previousLevels[previousLevels.length - 1] : undefined;
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function syncSelection() {
      for (const element of document.querySelectorAll('[data-ref-id]')) {
        const refId = element.getAttribute('data-ref-id');
        element.classList.toggle('base', refId === selected[0]);
        element.classList.toggle('compare', refId === selected[1]);
        element.classList.toggle('has-compare', selected.length === 2 && refId === selected[0]);
      }
      syncRelationshipHighlights();
      syncMinimap();
    }

    function syncRelationshipHighlights() {
      const anchorReference = selected[0] ? getReference(selected[0]) : undefined;
      const anchorHash = anchorReference ? anchorReference.hash : null;
      const ancestorPath = anchorHash ? getPrimaryAncestorPath(anchorHash) : [];
      const descendantPath = anchorHash ? tracePrimaryPath(anchorHash, 'descendant') : [];
      const ancestorHashes = new Set(ancestorPath);
      const descendantHashes = new Set(descendantPath);
      const relatedHashes = new Set([...ancestorHashes, ...descendantHashes]);
      const ancestorEdgeKeys = buildPathEdgeKeys(ancestorPath, 'ancestor');
      const descendantEdgeKeys = buildPathEdgeKeys(descendantPath, 'descendant');

      for (const [hash, element] of nodeElements.entries()) {
        const isAncestorRelated = !!anchorHash && anchorHash !== hash && ancestorHashes.has(hash);
        const isDescendantRelated = !!anchorHash && anchorHash !== hash && descendantHashes.has(hash);
        element.classList.toggle('selected', anchorHash === hash);
        element.classList.toggle('related', !!anchorHash && anchorHash !== hash && relatedHashes.has(hash));
        element.classList.toggle('ancestor-related', isAncestorRelated);
        element.classList.toggle('descendant-related', isDescendantRelated);
      }

      for (const element of edgeElements) {
        const fromHash = element.getAttribute('data-edge-from');
        const toHash = element.getAttribute('data-edge-to');
        const edgeKey = fromHash && toHash ? fromHash + '->' + toHash : '';
        const isAncestorPath = !!anchorHash && ancestorEdgeKeys.has(edgeKey);
        const isDescendantPath = !!anchorHash && descendantEdgeKeys.has(edgeKey);
        const isRelated = isAncestorPath || isDescendantPath;

        element.classList.toggle('related', isRelated);
        element.classList.toggle('ancestor-path', isAncestorPath);
        element.classList.toggle('descendant-path', isDescendantPath);
        element.classList.toggle('muted', !!anchorHash && !isRelated);
      }
    }

    function openContextMenu(clientX, clientY, target) {
      const base = selected[0] ? getReference(selected[0]) : undefined;
      const compare = selected[1] ? getReference(selected[1]) : undefined;
      const isCurrentHead = target.kind === 'head' || (currentHeadName && target.name === currentHeadName);
      const canSyncCurrentHead = target.kind === 'head' && !!currentHeadUpstreamName;
      const matchesActiveAncestorFilter =
        !!activeAncestorFilter &&
        activeAncestorFilter.refName === target.name &&
        activeAncestorFilter.refKind === target.kind;
      const hasComparisonSelection =
        selected.length === 2 &&
        base &&
        compare &&
        (base.id === target.id || compare.id === target.id);

      contextMenu.innerHTML = '';
      if (hasComparisonSelection) {
        appendMenuItem('Compare', () => {
          vscode.postMessage({
            type: 'compare-selected',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Show Log', () => {
          vscode.postMessage({
            type: 'show-log',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Unified Diff', () => {
          vscode.postMessage({
            type: 'open-unified-diff',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        appendMenuItem('Compare With Worktree', () => {
          vscode.postMessage({ type: 'compare-with-worktree', refName: target.name });
        });
        if (matchesActiveAncestorFilter) {
          appendMenuItem('Clear Filter', () => {
            postMessageWithLoading({ type: 'clear-ancestor-filter' }, 'Loading all references...');
          });
        } else if (activeAncestorFilter) {
          appendMenuItem('Filter Ancestors From This Ref', () => {
            postMessageWithLoading({
              type: 'filter-ancestor-refs',
              refName: target.name,
              refKind: target.kind
            }, 'Filtering ancestors of ' + target.name + '...');
          });
        } else {
          appendMenuItem('Filter Ancestors', () => {
            postMessageWithLoading({
              type: 'filter-ancestor-refs',
              refName: target.name,
              refKind: target.kind
            }, 'Filtering ancestors of ' + target.name + '...');
          });
        }
        if (target.kind !== 'tag') {
          appendMenuItem('Checkout', () => {
            vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
          });
        }
        if (canSyncCurrentHead) {
          appendMenuItem('Sync with ' + currentHeadUpstreamName, () => {
            vscode.postMessage({ type: 'sync-current-head' });
          });
        }
        appendMenuItem('Create New Branch', () => {
          vscode.postMessage({ type: 'create-branch', refName: target.name, refKind: target.kind });
        });
        if (!isCurrentHead) {
          if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
            const deleteLabel = target.kind === 'tag'
              ? 'Delete Tag: ' + target.name
              : target.kind === 'remote'
                ? 'Delete Remote Branch: ' + target.name
                : 'Delete Branch: ' + target.name;
            appendMenuItem(deleteLabel, () => {
              vscode.postMessage({ type: 'delete', refName: target.name, refKind: target.kind });
            });
          }
          if (!mergeBlockedTargets.has(target.kind + '::' + target.name)) {
            appendMenuItem('Merge Into ' + (currentHeadName || 'Current HEAD'), () => {
              vscode.postMessage({ type: 'merge', refName: target.name });
            });
          }
        }
        if (activeAncestorFilter && !matchesActiveAncestorFilter) {
          appendMenuItem('Show All References', () => {
            postMessageWithLoading({ type: 'clear-ancestor-filter' }, 'Loading all references...');
          });
        }
        if (selected.length > 0) {
          appendMenuItem('Clear Selection', () => {
            selected.splice(0, selected.length);
            syncSelection();
          });
        }
      }
      contextMenu.style.left = clientX + 'px';
      contextMenu.style.top = clientY + 'px';
      contextMenu.classList.add('open');
    }

    function openBoardContextMenu(clientX, clientY) {
      const canZoomIn = zoomLevels.some((value) => value > currentZoom);
      const canZoomOut = zoomLevels.some((value) => value < currentZoom);
      contextMenu.innerHTML = '';
      appendMenuItem('Reorganize', () => {
        autoArrangeLayout();
        centerGraphInViewport();
      });
      appendMenuItem('Zoom Out [ Alt - ]', () => {
        zoomOut();
        centerGraphInViewport();
      }, !canZoomOut);
      appendMenuItem('Zoom In [ Alt + ]', () => {
        zoomIn();
        centerGraphInViewport();
      }, !canZoomIn);
      contextMenu.style.left = clientX + 'px';
      contextMenu.style.top = clientY + 'px';
      contextMenu.classList.add('open');
    }

    function appendMenuItem(label, onClick, disabled = false) {
      const button = document.createElement('button');
      button.className = 'context-item';
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener('click', () => {
        onClick();
        closeContextMenu();
      });
      contextMenu.appendChild(button);
    }

    function closeContextMenu() {
      contextMenu.classList.remove('open');
      contextMenu.innerHTML = '';
    }

    function postMessageWithLoading(message, label) {
      showLoading(label);
      requestAnimationFrame(() => {
        vscode.postMessage(message);
      });
    }

    function showLoading(label) {
      if (typeof label === 'string' && loadingMessage) {
        loadingMessage.textContent = label;
      }
      if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'false');
      }
      document.body.classList.add('loading');
      document.body.setAttribute('aria-busy', 'true');
      closeContextMenu();
    }

    function applyNodeLayout(persist = true) {
      for (const [hash, element] of nodeElements.entries()) {
        const defaultLeft = getDefaultNodeLeft(hash);
        const left = clampNodeLeft(hash, defaultLeft + Number(nodeOffsets[hash] || 0));
        nodeOffsets[hash] = left - defaultLeft;
        element.style.left = left + 'px';
      }
      updateEdges(edgeElements);
      updateScenePlacement();
      if (persist) {
        persistNodeLayout();
      }
      syncMinimap();
    }

    function persistNodeLayout() {
      const normalizedOffsets = {};
      for (const [hash] of nodeElements.entries()) {
        const offset = Number(nodeOffsets[hash] || 0);
        if (Math.abs(offset) > 0.5) {
          normalizedOffsets[hash] = offset;
        }
      }
      vscode.setState({ sceneLayoutKey, nodeOffsets: normalizedOffsets });
    }

    function autoArrangeLayout() {
      const positions = new Map(graphNodes.map((node) => [node.hash, node.defaultLeft]));
      const neighborMap = buildNeighborMap();
      for (let pass = 0; pass < 8; pass += 1) {
        relaxPositions(positions, graphNodes, neighborMap, false);
        relaxPositions(positions, [...graphNodes].reverse(), neighborMap, true);
        compactHorizontalSpread(positions, neighborMap);
        resolveRowOverlaps(positions);
      }
      for (const node of graphNodes) {
        const nextLeft = clampNodeLeft(node.hash, positions.get(node.hash) || node.defaultLeft);
        positions.set(node.hash, nextLeft);
        nodeOffsets[node.hash] = nextLeft - node.defaultLeft;
      }
      applyNodeLayout();
    }

    function buildNeighborMap() {
      const map = new Map();
      for (const node of graphNodes) {
        map.set(node.hash, []);
      }
      for (const edge of graphEdges) {
        if (map.has(edge.from)) {
          map.get(edge.from).push(edge.to);
        }
        if (map.has(edge.to)) {
          map.get(edge.to).push(edge.from);
        }
      }
      return map;
    }

    function buildDirectionalMap(edges, sourceKey, targetKey) {
      const map = new Map();
      for (const node of graphNodes) {
        map.set(node.hash, []);
      }
      for (const edge of edges) {
        const source = edge[sourceKey];
        const target = edge[targetKey];
        if (!map.has(source)) {
          map.set(source, []);
        }
        map.get(source).push(target);
      }
      return map;
    }

    function buildDistanceMap(startHash, adjacencyMap) {
      const distances = new Map([[startHash, 0]]);
      const queue = [startHash];
      while (queue.length > 0) {
        const hash = queue.shift();
        if (!hash) {
          continue;
        }
        const baseDistance = distances.get(hash) || 0;
        const nextHashes = adjacencyMap.get(hash) || [];
        for (const nextHash of nextHashes) {
          if (!distances.has(nextHash)) {
            distances.set(nextHash, baseDistance + 1);
            queue.push(nextHash);
          }
        }
      }
      return distances;
    }

    function getPrimaryAncestorPath(startHash) {
      const precomputedPath = primaryAncestorPathsByHash[startHash];
      return Array.isArray(precomputedPath) && precomputedPath.length > 0
        ? precomputedPath
        : tracePrimaryPath(startHash, 'ancestor');
    }

    function tracePrimaryPath(startHash, direction) {
      const path = [startHash];
      const visited = new Set(path);
      let currentHash = startHash;

      while (true) {
        const nextHash = selectPrimaryNeighbor(currentHash, visited, direction);
        if (!nextHash) {
          break;
        }
        path.push(nextHash);
        visited.add(nextHash);
        currentHash = nextHash;
      }

      return path;
    }

    function selectPrimaryNeighbor(currentHash, visited, direction) {
      const adjacencyMap = direction === 'ancestor' ? parentMap : childMap;
      const candidates = (adjacencyMap.get(currentHash) || []).filter((hash) => !visited.has(hash));
      if (candidates.length === 0) {
        return undefined;
      }

      const preferredCandidates = filterPreferredCandidates(currentHash, candidates, direction);
      const pool = preferredCandidates.length > 0 ? preferredCandidates : candidates;
      return [...pool].sort((leftHash, rightHash) =>
        scorePathCandidate(currentHash, leftHash, direction) - scorePathCandidate(currentHash, rightHash, direction)
      )[0];
    }

    function filterPreferredCandidates(currentHash, candidates, direction) {
      if (direction === 'descendant') {
        const onHeadPath = candidates.filter((hash) => headDistanceByHash.has(hash));
        return onHeadPath.length > 0 ? onHeadPath : [];
      }

      const currentHeadDistance = headDistanceByHash.get(currentHash);
      if (currentHeadDistance === undefined) {
        return [];
      }

      const forwardHeadPath = candidates.filter((hash) => {
        const candidateHeadDistance = headDistanceByHash.get(hash);
        return candidateHeadDistance !== undefined && candidateHeadDistance > currentHeadDistance;
      });
      return forwardHeadPath.length > 0 ? forwardHeadPath : [];
    }

    function scorePathCandidate(currentHash, candidateHash, direction) {
      const currentNode = graphNodeByHash.get(currentHash);
      const candidateNode = graphNodeByHash.get(candidateHash);
      const laneDelta = Math.abs((candidateNode?.lane || 0) - (currentNode?.lane || 0));
      const rowDistance = Math.abs((candidateNode?.row || 0) - (currentNode?.row || 0));
      const horizontalDistance = Math.abs((candidateNode?.defaultLeft || 0) - (currentNode?.defaultLeft || 0));
      const candidateHeadDistance = headDistanceByHash.get(candidateHash);

      if (direction === 'descendant' && candidateHeadDistance !== undefined) {
        return candidateHeadDistance * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
      }

      if (direction === 'ancestor') {
        const currentHeadDistance = headDistanceByHash.get(currentHash);
        if (currentHeadDistance !== undefined && candidateHeadDistance !== undefined) {
          return Math.abs(candidateHeadDistance - (currentHeadDistance + 1)) * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
        }
      }

      return laneDelta * 100 + rowDistance * 10 + horizontalDistance;
    }

    function buildPathEdgeKeys(path, direction) {
      const keys = new Set();
      for (let index = 0; index < path.length - 1; index += 1) {
        const currentHash = path[index];
        const nextHash = path[index + 1];
        const edgeKey = direction === 'ancestor'
          ? currentHash + '->' + nextHash
          : nextHash + '->' + currentHash;
        keys.add(edgeKey);
      }
      return keys;
    }

    function relaxPositions(positions, nodes, neighborMap, reverseBias) {
      for (const node of nodes) {
        const neighbors = neighborMap.get(node.hash) || [];
        if (neighbors.length === 0) {
          continue;
        }

        const sameLaneNeighbors = neighbors.filter((hash) => graphNodeByHash.get(hash)?.lane === node.lane);
        const effectiveNeighbors = sameLaneNeighbors.length > 0 ? sameLaneNeighbors : neighbors;
        const current = positions.get(node.hash) || node.defaultLeft;
        const neighborAverage =
          effectiveNeighbors.reduce((sum, hash) => sum + (positions.get(hash) || current), 0) / effectiveNeighbors.length;
        const laneBias = node.defaultLeft + (reverseBias ? -10 : 10) * Math.sign(neighborAverage - node.defaultLeft);
        const target = neighborAverage * 0.38 + laneBias * 0.62;
        positions.set(node.hash, clampNodeLeft(node.hash, current * 0.45 + target * 0.55));
      }
    }

    function resolveRowOverlaps(positions) {
      const rows = groupNodesByRow();
      for (const rowNodes of rows.values()) {
        const ordered = [...rowNodes]
          .sort((left, right) =>
            (positions.get(left.hash) || left.defaultLeft) - (positions.get(right.hash) || right.defaultLeft) ||
            left.defaultLeft - right.defaultLeft
          );
        if (ordered.length <= 1) {
          continue;
        }

        const resolved = ordered.map((node) => positions.get(node.hash) || node.defaultLeft);
        for (let index = 1; index < resolved.length; index += 1) {
          const previousNode = ordered[index - 1];
          const currentNode = ordered[index];
          const minGap = getMinimumGap(previousNode.hash, currentNode.hash);
          resolved[index] = Math.max(resolved[index], resolved[index - 1] + minGap);
        }

        const defaultCenter =
          ordered.reduce((sum, node) => sum + node.defaultLeft + getNodeWidth(node.hash) / 2, 0) / ordered.length;
        const resolvedCenter =
          resolved.reduce((sum, left, index) => sum + left + getNodeWidth(ordered[index].hash) / 2, 0) / resolved.length;
        const centered = resolved.map((left) => left + (defaultCenter - resolvedCenter));

        for (let index = 0; index < ordered.length; index += 1) {
          positions.set(ordered[index].hash, clampNodeLeft(ordered[index].hash, centered[index]));
        }
      }
    }

    function compactHorizontalSpread(positions, neighborMap) {
      if (graphNodes.length <= 1) {
        return;
      }
      const components = buildConnectedComponents(neighborMap);
      const spreadFactor = graphNodes.length >= 40 ? 0.62 : graphNodes.length >= 20 ? 0.72 : 0.84;

      for (const component of components) {
        const anchorX = getAutoLayoutAnchorX(positions, component);
        for (const hash of component) {
          const node = graphNodeByHash.get(hash);
          if (!node) {
            continue;
          }

          const current = positions.get(hash) || node.defaultLeft;
          const compressed = anchorX + (current - anchorX) * spreadFactor;
          positions.set(hash, clampNodeLeft(hash, compressed));
        }
      }
    }

    function groupNodesByRow() {
      const rows = new Map();
      for (const node of graphNodes) {
        if (!rows.has(node.row)) {
          rows.set(node.row, []);
        }
        rows.get(node.row).push(node);
      }
      return rows;
    }

    function buildConnectedComponents(neighborMap) {
      const components = [];
      const visited = new Set();

      for (const node of graphNodes) {
        if (visited.has(node.hash)) {
          continue;
        }

        const queue = [node.hash];
        const component = [];
        visited.add(node.hash);

        while (queue.length > 0) {
          const hash = queue.shift();
          if (!hash) {
            continue;
          }

          component.push(hash);
          for (const neighbor of neighborMap.get(hash) || []) {
            if (visited.has(neighbor)) {
              continue;
            }

            visited.add(neighbor);
            queue.push(neighbor);
          }
        }

        components.push(component);
      }

      return components;
    }

    function getAutoLayoutAnchorX(positions, component) {
      if (headNodeHash && component.includes(headNodeHash) && positions.has(headNodeHash)) {
        return positions.get(headNodeHash) || 0;
      }
      if (component.length === 0) {
        return 0;
      }
      return component.reduce((sum, hash) => {
        const node = graphNodeByHash.get(hash);
        if (!node) {
          return sum;
        }

        return sum + (positions.get(hash) || node.defaultLeft);
      }, 0) / component.length;
    }

    function updateEdges(elements) {
      for (const element of elements) {
        const fromHash = element.getAttribute('data-edge-from');
        const toHash = element.getAttribute('data-edge-to');
        if (!fromHash || !toHash) {
          continue;
        }
        element.setAttribute('d', buildEdgePath(fromHash, toHash));
      }
    }

    function buildEdgePath(fromHash, toHash) {
      const sourceX = getNodeCenterX(fromHash);
      const sourceY = getNodeSourceY(fromHash);
      const targetX = getNodeCenterX(toHash);
      const targetY = getNodeTargetY(toHash);
      const verticalSpan = Math.max(36, (targetY - sourceY) * 0.42);
      const horizontalBias = Math.min(140, Math.max(28, Math.abs(targetX - sourceX) * 0.28));
      const controlY1 = sourceY + verticalSpan;
      const controlY2 = targetY - verticalSpan;
      const controlX1 = targetX >= sourceX ? sourceX + horizontalBias : sourceX - horizontalBias;
      const controlX2 = targetX >= sourceX ? targetX - horizontalBias : targetX + horizontalBias;
      return 'M ' + sourceX + ' ' + sourceY + ' C ' + controlX1 + ' ' + controlY1 + ', ' + controlX2 + ' ' + controlY2 + ', ' + targetX + ' ' + targetY;
    }

    function syncCanvasSize() {
      const availableWidth = Math.max(
        baseCanvasWidth,
        Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT}) / currentZoom
      );
      const availableHeight = Math.max(
        baseCanvasHeight,
        Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM}) / currentZoom
      );
      canvas.style.width = availableWidth + 'px';
      canvas.style.height = availableHeight + 'px';
    }

    function updateScenePlacement() {
      const bounds = getGraphBounds();
      const canvasWidth = getCanvasWidth();
      const canvasHeight = getCanvasHeight();
      const headAnchor = getHeadAnchorBounds();
      const preferredCenterX = headAnchor ? headAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
      const preferredCenterY = headAnchor ? headAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
      const maxOffsetX = Math.max(0, canvasWidth - baseCanvasWidth);
      const maxOffsetY = Math.max(0, canvasHeight - baseCanvasHeight);
      layoutOffsetX = clamp(preferredCenterX ? canvasWidth / 2 - preferredCenterX : 0, 0, maxOffsetX);
      layoutOffsetY = clamp(preferredCenterY ? canvasHeight / 2 - preferredCenterY : 0, 0, maxOffsetY);
      sceneLayer.style.transform = 'translate(' + layoutOffsetX + 'px, ' + layoutOffsetY + 'px)';
    }

    function centerGraphInViewport() {
      const bounds = getDisplayedGraphBounds();
      const displayedHeadAnchor = getDisplayedHeadAnchorBounds();
      const targetCenterX = displayedHeadAnchor ? displayedHeadAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
      const targetCenterY = displayedHeadAnchor ? displayedHeadAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
      const visibleWidth = Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
      viewport.scrollLeft = Math.max(
        0,
        ${VIEWPORT_PADDING_LEFT} + targetCenterX * currentZoom - visibleWidth / 2
      );
      viewport.scrollTop = Math.max(
        0,
        ${VIEWPORT_PADDING_TOP} + targetCenterY * currentZoom - visibleHeight / 2
      );
      syncMinimap();
    }

    function getGraphBounds() {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [hash] of nodeElements.entries()) {
        const left = getNodeLeft(hash);
        const top = getNodeTop(hash);
        const element = nodeElements.get(hash);
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, left + getNodeWidth(hash));
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, top + (element ? element.offsetHeight : 54));
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
        return { minX: 0, maxX: baseCanvasWidth, minY: 0, maxY: baseCanvasHeight };
      }
      return { minX, maxX, minY, maxY };
    }

    function getDisplayedGraphBounds() {
      const bounds = getGraphBounds();
      return {
        minX: bounds.minX + layoutOffsetX,
        maxX: bounds.maxX + layoutOffsetX,
        minY: bounds.minY + layoutOffsetY,
        maxY: bounds.maxY + layoutOffsetY
      };
    }

    function getHeadAnchorBounds() {
      if (!headNodeHash || !nodeElements.has(headNodeHash)) {
        return null;
      }
      const top = getNodeTop(headNodeHash);
      const left = getNodeLeft(headNodeHash);
      const element = nodeElements.get(headNodeHash);
      const height = element ? element.offsetHeight : 54;
      return {
        centerX: left + getNodeWidth(headNodeHash) / 2,
        centerY: top + height / 2
      };
    }

    function getDisplayedHeadAnchorBounds() {
      const headBounds = getHeadAnchorBounds();
      if (!headBounds) {
        return null;
      }
      return {
        centerX: headBounds.centerX + layoutOffsetX,
        centerY: headBounds.centerY + layoutOffsetY
      };
    }

    function getNodeCenterX(hash) {
      return getNodeLeft(hash) + getNodeWidth(hash) / 2;
    }

    function getNodeSourceY(hash) {
      return getNodeTop(hash) + 48;
    }

    function getNodeTargetY(hash) {
      return getNodeTop(hash) + 8;
    }

    function getNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.style.left.replace('px', '')) || getDefaultNodeLeft(hash);
    }

    function getNodeTop(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.dataset.defaultTop || 0);
    }

    function getDefaultNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.dataset.defaultLeft || 0);
    }

    function getNodeWidth(hash) {
      const element = nodeElements.get(hash);
      if (element) {
        return element.offsetWidth || Number(element.dataset.nodeWidth || 0) || ${NODE_MIN_WIDTH};
      }
      const node = graphNodeByHash.get(hash);
      return node ? node.width : ${NODE_MIN_WIDTH};
    }

    function getMinimumGap(leftHash, rightHash) {
      return getNodeWidth(leftHash) / 2 + getNodeWidth(rightHash) / 2 + ${NODE_HORIZONTAL_GAP};
    }

    function clampNodeOffset(hash, defaultLeft, offset) {
      const clampedLeft = clampNodeLeft(hash, defaultLeft + offset);
      return clampedLeft - defaultLeft;
    }

    function clampNodeLeft(hash, left) {
      const nodeWidth = getNodeWidth(hash);
      return Math.max(0, Math.min(getCanvasWidth() - nodeWidth, left));
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getCanvasWidth() {
      return Number(canvas.style.width.replace('px', '')) || baseCanvasWidth;
    }

    function getCanvasHeight() {
      return Number(canvas.style.height.replace('px', '')) || baseCanvasHeight;
    }

    function getReference(refId) {
      return references.find((ref) => ref.id === refId);
    }

    function syncMinimap() {}
  </script>
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

function renderNode(node: RevisionGraphNode, width: number, x: number): string {
  const y = NODE_PADDING_Y + node.row * ROW_HEIGHT;
  const nodeClass = getNodeClass(node);
  const refLines = node.refs
    .map((ref) => `<div class="ref-line kind-${escapeHtml(ref.kind)}" data-ref-id="${escapeHtml(createReferenceId(node.hash, ref.kind, ref.name))}" data-ref-name="${escapeHtml(ref.name)}" data-ref-kind="${escapeHtml(ref.kind)}">${escapeHtml(ref.name)}<span class="base-suffix"> (Base)</span></div>`)
    .join('');

  return `<div class="node ${nodeClass}" data-node-hash="${node.hash}" data-node-width="${width}" data-default-left="${x}" data-default-top="${y}" style="left:${x}px; top:${y}px; width:${width}px" title="${escapeHtml(node.refs.map((ref) => ref.name).join('\n'))}">
    <button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>
    ${refLines}
  </div>`;
}

function renderEdge(
  edge: RevisionGraphEdge,
  nodeLayoutByHash: ReadonlyMap<string, { readonly defaultLeft: number; readonly width: number }>
): string {
  const strokeWidth = 2.4;
  const marker = 'marker-end="url(#arrowhead)"';
  const sourceNode = nodeLayoutByHash.get(edge.from);
  const targetNode = nodeLayoutByHash.get(edge.to);
  const path = describeEdgePath(
    (sourceNode?.defaultLeft ?? (NODE_PADDING_X + edge.fromLane * LANE_WIDTH)) + (sourceNode?.width ?? NODE_MIN_WIDTH) / 2,
    NODE_PADDING_Y + edge.fromRow * ROW_HEIGHT + 48,
    (targetNode?.defaultLeft ?? (NODE_PADDING_X + edge.toLane * LANE_WIDTH)) + (targetNode?.width ?? NODE_MIN_WIDTH) / 2,
    NODE_PADDING_Y + edge.toRow * ROW_HEIGHT + 8
  );
  return `<path class="graph-edge" data-edge-from="${edge.from}" data-edge-to="${edge.to}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${marker}></path>`;
}

function getNodeClass(node: RevisionGraphNode): string {
  const kinds = new Set(node.refs.map((ref) => ref.kind));
  if (kinds.size === 1 && kinds.has('head')) return 'node-head';
  if (kinds.size === 1 && kinds.has('tag')) return 'node-tag';
  if (kinds.size === 1 && kinds.has('remote')) return 'node-remote';
  if (kinds.size === 1 && kinds.has('branch')) return 'node-branch';
  return 'node-mixed';
}

function getNodeWidth(node: RevisionGraphNode): number {
  const longestLabelLength = node.refs.reduce((max, ref) => Math.max(max, ref.name.length), 0);
  return clampNumber(
    Math.ceil(longestLabelLength * NODE_CONTENT_CHAR_WIDTH + NODE_WIDTH_PADDING),
    NODE_MIN_WIDTH,
    NODE_MAX_WIDTH
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createReferenceId(hash: string, kind: string, name: string): string {
  return `${hash}::${kind}::${name}`;
}

function describeEdgePath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  const verticalSpan = Math.max(36, (targetY - sourceY) * 0.42);
  const horizontalBias = Math.min(140, Math.max(28, Math.abs(targetX - sourceX) * 0.28));
  const controlY1 = sourceY + verticalSpan;
  const controlY2 = targetY - verticalSpan;
  const controlX1 = targetX >= sourceX ? sourceX + horizontalBias : sourceX - horizontalBias;
  const controlX2 = targetX >= sourceX ? targetX - horizontalBias : targetX + horizontalBias;
  return `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
}

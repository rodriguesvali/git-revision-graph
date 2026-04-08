import { RevisionGraphEdge, RevisionGraphNode, RevisionGraphScene } from './revisionGraphData';
import { RevisionGraphAncestorFilter } from './revisionGraphTypes';

const LANE_WIDTH = 220;
const ROW_HEIGHT = 140;
const NODE_WIDTH = 180;
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
  ancestorFilter: RevisionGraphAncestorFilter | undefined,
  mergeBlockedTargets: readonly string[]
): string {
  const nonce = createNonce();
  const width = Math.max(880, scene.laneCount * LANE_WIDTH + NODE_WIDTH + NODE_PADDING_X * 2);
  const height = Math.max(480, scene.rowCount * ROW_HEIGHT + NODE_PADDING_Y * 2);
  const zoomLevels = [0.6, 0.8, 1, 1.25, 1.5];
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
    scene.nodes.map((node) => ({
      hash: node.hash,
      row: node.row,
      lane: node.lane,
      defaultLeft: NODE_PADDING_X + node.lane * LANE_WIDTH
    }))
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
      --node-mixed: #f0e6c8;
      --node-text-dark: #181818;
      --minimap-border: color-mix(in srgb, var(--border) 80%, transparent);
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
      position: absolute; width: ${NODE_WIDTH}px; min-height: 54px; border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.18); box-shadow: 0 7px 18px rgba(0, 0, 0, 0.12);
      color: var(--node-text-dark); cursor: inherit; user-select: none; overflow: hidden;
    }
    .viewport.dragging .node { cursor: grabbing; }
    .node:hover { transform: translateY(-1px); }
    .node.selected { outline: 3px solid color-mix(in srgb, var(--accent) 60%, transparent); }
    .node-head { background: var(--node-head); color: white; }
    .node-branch { background: var(--node-branch); }
    .node-tag { background: var(--node-tag); }
    .node-remote { background: var(--node-remote); }
    .node-mixed { background: var(--node-mixed); }
    .ref-line {
      padding: 8px 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    }
    .ref-line.head { background: rgba(0,0,0,0.1); font-weight: 700; }
    .ref-line.base { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.55); font-weight: 700; }
    .ref-line.compare { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.25); text-decoration: underline; }
    .base-suffix { display: none; }
    .ref-line.base.has-compare .base-suffix { display: inline; }
    .minimap {
      position: fixed; right: 18px; bottom: 18px; width: 150px; height: 210px; border: 1px solid var(--minimap-border);
      border-radius: 10px; background: color-mix(in srgb, var(--bg) 92%, var(--panel)); overflow: hidden; z-index: 25;
    }
    .minimap svg { width: 100%; height: 100%; }
    .minimap-frame { fill: transparent; stroke: color-mix(in srgb, var(--accent) 65%, transparent); stroke-width: 2; }
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
  </style>
</head>
<body>
  <div class="viewport" id="viewport">
    <div class="canvas" id="canvas">
      <div class="scene-layer" id="sceneLayer">
        <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="var(--edge)"></polygon>
            </marker>
          </defs>
          ${scene.edges.map((edge) => renderEdge(edge)).join('')}
        </svg>
        ${scene.nodes.map((node) => renderNode(node)).join('')}
      </div>
    </div>
  </div>
  <div class="minimap" aria-hidden="true">
    <svg viewBox="0 0 ${width} ${height}">
      <g id="minimapLayer">
        ${scene.edges.map((edge) => renderEdge(edge, true)).join('')}
        ${scene.nodes.map((node) => renderMiniNode(node)).join('')}
      </g>
      <rect id="minimapFrame" class="minimap-frame" x="0" y="0" width="0" height="0"></rect>
    </svg>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const references = ${referenceData};
    const currentHeadName = ${JSON.stringify(currentHeadName ?? null)};
    const activeAncestorFilter = ${JSON.stringify(ancestorFilter ?? null)};
    const mergeBlockedTargets = new Set(${JSON.stringify(mergeBlockedTargets)});
    const zoomLevels = ${JSON.stringify(zoomLevels)};
    const graphNodes = ${graphNodeData};
    const graphEdges = ${graphEdgeData};
    const selected = [];
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const sceneLayer = document.getElementById('sceneLayer');
    const minimapFrame = document.getElementById('minimapFrame');
    const minimapLayer = document.getElementById('minimapLayer');
    const contextMenu = document.getElementById('contextMenu');
    const nodeElements = new Map(
      Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
    );
    const miniNodeElements = new Map(
      Array.from(document.querySelectorAll('[data-mini-node-hash]')).map((element) => [element.getAttribute('data-mini-node-hash'), element])
    );
    const edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
    const miniEdgeElements = Array.from(document.querySelectorAll('[data-mini-edge-from]'));
    const storedState = vscode.getState() || {};
    const nodeOffsets = Object.assign({}, storedState.nodeOffsets || {});
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
        if (!additive) {
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
        nodeOffsets[nodeDragState.hash] = clampNodeOffset(defaultLeft, rawOffset);
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
      syncMinimap();
    }

    function openContextMenu(clientX, clientY, target) {
      const base = selected[0] ? getReference(selected[0]) : undefined;
      const compare = selected[1] ? getReference(selected[1]) : undefined;
      const isCurrentHead = target.kind === 'head' || (currentHeadName && target.name === currentHeadName);
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
        if (activeAncestorFilter && activeAncestorFilter.refName === target.name && activeAncestorFilter.refKind === target.kind) {
          appendMenuItem('Clear Filter', () => {
            vscode.postMessage({ type: 'clear-ancestor-filter' });
          });
        } else {
          appendMenuItem('Filter Ancestors', () => {
            vscode.postMessage({
              type: 'filter-ancestor-refs',
              refName: target.name,
              refKind: target.kind
            });
          });
        }
        appendMenuItem('Checkout', () => {
          vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
        });
        if (!isCurrentHead) {
          if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
            appendMenuItem('Delete', () => {
              vscode.postMessage({ type: 'delete', refName: target.name, refKind: target.kind });
            });
          }
          if (!mergeBlockedTargets.has(target.kind + '::' + target.name)) {
            appendMenuItem('Merge Into ' + (currentHeadName || 'Current HEAD'), () => {
              vscode.postMessage({ type: 'merge', refName: target.name });
            });
          }
        }
        if (activeAncestorFilter && (activeAncestorFilter.refName !== target.name || activeAncestorFilter.refKind !== target.kind)) {
          appendMenuItem('Show All References', () => {
            vscode.postMessage({ type: 'clear-ancestor-filter' });
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
      appendMenuItem('Zoom Out (Alt+-)', () => {
        zoomOut();
        centerGraphInViewport();
      }, !canZoomOut);
      appendMenuItem('Zoom In (Alt+=)', () => {
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

    function applyNodeLayout(persist = true) {
      for (const [hash, element] of nodeElements.entries()) {
        const defaultLeft = getDefaultNodeLeft(hash);
        const left = clampNodeLeft(defaultLeft + Number(nodeOffsets[hash] || 0));
        nodeOffsets[hash] = left - defaultLeft;
        element.style.left = left + 'px';
        const miniNode = miniNodeElements.get(hash);
        if (miniNode) {
          miniNode.setAttribute('x', String(left + ${NODE_WIDTH / 2 - 10}));
        }
      }
      updateEdges(edgeElements, false);
      updateEdges(miniEdgeElements, true);
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
      vscode.setState({ nodeOffsets: normalizedOffsets });
    }

    function autoArrangeLayout() {
      const positions = new Map(graphNodes.map((node) => [node.hash, node.defaultLeft]));
      const neighborMap = buildNeighborMap();
      for (let pass = 0; pass < 8; pass += 1) {
        relaxPositions(positions, graphNodes, neighborMap, false);
        relaxPositions(positions, [...graphNodes].reverse(), neighborMap, true);
        resolveOverlaps(positions);
      }
      maximizeSpacing(positions);
      resolveOverlaps(positions);

      const bounds = getPositionBounds(positions);
      const targetCenter = ${width / 2};
      const currentCenter = (bounds.minX + bounds.maxX) / 2;
      const centeredDelta = targetCenter - currentCenter;
      for (const node of graphNodes) {
        const centered = clampNodeLeft((positions.get(node.hash) || node.defaultLeft) + centeredDelta);
        positions.set(node.hash, centered);
        nodeOffsets[node.hash] = centered - node.defaultLeft;
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

    function relaxPositions(positions, nodes, neighborMap, reverseBias) {
      for (const node of nodes) {
        const neighbors = neighborMap.get(node.hash) || [];
        if (neighbors.length === 0) {
          continue;
        }
        const current = positions.get(node.hash) || node.defaultLeft;
        const neighborAverage = neighbors.reduce((sum, hash) => sum + (positions.get(hash) || current), 0) / neighbors.length;
        const laneBias = node.defaultLeft + (reverseBias ? -18 : 18) * Math.sign(neighborAverage - node.defaultLeft);
        const target = neighborAverage * 0.72 + laneBias * 0.28;
        positions.set(node.hash, clampNodeLeft(current * 0.4 + target * 0.6));
      }
    }

    function resolveOverlaps(positions) {
      const minGap = ${NODE_WIDTH + 28};
      const ordered = [...graphNodes]
        .sort((left, right) => (positions.get(left.hash) || left.defaultLeft) - (positions.get(right.hash) || right.defaultLeft));
      let cursor = 0;
      for (const node of ordered) {
        const next = Math.max(cursor, positions.get(node.hash) || node.defaultLeft);
        positions.set(node.hash, clampNodeLeft(next));
        cursor = (positions.get(node.hash) || 0) + minGap;
      }
      const overflow = cursor - minGap - (${width - NODE_WIDTH});
      if (overflow > 0) {
        for (const node of ordered) {
          positions.set(node.hash, clampNodeLeft((positions.get(node.hash) || node.defaultLeft) - overflow));
        }
      }
    }

    function getPositionBounds(positions) {
      let minX = Infinity;
      let maxX = -Infinity;
      for (const node of graphNodes) {
        const left = positions.get(node.hash) || node.defaultLeft;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, left + ${NODE_WIDTH});
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
        return { minX: 0, maxX: ${width} };
      }
      return { minX, maxX };
    }

    function updateEdges(elements, mini) {
      for (const element of elements) {
        const fromHash = mini ? element.getAttribute('data-mini-edge-from') : element.getAttribute('data-edge-from');
        const toHash = mini ? element.getAttribute('data-mini-edge-to') : element.getAttribute('data-edge-to');
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
      const graphWidth = Math.max(0, bounds.maxX - bounds.minX);
      const graphHeight = Math.max(0, bounds.maxY - bounds.minY);
      layoutOffsetX = Math.max(0, (canvasWidth - graphWidth) / 2 - bounds.minX);
      layoutOffsetY = Math.max(0, (canvasHeight - graphHeight) / 2 - bounds.minY);
      sceneLayer.style.transform = 'translate(' + layoutOffsetX + 'px, ' + layoutOffsetY + 'px)';
      minimapLayer.setAttribute('transform', 'translate(' + layoutOffsetX + ' ' + layoutOffsetY + ')');
    }

    function centerGraphInViewport() {
      const bounds = getDisplayedGraphBounds();
      const visibleWidth = Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
      viewport.scrollLeft = Math.max(
        0,
        ${VIEWPORT_PADDING_LEFT} + ((bounds.minX + bounds.maxX) / 2) * currentZoom - visibleWidth / 2
      );
      viewport.scrollTop = Math.max(
        0,
        ${VIEWPORT_PADDING_TOP} + ((bounds.minY + bounds.maxY) / 2) * currentZoom - visibleHeight / 2
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
        maxX = Math.max(maxX, left + ${NODE_WIDTH});
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

    function maximizeSpacing(positions) {
      if (graphNodes.length === 0) {
        return;
      }
      if (graphNodes.length === 1) {
        const onlyNode = graphNodes[0];
        positions.set(onlyNode.hash, (${width} - ${NODE_WIDTH}) / 2);
        return;
      }

      const outerMargin = 24;
      const minGap = ${NODE_WIDTH + 28};
      const ordered = [...graphNodes]
        .sort((left, right) => (positions.get(left.hash) || left.defaultLeft) - (positions.get(right.hash) || right.defaultLeft));
      const usableSpan = Math.max(0, ${width - NODE_WIDTH} - outerMargin * 2);
      const distributedStep = usableSpan / (ordered.length - 1);
      const step = Math.max(minGap, distributedStep);
      const packedWidth = step * (ordered.length - 1);
      const start = Math.max(outerMargin, (${width - NODE_WIDTH} - packedWidth) / 2);

      ordered.forEach((node, index) => {
        const evenlySpacedLeft = start + index * step;
        const currentLeft = positions.get(node.hash) || node.defaultLeft;
        const blendedLeft = currentLeft * 0.2 + evenlySpacedLeft * 0.8;
        positions.set(node.hash, clampNodeLeft(blendedLeft));
      });
    }

    function getNodeCenterX(hash) {
      return getNodeLeft(hash) + ${NODE_WIDTH / 2};
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

    function clampNodeOffset(defaultLeft, offset) {
      const clampedLeft = clampNodeLeft(defaultLeft + offset);
      return clampedLeft - defaultLeft;
    }

    function clampNodeLeft(left) {
      return Math.max(0, Math.min(${width - NODE_WIDTH}, left));
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

    function syncMinimap() {
      const zoom = currentZoom;
      const visibleX = Math.max(0, (viewport.scrollLeft - ${VIEWPORT_PADDING_LEFT}) / zoom);
      const visibleY = Math.max(0, (viewport.scrollTop - ${VIEWPORT_PADDING_TOP}) / zoom);
      const visibleWidth = Math.max(
        0,
        (viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT}) / zoom
      );
      const visibleHeight = Math.max(
        0,
        (viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM}) / zoom
      );
      const frameWidth = Math.min(${width} - visibleX, visibleWidth);
      const frameHeight = Math.min(${height} - visibleY, visibleHeight);
      minimapFrame.setAttribute('x', String(visibleX));
      minimapFrame.setAttribute('y', String(visibleY));
      minimapFrame.setAttribute('width', String(frameWidth));
      minimapFrame.setAttribute('height', String(frameHeight));
    }
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

function renderNode(node: RevisionGraphNode): string {
  const x = NODE_PADDING_X + node.lane * LANE_WIDTH;
  const y = NODE_PADDING_Y + node.row * ROW_HEIGHT;
  const nodeClass = getNodeClass(node);
  const refLines = node.refs
    .map((ref) => `<div class="ref-line ${ref.kind === 'head' ? 'head' : ''}" data-ref-id="${escapeHtml(createReferenceId(node.hash, ref.kind, ref.name))}" data-ref-name="${escapeHtml(ref.name)}" data-ref-kind="${escapeHtml(ref.kind)}">${escapeHtml(ref.name)}<span class="base-suffix"> (Base)</span></div>`)
    .join('');

  return `<div class="node ${nodeClass}" data-node-hash="${node.hash}" data-default-left="${x}" data-default-top="${y}" style="left:${x}px; top:${y}px" title="${escapeHtml(node.refs.map((ref) => ref.name).join('\n'))}">
    <button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>
    ${refLines}
  </div>`;
}

function renderMiniNode(node: RevisionGraphNode): string {
  const x = NODE_PADDING_X + node.lane * LANE_WIDTH + NODE_WIDTH / 2 - 10;
  const y = NODE_PADDING_Y + node.row * ROW_HEIGHT + 18;
  return `<rect data-mini-node-hash="${node.hash}" x="${x}" y="${y}" width="20" height="12" rx="3" fill="${miniNodeColor(node)}" opacity="0.92"></rect>`;
}

function renderEdge(edge: RevisionGraphEdge, mini = false): string {
  const strokeWidth = mini ? 3 : 2.4;
  const marker = mini ? '' : 'marker-end="url(#arrowhead)"';
  const path = describeEdgePath(
    NODE_PADDING_X + edge.fromLane * LANE_WIDTH + NODE_WIDTH / 2,
    NODE_PADDING_Y + edge.fromRow * ROW_HEIGHT + 48,
    NODE_PADDING_X + edge.toLane * LANE_WIDTH + NODE_WIDTH / 2,
    NODE_PADDING_Y + edge.toRow * ROW_HEIGHT + 8
  );
  return mini
    ? `<path data-mini-edge-from="${edge.from}" data-mini-edge-to="${edge.to}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"></path>`
    : `<path data-edge-from="${edge.from}" data-edge-to="${edge.to}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${marker}></path>`;
}

function getNodeClass(node: RevisionGraphNode): string {
  const kinds = new Set(node.refs.map((ref) => ref.kind));
  if (kinds.has('head')) return 'node-head';
  if (kinds.size === 1 && kinds.has('tag')) return 'node-tag';
  if (kinds.size === 1 && kinds.has('remote')) return 'node-remote';
  if (kinds.size === 1 && kinds.has('branch')) return 'node-branch';
  return 'node-mixed';
}

function miniNodeColor(node: RevisionGraphNode): string {
  switch (getNodeClass(node)) {
    case 'node-head': return '#d62828';
    case 'node-tag': return '#f7f300';
    case 'node-remote': return '#f6d8a8';
    case 'node-branch': return '#ffd79a';
    default: return '#e8d9b5';
  }
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

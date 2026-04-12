import { RenderRevisionGraphScriptOptions } from './types';

export function renderRevisionGraphScriptBootstrap({
  references,
  currentHeadName,
  currentHeadUpstreamName,
  isWorkspaceDirty,
  projectionOptions,
  autoArrangeOnInit,
  mergeBlockedTargets,
  zoomLevels,
  graphNodes,
  graphEdges,
  primaryAncestorPathsByHash,
  sceneLayoutKey,
  baseCanvasWidth,
  baseCanvasHeight
}: RenderRevisionGraphScriptOptions): string {
  return `
    const vscode = acquireVsCodeApi();
    const references = ${JSON.stringify(references)};
    const currentHeadName = ${JSON.stringify(currentHeadName ?? null)};
    const currentHeadUpstreamName = ${JSON.stringify(currentHeadUpstreamName ?? null)};
    const isWorkspaceDirty = ${JSON.stringify(isWorkspaceDirty)};
    const currentProjectionOptions = ${JSON.stringify(projectionOptions)};
    const autoArrangeOnInit = ${JSON.stringify(autoArrangeOnInit)};
    const mergeBlockedTargets = new Set(${JSON.stringify(mergeBlockedTargets)});
    const zoomLevels = ${JSON.stringify(zoomLevels)};
    const graphNodes = ${JSON.stringify(graphNodes)};
    const graphEdges = ${JSON.stringify(graphEdges)};
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
    const scopeSelect = document.getElementById('scopeSelect');
    const showTagsToggle = document.getElementById('showTagsToggle');
    const showBranchingsToggle = document.getElementById('showBranchingsToggle');
    const reorganizeButton = document.getElementById('reorganizeButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomInButton = document.getElementById('zoomInButton');
    const nodeElements = new Map(
      Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
    );
    const edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
    const graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
    const parentMap = buildDirectionalMap(graphEdges, 'from', 'to');
    const childMap = buildDirectionalMap(graphEdges, 'to', 'from');
    const headDistanceByHash = headNodeHash ? buildDistanceMap(headNodeHash, parentMap) : new Map();
    const primaryAncestorPathsByHash = ${JSON.stringify(primaryAncestorPathsByHash)};
    const sceneLayoutKey = ${JSON.stringify(sceneLayoutKey)};
    const storedState = vscode.getState() || {};
    const nodeOffsets = storedState.sceneLayoutKey === sceneLayoutKey
      ? Object.assign({}, storedState.nodeOffsets || {})
      : {};
    const baseCanvasWidth = ${baseCanvasWidth};
    const baseCanvasHeight = ${baseCanvasHeight};
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
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { refScope: scopeSelect.value }
        }, 'Updating graph scope...');
      });
    }
    if (showTagsToggle) {
      showTagsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showTags: showTagsToggle.checked }
        }, showTagsToggle.checked ? 'Showing tags...' : 'Hiding tags...');
      });
    }
    if (showBranchingsToggle) {
      showBranchingsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showBranchingsAndMerges: showBranchingsToggle.checked }
        }, showBranchingsToggle.checked ? 'Showing branchings and merges...' : 'Showing refs only...');
      });
    }
    if (reorganizeButton) {
      reorganizeButton.addEventListener('click', () => {
        autoArrangeLayout();
        centerGraphInViewport();
      });
    }
    if (zoomOutButton) {
      zoomOutButton.addEventListener('click', () => {
        zoomOut();
        centerGraphInViewport();
      });
    }
    if (zoomInButton) {
      zoomInButton.addEventListener('click', () => {
        zoomIn();
        centerGraphInViewport();
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
  `;
}

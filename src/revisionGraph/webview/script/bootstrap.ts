import {
  EDGE_VERTICAL_INSET,
  VIEWPORT_PADDING_BOTTOM,
  VIEWPORT_PADDING_LEFT,
  VIEWPORT_PADDING_RIGHT,
  VIEWPORT_PADDING_TOP
} from '../shared';
import { RenderRevisionGraphScriptOptions } from './types';

export function renderRevisionGraphScriptBootstrap(_options: RenderRevisionGraphScriptOptions): string {
  return `
    const vscode = acquireVsCodeApi();
    const zoomLevels = [0.6, 0.8, 1, 1.25, 1.5];
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const sceneLayer = document.getElementById('sceneLayer');
    const graphSvg = document.getElementById('graphSvg');
    const edgeLayer = document.getElementById('edgeLayer');
    const nodeLayer = document.getElementById('nodeLayer');
    const statusCard = document.getElementById('statusCard');
    const contextMenu = document.getElementById('contextMenu');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const workspaceLed = document.getElementById('workspaceLed');
    const scopeSelect = document.getElementById('scopeSelect');
    const showTagsToggle = document.getElementById('showTagsToggle');
    const showBranchingsToggle = document.getElementById('showBranchingsToggle');
    const searchInput = document.getElementById('searchInput');
    const searchResultBadge = document.getElementById('searchResultBadge');
    const searchPrevButton = document.getElementById('searchPrevButton');
    const searchNextButton = document.getElementById('searchNextButton');
    const searchClearButton = document.getElementById('searchClearButton');
    const reorganizeButton = document.getElementById('reorganizeButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomInButton = document.getElementById('zoomInButton');
    let currentState = null;
    let references = [];
    let currentHeadName = null;
    let currentHeadUpstreamName = null;
    let isWorkspaceDirty = false;
    let currentProjectionOptions = { refScope: 'all', showTags: true, showBranchingsAndMerges: false };
    let mergeBlockedTargets = new Set();
    let graphNodes = [];
    let graphEdges = [];
    let selected = [];
    let headNodeHash = null;
    let nodeElements = new Map();
    let edgeElements = [];
    let graphNodeByHash = new Map();
    let parentMap = new Map();
    let childMap = new Map();
    let headDistanceByHash = new Map();
    let primaryAncestorPathsByHash = {};
    let sceneLayoutKey = 'empty';
    let baseCanvasWidth = 880;
    let baseCanvasHeight = 480;
    let currentZoom = 1;
    let layoutOffsetX = 0;
    let layoutOffsetY = 0;
    let dragState = null;
    let nodeDragState = null;
    let suppressNodeClick = false;
    let nodeOffsets = {};
    let searchQuery = '';
    let searchResultHashes = [];
    let activeSearchResultIndex = -1;
    let toolbarBusy = false;

    window.addEventListener('message', (event) => {
      handleHostMessage(event.data);
    });

    if (workspaceLed) {
      workspaceLed.addEventListener('click', () => {
        if (isWorkspaceDirty) {
          vscode.postMessage({ type: 'open-source-control' });
        }
      });
    }
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { refScope: scopeSelect.value }
        }, 'Updating graph scope...', scopeSelect);
      });
    }
    if (showTagsToggle) {
      showTagsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showTags: showTagsToggle.checked }
        }, showTagsToggle.checked ? 'Showing tags...' : 'Hiding tags...', showTagsToggle);
      });
    }
    if (showBranchingsToggle) {
      showBranchingsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showBranchingsAndMerges: showBranchingsToggle.checked }
        }, showBranchingsToggle.checked ? 'Showing branchings and merges...' : 'Showing refs only...', showBranchingsToggle);
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        setSearchQuery(searchInput.value);
      });
    }
    if (searchPrevButton) {
      searchPrevButton.addEventListener('click', () => {
        focusPreviousSearchResult();
      });
    }
    if (searchNextButton) {
      searchNextButton.addEventListener('click', () => {
        focusNextSearchResult();
      });
    }
    if (searchClearButton) {
      searchClearButton.addEventListener('click', () => {
        clearSearchQuery(true);
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
      const isSearchInputFocused = document.activeElement === searchInput;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        focusSearchInput(true);
        return;
      }
      if (isSearchInputFocused) {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (event.shiftKey) {
            focusPreviousSearchResult();
          } else {
            focusNextSearchResult();
          }
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          if (getNormalizedSearchQuery().length > 0) {
            clearSearchQuery(true);
          } else {
            searchInput.blur();
          }
          return;
        }
      }
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
    syncCanvasSize();
    updateScenePlacement();
    syncToolbarActions();

    function handleHostMessage(message) {
      if (!message || typeof message.type !== 'string') {
        return;
      }

      switch (message.type) {
        case 'init-state':
          applyState(message.state, true);
          return;
        case 'update-state':
          applyState(message.state, false);
          return;
        case 'patch-metadata':
          applyMetadataPatch(message.patch);
          return;
        case 'set-loading':
          showLoading(message.label);
          return;
        case 'set-error':
          showError(message.message);
          return;
      }
    }

    function applyState(nextState, isInit, options = {}) {
      if (!nextState) {
        return;
      }

      const previousRepositoryPath = currentState && currentState.repositoryPath ? currentState.repositoryPath : null;
      const selectionSnapshot = options.preserveSelection ? captureSelectionSnapshot() : [];
      const scenePlacementSnapshot = options.preserveViewport ? captureScenePlacementSnapshot() : null;
      const viewportSnapshot = options.preserveViewport ? captureViewportSnapshot() : null;
      const previousSceneLayoutKey = sceneLayoutKey;
      currentState = nextState;
      currentHeadName = nextState.currentHeadName || null;
      currentHeadUpstreamName = nextState.currentHeadUpstreamName || null;
      isWorkspaceDirty = !!nextState.isWorkspaceDirty;
      currentProjectionOptions = nextState.projectionOptions || currentProjectionOptions;
      mergeBlockedTargets = new Set(nextState.mergeBlockedTargets || []);
      references = nextState.references || [];
      graphNodes = nextState.nodeLayouts || [];
      graphEdges = (nextState.scene && nextState.scene.edges) || [];
      graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
      primaryAncestorPathsByHash = nextState.primaryAncestorPathsByHash || {};
      sceneLayoutKey = nextState.sceneLayoutKey || 'empty';
      baseCanvasWidth = nextState.baseCanvasWidth || 880;
      baseCanvasHeight = nextState.baseCanvasHeight || 480;

      const storedState = vscode.getState() || {};
      if (previousSceneLayoutKey !== sceneLayoutKey) {
        nodeOffsets = storedState.sceneLayoutKey === sceneLayoutKey
          ? Object.assign({}, storedState.nodeOffsets || {})
          : {};
      }

      if (options.preserveSelection) {
        restoreSelectionSnapshot(selectionSnapshot);
      } else {
        const availableReferenceIds = new Set(references.map((ref) => ref.id));
        selected = selected.filter((refId) => availableReferenceIds.has(refId)).slice(0, 2);
      }

      updateChrome(nextState);
      renderScene(nextState);
      hideLoading();
      if (nextState.errorMessage) {
        showError(nextState.errorMessage);
      } else if (nextState.viewMode === 'empty') {
        showStatus(nextState.emptyMessage || 'No revision graph available.', false);
      } else {
        hideStatus();
      }

      const shouldResetSearch =
        nextState.viewMode !== 'ready' ||
        (!!previousRepositoryPath && previousRepositoryPath !== (nextState.repositoryPath || null));
      const shouldRecenter = !options.preserveViewport && (isInit || previousSceneLayoutKey !== sceneLayoutKey);
      applyNodeLayout(false);
      syncSelection();
      if (shouldResetSearch) {
        clearSearchQuery(false);
      } else {
        syncSearchResults({ preserveActiveHash: true, focusActive: false });
      }
      requestAnimationFrame(() => {
        if (nextState.autoArrangeOnInit) {
          autoArrangeLayout();
          centerGraphInViewport();
        } else if (viewportSnapshot) {
          restoreScenePlacementSnapshot(scenePlacementSnapshot);
          restoreViewportSnapshot(viewportSnapshot);
        } else if (shouldRecenter) {
          centerGraphInViewport();
        }
      });
    }

    function applyMetadataPatch(patch) {
      if (!patch || !currentState) {
        return;
      }

      applyState(Object.assign({}, currentState, patch, {
        loading: false,
        loadingLabel: undefined,
        errorMessage: undefined
      }), false, {
        preserveSelection: !!patch.preserveSelection,
        preserveViewport: !!patch.preserveViewport
      });
    }

    function captureSelectionSnapshot() {
      return selected
        .map((refId) => getReference(refId))
        .filter((ref) => !!ref)
        .slice(0, 2)
        .map((ref) => ({
          id: ref.id,
          hash: ref.hash,
          name: ref.name,
          kind: ref.kind
        }));
    }

    function restoreSelectionSnapshot(snapshot) {
      const nextSelected = [];
      const usedReferenceIds = new Set();
      for (const entry of snapshot || []) {
        const match = findSelectionMatch(entry, usedReferenceIds);
        if (!match) {
          continue;
        }
        usedReferenceIds.add(match.id);
        nextSelected.push(match.id);
      }
      selected = nextSelected.slice(0, 2);
    }

    function findSelectionMatch(target, usedReferenceIds) {
      if (!target) {
        return null;
      }

      const exactMatch = references.find((ref) => ref.id === target.id && !usedReferenceIds.has(ref.id));
      if (exactMatch) {
        return exactMatch;
      }

      if (target.kind === 'head') {
        const currentHead = references.find((ref) => ref.kind === 'head' && !usedReferenceIds.has(ref.id));
        if (currentHead) {
          return currentHead;
        }
      }

      const matchPredicates = [
        (ref) => ref.hash === target.hash && ref.name === target.name && ref.kind === target.kind,
        (ref) => ref.name === target.name && ref.kind === target.kind,
        (ref) => ref.hash === target.hash && ref.name === target.name,
        (ref) => ref.name === target.name,
        (ref) => ref.hash === target.hash
      ];

      for (const predicate of matchPredicates) {
        const match = references.find((ref) => !usedReferenceIds.has(ref.id) && predicate(ref));
        if (match) {
          return match;
        }
      }

      return null;
    }

    function captureViewportSnapshot() {
      const visibleWidth = Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
      return {
        sceneCenterX: ((viewport.scrollLeft - ${VIEWPORT_PADDING_LEFT} + visibleWidth / 2) / currentZoom) - layoutOffsetX,
        sceneCenterY: ((viewport.scrollTop - ${VIEWPORT_PADDING_TOP} + visibleHeight / 2) / currentZoom) - layoutOffsetY
      };
    }

    function captureScenePlacementSnapshot() {
      return {
        layoutOffsetX,
        layoutOffsetY
      };
    }

    function restoreScenePlacementSnapshot(snapshot) {
      if (!snapshot) {
        return;
      }

      const canvasWidth = getCanvasWidth();
      const canvasHeight = getCanvasHeight();
      const maxOffsetX = Math.max(0, canvasWidth - baseCanvasWidth);
      const maxOffsetY = Math.max(0, canvasHeight - baseCanvasHeight);
      layoutOffsetX = clamp(snapshot.layoutOffsetX, 0, maxOffsetX);
      layoutOffsetY = clamp(snapshot.layoutOffsetY, 0, maxOffsetY);
      sceneLayer.style.transform = 'translate(' + layoutOffsetX + 'px, ' + layoutOffsetY + 'px)';
    }

    function restoreViewportSnapshot(snapshot) {
      if (!snapshot) {
        return;
      }

      const visibleWidth = Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
      const nextScrollLeft = Math.max(
        0,
        ${VIEWPORT_PADDING_LEFT} + (snapshot.sceneCenterX + layoutOffsetX) * currentZoom - visibleWidth / 2
      );
      const nextScrollTop = Math.max(
        0,
        ${VIEWPORT_PADDING_TOP} + (snapshot.sceneCenterY + layoutOffsetY) * currentZoom - visibleHeight / 2
      );
      viewport.scrollLeft = nextScrollLeft;
      viewport.scrollTop = nextScrollTop;
      syncMinimap();
    }

    function updateChrome(state) {
      if (scopeSelect) {
        scopeSelect.value = state.projectionOptions.refScope;
      }
      if (showTagsToggle) {
        showTagsToggle.checked = !!state.projectionOptions.showTags;
      }
      if (showBranchingsToggle) {
        showBranchingsToggle.checked = !!state.projectionOptions.showBranchingsAndMerges;
      }
      if (workspaceLed) {
        const tooltip = state.isWorkspaceDirty
          ? 'Workspace dirty: click to open Source Control Changes.'
          : 'Workspace clean: no pending changes.';
        workspaceLed.classList.toggle('dirty', !!state.isWorkspaceDirty);
        workspaceLed.classList.toggle('clean', !state.isWorkspaceDirty);
        workspaceLed.disabled = !state.isWorkspaceDirty;
        workspaceLed.setAttribute('aria-label', tooltip);
        workspaceLed.title = tooltip;
      }
    }

    function renderScene(state) {
      canvas.style.width = baseCanvasWidth + 'px';
      canvas.style.height = baseCanvasHeight + 'px';
      sceneLayer.style.width = baseCanvasWidth + 'px';
      sceneLayer.style.height = baseCanvasHeight + 'px';
      graphSvg.setAttribute('viewBox', '0 0 ' + baseCanvasWidth + ' ' + baseCanvasHeight);

      if (state.viewMode !== 'ready') {
        edgeLayer.innerHTML = '';
        nodeLayer.innerHTML = '';
        refreshGraphCaches();
        syncCanvasSize();
        updateScenePlacement();
        return;
      }

      const sceneNodes = (state.scene && state.scene.nodes) || [];
      const nodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
      edgeLayer.innerHTML = graphEdges
        .map((edge) => renderEdgeMarkup(edge, nodeByHash))
        .join('');
      nodeLayer.innerHTML = sceneNodes
        .map((node) => renderNodeMarkup(node, nodeByHash.get(node.hash)))
        .join('');

      refreshGraphCaches();
      bindSceneEventHandlers();
      syncCanvasSize();
      updateScenePlacement();
    }

    function refreshGraphCaches() {
      nodeElements = new Map(
        Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
      );
      edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
      const headReference =
        references.find((ref) => ref.kind === 'head') ||
        references.find((ref) => currentHeadName && ref.name === currentHeadName) ||
        null;
      headNodeHash = headReference ? headReference.hash : null;
      parentMap = buildDirectionalMap(graphEdges, 'from', 'to');
      childMap = buildDirectionalMap(graphEdges, 'to', 'from');
      headDistanceByHash = headNodeHash ? buildDistanceMap(headNodeHash, parentMap) : new Map();
    }

    function bindSceneEventHandlers() {
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
          if (!refId) {
            return;
          }
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
          if (!refId) {
            return;
          }
          const target = getReference(refId);
          if (!target) {
            return;
          }
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
    }

    function renderNodeMarkup(node, layout) {
      if (!layout) {
        return '';
      }
      const y = layout.defaultTop;
      const summary = node.refs.length === 0
        ? '<div class="node-summary">' + escapeHtml(formatNodeSummary(node)) + '</div>'
        : '';
      const refLines = node.refs
        .map((ref) => {
          const refId = createReferenceId(node.hash, ref.kind, ref.name);
          return '<div class="ref-line kind-' + escapeHtml(ref.kind) + '" data-ref-id="' + escapeHtml(refId) + '" data-ref-name="' + escapeHtml(ref.name) + '" data-ref-kind="' + escapeHtml(ref.kind) + '">' + escapeHtml(ref.name) + '<span class="base-suffix"> (Base)</span></div>';
        })
        .join('');

      return '<div class="node ' + getNodeClass(node) + '" data-node-hash="' + escapeHtml(node.hash) + '" data-node-width="' + layout.width + '" data-node-height="' + layout.height + '" data-default-left="' + layout.defaultLeft + '" data-default-top="' + y + '" style="left:' + layout.defaultLeft + 'px; top:' + y + 'px; width:' + layout.width + 'px" title="' + escapeHtml(formatNodeTitle(node)) + '">' +
        '<button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>' +
        refLines +
        summary +
      '</div>';
    }

    function renderEdgeMarkup(edge, layoutByHash) {
      const sourceNode = layoutByHash.get(edge.from);
      const targetNode = layoutByHash.get(edge.to);
      if (!sourceNode || !targetNode) {
        return '';
      }

      const path = describeEdgePath(
        sourceNode.defaultLeft + sourceNode.width / 2,
        sourceNode.defaultTop + sourceNode.height - ${EDGE_VERTICAL_INSET},
        targetNode.defaultLeft + targetNode.width / 2,
        targetNode.defaultTop + ${EDGE_VERTICAL_INSET}
      );

      return '<path class="graph-edge" data-edge-from="' + edge.from + '" data-edge-to="' + edge.to + '" d="' + path + '" fill="none" stroke="var(--edge)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>';
    }

    function getNodeClass(node) {
      if (node.refs.length === 0) {
        return 'node-structural';
      }

      const kinds = new Set(node.refs.map((ref) => ref.kind));
      if (kinds.size === 1 && kinds.has('head')) {
        return 'node-head';
      }
      if (kinds.size === 1 && kinds.has('tag')) {
        return 'node-tag';
      }
      if (kinds.size === 1 && kinds.has('remote')) {
        return 'node-remote';
      }
      if (kinds.size === 1 && kinds.has('branch')) {
        return 'node-branch';
      }
      return 'node-mixed';
    }

    function formatNodeSummary(node) {
      const shortHash = node.hash.slice(0, 8);
      return node.subject ? shortHash + ' ' + node.subject : shortHash;
    }

    function formatNodeTitle(node) {
      const refBlock = node.refs.length > 0
        ? 'Refs:\\n' + node.refs.map((ref) => ref.name).join('\\n') + '\\n\\n'
        : '';
      const author = node.author || 'Unknown author';
      const date = node.date || 'Unknown date';
      const subject = node.subject || 'Structural commit';
      return refBlock + node.hash + '\\n' + subject + '\\n' + author + ' on ' + date;
    }

    function describeEdgePath(sourceX, sourceY, targetX, targetY) {
      const verticalSpan = Math.max(36, (targetY - sourceY) * 0.42);
      const horizontalBias = Math.min(140, Math.max(28, Math.abs(targetX - sourceX) * 0.28));
      const controlY1 = sourceY + verticalSpan;
      const controlY2 = targetY - verticalSpan;
      const controlX1 = targetX >= sourceX ? sourceX + horizontalBias : sourceX - horizontalBias;
      const controlX2 = targetX >= sourceX ? targetX - horizontalBias : targetX + horizontalBias;
      return 'M ' + sourceX + ' ' + sourceY + ' C ' + controlX1 + ' ' + controlY1 + ', ' + controlX2 + ' ' + controlY2 + ', ' + targetX + ' ' + targetY;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function createReferenceId(hash, kind, name) {
      return hash + '::' + kind + '::' + name;
    }

    function showStatus(message, isError) {
      if (!statusCard) {
        return;
      }
      statusCard.textContent = message;
      statusCard.hidden = false;
      statusCard.classList.toggle('error', !!isError);
    }

    function hideStatus() {
      if (!statusCard) {
        return;
      }
      statusCard.hidden = true;
      statusCard.classList.remove('error');
      statusCard.textContent = '';
    }

    function showError(message) {
      hideLoading();
      edgeLayer.innerHTML = '';
      nodeLayer.innerHTML = '';
      refreshGraphCaches();
      showStatus(message, true);
    }
  `;
}

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
    const zoomLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5];
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const sceneLayer = document.getElementById('sceneLayer');
    const graphSvg = document.getElementById('graphSvg');
    const edgeLayer = document.getElementById('edgeLayer');
    const nodeLayer = document.getElementById('nodeLayer');
    const statusCard = document.getElementById('statusCard');
    const statusMessage = document.getElementById('statusMessage');
    const statusActionButton = document.getElementById('statusActionButton');
    const contextMenu = document.getElementById('contextMenu');
    const graphMinimap = document.getElementById('graphMinimap');
    const minimapSvg = document.getElementById('minimapSvg');
    const minimapEdgeLayer = document.getElementById('minimapEdgeLayer');
    const minimapNodeLayer = document.getElementById('minimapNodeLayer');
    const minimapViewport = document.getElementById('minimapViewport');
    const minimapZoomOutButton = document.getElementById('minimapZoomOutButton');
    const minimapZoomResetButton = document.getElementById('minimapZoomResetButton');
    const minimapZoomInButton = document.getElementById('minimapZoomInButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const reloadButton = document.getElementById('reloadButton');
    const workspaceLed = document.getElementById('workspaceLed');
    const abortMergeButton = document.getElementById('abortMergeButton');
    const scopeSelect = document.getElementById('scopeSelect');
    const viewOptionsButton = document.getElementById('viewOptionsButton');
    const viewOptionsMenu = document.getElementById('viewOptionsMenu');
    const showTagsToggle = document.getElementById('showTagsToggle');
    const showRemoteBranchesToggle = document.getElementById('showRemoteBranchesToggle');
    const showStashesToggle = document.getElementById('showStashesToggle');
    const showMinimapToggle = document.getElementById('showMinimapToggle');
    const searchInput = document.getElementById('searchInput');
    const searchResultBadge = document.getElementById('searchResultBadge');
    const searchPrevButton = document.getElementById('searchPrevButton');
    const searchNextButton = document.getElementById('searchNextButton');
    const searchClearButton = document.getElementById('searchClearButton');
    const centerHeadButton = document.getElementById('centerHeadButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomResetButton = document.getElementById('zoomResetButton');
    const zoomInButton = document.getElementById('zoomInButton');
    let currentState = null;
    let references = [];
    let currentHeadName = null;
    let currentHeadUpstreamName = null;
    let publishedLocalBranchNames = new Set();
    let isWorkspaceDirty = false;
    let hasConflictedMerge = false;
    let currentProjectionOptions = {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showCurrentBranchDescendants: false
    };
    let mergeBlockedTargets = new Set();
    let graphNodes = [];
    let graphEdges = [];
    let selected = [];
    let headNodeHash = null;
    let nodeElements = new Map();
    let sceneNodeByHash = new Map();
    let edgeElements = [];
    let graphNodeByHash = new Map();
    let parentMap = new Map();
    let childMap = new Map();
    let headDistanceByHash = new Map();
    let primaryAncestorNextByHash = {};
    let sceneLayoutKey = 'empty';
    let baseCanvasWidth = 880;
    let baseCanvasHeight = 480;
    let currentZoom = 1;
    const minimapZoomLevels = [0.75, 1, 1.35, 1.75, 2.25, 3, 4, 5, 6.5, 8, 10, 12.5, 15, 18, 22, 26, 30];
    const initialWebviewState = vscode.getState() || {};
    let minimapZoom = 1;
    let minimapEnabled = initialWebviewState.showMinimap !== false;
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
    let remoteTagPublicationState = new Map();
    let pendingRemoteTagStateRequests = new Set();
    let activeContextMenuRequest = null;
    let minimapDragState = null;
    let pendingMinimapSyncFrame = 0;
    let pendingMinimapSyncMode = 'none';
    let sceneEventHandlersBound = false;

    window.addEventListener('message', (event) => {
      handleHostMessage(event.data);
    });
    vscode.postMessage({ type: 'webview-ready' });

    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        postMessageWithLoading({ type: 'refresh' }, 'Reloading revision graph...', reloadButton);
      });
    }
    if (workspaceLed) {
      workspaceLed.addEventListener('click', () => {
        if (isWorkspaceDirty) {
          vscode.postMessage({ type: 'open-source-control' });
        }
      });
    }
    if (abortMergeButton) {
      abortMergeButton.addEventListener('click', () => {
        postMessageWithLoading({ type: 'abort-merge' }, 'Aborting merge...', abortMergeButton);
      });
    }
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        const nextRefScope = scopeSelect.value;
        const options = { refScope: nextRefScope };
        postMessageWithLoading({
          type: 'set-projection-options',
          options
        }, 'Updating graph scope...', scopeSelect);
      });
    }
    if (viewOptionsButton) {
      viewOptionsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleViewOptionsMenu();
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
    if (showRemoteBranchesToggle) {
      showRemoteBranchesToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showRemoteBranches: showRemoteBranchesToggle.checked }
        }, showRemoteBranchesToggle.checked ? 'Showing remote branches...' : 'Hiding remote branches...', showRemoteBranchesToggle);
      });
    }
    if (showStashesToggle) {
      showStashesToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showStashes: showStashesToggle.checked }
        }, showStashesToggle.checked ? 'Showing stash refs...' : 'Hiding stash refs...', showStashesToggle);
      });
    }
    if (showMinimapToggle) {
      showMinimapToggle.addEventListener('change', () => {
        setMinimapEnabled(showMinimapToggle.checked);
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
    if (centerHeadButton) {
      centerHeadButton.addEventListener('click', async () => {
        await runWithLoading('Centering on HEAD...', async () => {
          centerGraphInViewport();
        }, centerHeadButton, 'subtle');
      });
    }
    if (zoomOutButton) {
      zoomOutButton.addEventListener('click', () => {
        zoomOut();
      });
    }
    if (zoomResetButton) {
      zoomResetButton.addEventListener('click', () => {
        resetZoom();
      });
    }
    if (zoomInButton) {
      zoomInButton.addEventListener('click', () => {
        zoomIn();
      });
    }
    if (statusActionButton) {
      statusActionButton.addEventListener('click', () => {
        if (statusActionButton.dataset.action === 'choose-repository') {
          postMessageWithLoading({ type: 'choose-repository' }, 'Choosing repository...', statusActionButton);
        }
      });
    }
    if (graphMinimap) {
      graphMinimap.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
          return;
        }
        if (!minimapEnabled || (event.target && typeof event.target.closest === 'function' && event.target.closest('.minimap-zoom-button'))) {
          return;
        }
        minimapDragState = { active: true };
        centerViewportFromMinimapEvent(event);
        closeContextMenu();
        event.preventDefault();
        event.stopPropagation();
      });
      graphMinimap.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          centerGraphInViewport();
        }
      });
    }
    if (minimapZoomOutButton) {
      minimapZoomOutButton.addEventListener('click', (event) => {
        event.stopPropagation();
        zoomOutMinimap();
      });
    }
    if (minimapZoomResetButton) {
      minimapZoomResetButton.addEventListener('click', (event) => {
        event.stopPropagation();
        resetMinimapZoom();
      });
    }
    if (minimapZoomInButton) {
      minimapZoomInButton.addEventListener('click', (event) => {
        event.stopPropagation();
        zoomInMinimap();
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
    viewport.addEventListener('scroll', () => syncMinimap('viewport'));
    viewport.addEventListener('scroll', closeContextMenu);
    window.addEventListener('resize', () => {
      syncCanvasSize();
      updateScenePlacement();
      syncMinimap();
      closeContextMenu();
    });
    window.addEventListener('mousemove', (event) => {
      if (minimapDragState) {
        centerViewportFromMinimapEvent(event);
        return;
      }
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
      syncMinimap('viewport');
    });
    window.addEventListener('mouseup', () => {
      if (minimapDragState) {
        minimapDragState = null;
      }
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
      if (
        viewOptionsMenu &&
        !viewOptionsMenu.hidden &&
        !viewOptionsMenu.contains(event.target) &&
        !(viewOptionsButton && viewOptionsButton.contains(event.target))
      ) {
        closeViewOptionsMenu();
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
        closeViewOptionsMenu();
        if (nodeDragState) {
          document.body.classList.remove('node-dragging');
          nodeDragState.element.classList.remove('dragging');
          nodeDragState = null;
          applyNodeLayout(false);
        }
      }
    });

    syncMinimapPreference();
    setZoom(1, { preserveViewport: false });
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
          applyState(message.state, false, { invalidateRemoteTagState: true });
          return;
        case 'patch-metadata':
          applyMetadataPatch(message.patch);
          return;
        case 'patch-workspace-state':
          applyWorkspaceStatePatch(message.patch);
          return;
        case 'set-remote-tag-state':
          setRemoteTagState(message.tagName, message.state);
          return;
        case 'set-loading':
          showLoading(message.label, null, message.mode || 'blocking');
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
      publishedLocalBranchNames = new Set(nextState.publishedLocalBranchNames || []);
      isWorkspaceDirty = !!nextState.isWorkspaceDirty;
      hasConflictedMerge = !!nextState.hasConflictedMerge;
      currentProjectionOptions = nextState.projectionOptions || currentProjectionOptions;
      mergeBlockedTargets = new Set(nextState.mergeBlockedTargets || []);
      references = nextState.references || [];
      syncRemoteTagStateCache(nextState, previousRepositoryPath, !!options.invalidateRemoteTagState);
      graphNodes = nextState.nodeLayouts || [];
      graphEdges = (nextState.scene && nextState.scene.edges) || [];
      graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
      primaryAncestorNextByHash = nextState.primaryAncestorNextByHash || {};
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
      if (nextState.loading) {
        hideStatus();
        showLoading(nextState.loadingLabel || 'Loading revision graph...', null, 'blocking');
      } else {
        hideLoading();
      }
      if (nextState.errorMessage) {
        showError(nextState.errorMessage);
      } else if (!nextState.loading && nextState.viewMode === 'empty') {
        showStatus(
          nextState.emptyMessage || 'No revision graph available.',
          false,
          nextState.hasRepositories ? { action: 'choose-repository', label: 'Choose Repository' } : null
        );
      } else if (!nextState.loading) {
        hideStatus();
      }

      const shouldResetSearch =
        nextState.viewMode !== 'ready' ||
        (!!previousRepositoryPath && previousRepositoryPath !== (nextState.repositoryPath || null));
      const shouldRecenter = !options.preserveViewport && (isInit || previousSceneLayoutKey !== sceneLayoutKey);
      if (hasStoredNodeOffsets()) {
        applyNodeLayout(false);
      }
      syncSelection();
      if (shouldResetSearch) {
        clearSearchQuery(false);
      } else {
        syncSearchResults({ preserveActiveHash: true, focusActive: false });
      }
      requestAnimationFrame(() => {
        if (viewportSnapshot) {
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

      if (applyReferenceMetadataPatch(patch)) {
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

    function applyReferenceMetadataPatch(patch) {
      if (
        !patch ||
        !currentState ||
        currentState.viewMode !== 'ready' ||
        !patch.scene ||
        !patch.nodeLayouts
      ) {
        return false;
      }

      const sceneNodes = (patch.scene && patch.scene.nodes) || [];
      if (patch.sceneLayoutKey && patch.sceneLayoutKey !== sceneLayoutKey) {
        return false;
      }

      if (!haveSameNodeHashes((currentState.scene && currentState.scene.nodes) || [], sceneNodes)) {
        return false;
      }

      const nextGraphNodes = patch.nodeLayouts || [];
      const layoutByHash = new Map(nextGraphNodes.map((node) => [node.hash, node]));
      for (const node of sceneNodes) {
        if (!nodeElements.get(node.hash) || !layoutByHash.get(node.hash)) {
          return false;
        }
      }

      const selectionSnapshot = patch.preserveSelection ? captureSelectionSnapshot() : [];
      currentState = Object.assign({}, currentState, patch, {
        loading: false,
        loadingLabel: undefined,
        errorMessage: undefined
      });
      currentHeadName = currentState.currentHeadName || null;
      currentHeadUpstreamName = currentState.currentHeadUpstreamName || null;
      publishedLocalBranchNames = new Set(currentState.publishedLocalBranchNames || []);
      isWorkspaceDirty = !!currentState.isWorkspaceDirty;
      hasConflictedMerge = !!currentState.hasConflictedMerge;
      currentProjectionOptions = currentState.projectionOptions || currentProjectionOptions;
      mergeBlockedTargets = new Set(currentState.mergeBlockedTargets || []);
      references = currentState.references || [];
      syncRemoteTagStateCache(currentState, currentState.repositoryPath || null);
      graphNodes = nextGraphNodes;
      graphEdges = (currentState.scene && currentState.scene.edges) || [];
      graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
      primaryAncestorNextByHash = currentState.primaryAncestorNextByHash || {};
      baseCanvasWidth = currentState.baseCanvasWidth || baseCanvasWidth;
      baseCanvasHeight = currentState.baseCanvasHeight || baseCanvasHeight;

      let replacedNodeCount = 0;
      sceneNodeByHash = new Map(sceneNodes.map((node) => [node.hash, node]));
      for (const node of sceneNodes) {
        const element = nodeElements.get(node.hash);
        const layout = layoutByHash.get(node.hash);
        const nextRenderKey = getNodeRenderKey(node, layout);
        if (element.getAttribute('data-node-render-key') === nextRenderKey) {
          continue;
        }

        const previousLeft = element.style.left;
        const container = document.createElement('div');
        container.innerHTML = renderNodeMarkup(node, layout, nextRenderKey);
        const nextElement = container.firstElementChild;
        if (!nextElement) {
          return false;
        }
        nextElement.style.left = previousLeft;
        element.replaceWith(nextElement);
        replacedNodeCount += 1;
      }

      refreshGraphCaches();
      if (replacedNodeCount > 0) {
        bindSceneEventHandlers();
      }
      if (patch.preserveSelection) {
        restoreSelectionSnapshot(selectionSnapshot);
      } else {
        const availableReferenceIds = new Set(references.map((ref) => ref.id));
        selected = selected.filter((refId) => availableReferenceIds.has(refId)).slice(0, 2);
      }
      updateChrome(currentState);
      syncSelection();
      syncToolbarActions();
      syncSearchResults({ preserveActiveHash: true, focusActive: false });
      syncMinimap('full');
      hideLoading();
      hideStatus();
      return true;
    }

    function syncRemoteTagStateCache(nextState, previousRepositoryPath, invalidateRemoteTagState) {
      const nextRepositoryPath = nextState && nextState.repositoryPath ? nextState.repositoryPath : null;
      if (previousRepositoryPath !== nextRepositoryPath || invalidateRemoteTagState) {
        remoteTagPublicationState.clear();
        pendingRemoteTagStateRequests.clear();
        return;
      }

      const currentTagNames = new Set(((nextState && nextState.references) || [])
        .filter((ref) => ref.kind === 'tag')
        .map((ref) => ref.name));
      for (const tagName of remoteTagPublicationState.keys()) {
        if (!currentTagNames.has(tagName)) {
          remoteTagPublicationState.delete(tagName);
        }
      }
      for (const tagName of pendingRemoteTagStateRequests.keys()) {
        if (!currentTagNames.has(tagName)) {
          pendingRemoteTagStateRequests.delete(tagName);
        }
      }
    }

    function haveSameNodeHashes(currentNodes, nextNodes) {
      if (currentNodes.length !== nextNodes.length) {
        return false;
      }

      const currentHashes = new Set(currentNodes.map((node) => node.hash));
      return nextNodes.every((node) => currentHashes.has(node.hash));
    }

    function applyWorkspaceStatePatch(patch) {
      if (!patch || !currentState) {
        return;
      }

      currentState = Object.assign({}, currentState, patch, {
        loading: false,
        loadingLabel: undefined,
        errorMessage: undefined
      });
      isWorkspaceDirty = !!currentState.isWorkspaceDirty;
      updateChrome(currentState);
      syncToolbarActions();
      hideLoading();
      hideStatus();
    }

    function setRemoteTagState(tagName, state) {
      if (!tagName) {
        return;
      }

      const normalizedState = state === 'published' || state === 'unpublished' || state === 'unknown'
        ? state
        : 'unknown';

      pendingRemoteTagStateRequests.delete(tagName);
      remoteTagPublicationState.set(tagName, normalizedState);
      if (
        activeContextMenuRequest &&
        activeContextMenuRequest.target &&
        activeContextMenuRequest.target.kind === 'tag' &&
        activeContextMenuRequest.target.name === tagName &&
        contextMenu.classList.contains('open')
      ) {
        openContextMenu(
          activeContextMenuRequest.clientX,
          activeContextMenuRequest.clientY,
          activeContextMenuRequest.target
        );
      }
    }

    function captureSelectionSnapshot() {
      return selected
        .map((selectionId) => getSelectionTarget(selectionId))
        .filter((target) => !!target)
        .slice(0, 2)
        .map((target) => ({
          id: target.id,
          hash: target.hash,
          revision: target.revision,
          label: target.label,
          kind: target.kind
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

      const selectableTargets = getSelectableTargets();
      const exactMatch = selectableTargets.find((ref) => ref.id === target.id && !usedReferenceIds.has(ref.id));
      if (exactMatch) {
        return exactMatch;
      }

      if (target.kind === 'head') {
        const currentHead = selectableTargets.find((ref) => ref.kind === 'head' && !usedReferenceIds.has(ref.id));
        if (currentHead) {
          return currentHead;
        }
      }

      const matchPredicates = [
        (ref) => ref.hash === target.hash && ref.revision === target.revision && ref.kind === target.kind,
        (ref) => ref.revision === target.revision && ref.kind === target.kind,
        (ref) => ref.hash === target.hash && ref.revision === target.revision,
        (ref) => ref.revision === target.revision,
        (ref) => ref.hash === target.hash
      ];

      for (const predicate of matchPredicates) {
        const match = selectableTargets.find((ref) => !usedReferenceIds.has(ref.id) && predicate(ref));
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
      syncMinimap('viewport');
    }

    function hasStoredNodeOffsets() {
      return Object.values(nodeOffsets).some((offset) => Math.abs(Number(offset) || 0) > 0.5);
    }

    function updateChrome(state) {
      if (scopeSelect) {
        scopeSelect.value = state.projectionOptions.refScope;
      }
      if (showTagsToggle) {
        showTagsToggle.checked = !!state.projectionOptions.showTags;
      }
      if (showRemoteBranchesToggle) {
        showRemoteBranchesToggle.checked = !!state.projectionOptions.showRemoteBranches;
      }
      if (showStashesToggle) {
        showStashesToggle.checked = !!state.projectionOptions.showStashes;
      }
      if (workspaceLed) {
        const tooltip = state.hasMergeConflicts
          ? 'Merge conflicts detected: click to open Source Control.'
          : state.isWorkspaceDirty
            ? 'Workspace dirty: click to open Source Control Changes.'
            : 'Workspace clean: no pending changes.';
        workspaceLed.classList.toggle('dirty', !!state.isWorkspaceDirty);
        workspaceLed.classList.toggle('clean', !state.isWorkspaceDirty);
        workspaceLed.disabled = !state.isWorkspaceDirty;
        workspaceLed.setAttribute('aria-label', tooltip);
        workspaceLed.title = tooltip;
      }
      if (abortMergeButton) {
        abortMergeButton.hidden = !state.hasConflictedMerge;
      }
      syncViewOptionsButton();
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
        sceneNodeByHash = new Map();
        refreshGraphCaches();
        syncCanvasSize();
        updateScenePlacement();
        return;
      }

      const sceneNodes = (state.scene && state.scene.nodes) || [];
      sceneNodeByHash = new Map(sceneNodes.map((node) => [node.hash, node]));
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
      if (sceneEventHandlersBound || !nodeLayer) {
        return;
      }

      nodeLayer.addEventListener('click', (event) => {
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        if (refElement) {
          if (suppressNodeClick) {
            suppressNodeClick = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          const refId = refElement.getAttribute('data-ref-id');
          if (!refId) {
            return;
          }
          toggleSelection(refId, event.ctrlKey || event.metaKey);
          closeContextMenu();
          syncSelection();
          return;
        }

        if (suppressNodeClick || isNodeGripEvent(event)) {
          suppressNodeClick = false;
          return;
        }

        const nodeElement = findEventTargetElement(event, '[data-node-hash]');
        const hash = nodeElement ? nodeElement.getAttribute('data-node-hash') : '';
        const target = hash ? getStructuralNodeTarget(hash) : null;
        if (!target) {
          return;
        }
        toggleSelection(target.id, event.ctrlKey || event.metaKey);
        closeContextMenu();
        syncSelection();
      });

      nodeLayer.addEventListener('contextmenu', (event) => {
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        if (refElement) {
          event.preventDefault();
          const refId = refElement.getAttribute('data-ref-id');
          const target = refId ? getSelectionTarget(refId) : null;
          if (target) {
            openContextMenu(event.clientX, event.clientY, target);
          }
          return;
        }

        if (isNodeGripEvent(event)) {
          return;
        }

        const nodeElement = findEventTargetElement(event, '[data-node-hash]');
        const hash = nodeElement ? nodeElement.getAttribute('data-node-hash') : '';
        const target = hash ? getStructuralNodeTarget(hash) : null;
        if (!target) {
          return;
        }
        event.preventDefault();
        openContextMenu(event.clientX, event.clientY, target);
      });

      nodeLayer.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
          return;
        }
        const grip = findEventTargetElement(event, '[data-node-grip]');
        if (!grip) {
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

      sceneEventHandlersBound = true;
    }

    function findEventTargetElement(event, selector) {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') {
        return null;
      }
      const element = target.closest(selector);
      return element && nodeLayer && nodeLayer.contains(element) ? element : null;
    }

    function renderNodeMarkup(node, layout, renderKey = undefined) {
      if (!layout) {
        return '';
      }
      const nodeRenderKey = renderKey || getNodeRenderKey(node, layout);
      const y = layout.defaultTop;
      const summary = node.refs.length === 0
        ? '<div class="node-summary">' + escapeHtml(formatNodeSummary(node)) + '</div>'
        : '';
      const baseBadge = '<span class="node-base-badge">(Base)</span>';
      const refLines = node.refs
        .map((ref) => {
          const refId = createReferenceId(node.hash, ref.kind, ref.name);
          return '<div class="ref-line kind-' + escapeHtml(ref.kind) + '" data-ref-id="' + escapeHtml(refId) + '" data-ref-name="' + escapeHtml(ref.name) + '" data-ref-kind="' + escapeHtml(ref.kind) + '">' + escapeHtml(ref.name) + '</div>';
        })
        .join('');

      return '<div class="node ' + getNodeClass(node) + '" data-node-hash="' + escapeHtml(node.hash) + '" data-node-render-key="' + escapeHtml(nodeRenderKey) + '" data-node-width="' + layout.width + '" data-node-height="' + layout.height + '" data-default-left="' + layout.defaultLeft + '" data-default-top="' + y + '" style="left:' + layout.defaultLeft + 'px; top:' + y + 'px; width:' + layout.width + 'px" title="' + escapeHtml(formatNodeTitle(node)) + '">' +
        '<button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>' +
        refLines +
        summary +
        baseBadge +
      '</div>';
    }

    function getNodeRenderKey(node, layout) {
      if (!node || !layout) {
        return '';
      }

      return JSON.stringify({
        hash: node.hash,
        className: getNodeClass(node),
        width: layout.width,
        height: layout.height,
        defaultLeft: layout.defaultLeft,
        defaultTop: layout.defaultTop,
        refs: node.refs.map((ref) => [ref.kind, ref.name]),
        title: formatNodeTitle(node),
        summary: node.refs.length === 0 ? formatNodeSummary(node) : ''
      });
    }

    function renderEdgeMarkup(edge, layoutByHash) {
      const childNode = layoutByHash.get(edge.from);
      const parentNode = layoutByHash.get(edge.to);
      if (!childNode || !parentNode) {
        return '';
      }

      const anchors = getEdgeAnchorPoints(parentNode, childNode);
      const path = describeEdgePath(anchors.sourceX, anchors.sourceY, anchors.targetX, anchors.targetY);

	      return '<path class="graph-edge" data-edge-from="' + edge.from + '" data-edge-to="' + edge.to + '" d="' + path + '" fill="none" stroke="var(--edge)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>';
	    }

    function getEdgeAnchorPoints(sourceNode, targetNode) {
      const sourceCenterY = sourceNode.defaultTop + sourceNode.height / 2;
      const targetCenterY = targetNode.defaultTop + targetNode.height / 2;
      const connectsDownward = sourceCenterY <= targetCenterY;

      return {
        sourceX: sourceNode.defaultLeft + sourceNode.width / 2,
        sourceY: connectsDownward
          ? sourceNode.defaultTop + sourceNode.height - ${EDGE_VERTICAL_INSET}
          : sourceNode.defaultTop + ${EDGE_VERTICAL_INSET},
        targetX: targetNode.defaultLeft + targetNode.width / 2,
        targetY: connectsDownward
          ? targetNode.defaultTop + ${EDGE_VERTICAL_INSET}
          : targetNode.defaultTop + targetNode.height - ${EDGE_VERTICAL_INSET}
      };
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
	      if (kinds.size === 1 && kinds.has('stash')) {
	        return 'node-stash';
	      }
	      if (kinds.size === 1 && kinds.has('branch')) {
	        return 'node-branch';
	      }
      return 'node-mixed';
    }

	    function formatNodeSummary(node) {
	      return node.hash.slice(0, 8);
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
	      const deltaX = Math.abs(sourceX - targetX);
	      const deltaY = Math.abs(sourceY - targetY);
	      if (deltaX < 12 || deltaY < 24) {
	        return 'M ' + sourceX + ' ' + sourceY + ' L ' + targetX + ' ' + targetY;
	      }

	      const direction = targetY >= sourceY ? 1 : -1;
	      const approachLength = Math.min(Math.max(deltaY * 0.38, 36), 128);
	      const bendY = targetY - direction * approachLength;
	      return 'M ' + sourceX + ' ' + sourceY + ' L ' + targetX + ' ' + bendY + ' L ' + targetX + ' ' + targetY;
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

    function createCommitSelectionId(hash) {
      return 'commit::' + hash;
    }

    function getSelectionTarget(selectionId) {
      if (!selectionId) {
        return null;
      }

      if (selectionId.startsWith('commit::')) {
        const hash = selectionId.slice('commit::'.length);
        const node = sceneNodeByHash.get(hash);
        if (!node || node.refs.length > 0) {
          return null;
        }
        return {
          id: selectionId,
          hash,
          name: hash,
          revision: hash,
          label: hash.slice(0, 8),
          kind: 'commit'
        };
      }

      const reference = getReference(selectionId);
      if (!reference) {
        return null;
      }

      return {
        id: reference.id,
        hash: reference.hash,
        name: reference.name,
        revision: reference.name,
        label: reference.name,
        kind: reference.kind
      };
    }

    function getSelectableTargets() {
      const refTargets = references.map((reference) => ({
        id: reference.id,
        hash: reference.hash,
        name: reference.name,
        revision: reference.name,
        label: reference.name,
        kind: reference.kind
      }));
      const commitTargets = Array.from(sceneNodeByHash.values())
        .filter((node) => node.refs.length === 0)
        .map((node) => ({
          id: createCommitSelectionId(node.hash),
          hash: node.hash,
          name: node.hash,
          revision: node.hash,
          label: node.hash.slice(0, 8),
          kind: 'commit'
        }));

      return [...refTargets, ...commitTargets];
    }

    function getStructuralNodeTarget(hash) {
      return getSelectionTarget(createCommitSelectionId(hash));
    }

    function toggleSelection(selectionId, additive) {
      const existingIndex = selected.indexOf(selectionId);
      if (!additive && selected.length === 1 && existingIndex === 0) {
        selected.splice(0, selected.length);
      } else if (!additive) {
        selected.splice(0, selected.length, selectionId);
      } else if (existingIndex >= 0) {
        selected.splice(existingIndex, 1);
      } else if (selected.length < 2) {
        selected.push(selectionId);
      } else {
        selected.splice(0, selected.length, selected[1], selectionId);
      }
    }

    function isNodeGripEvent(event) {
      const target = event.target;
      return !!(target && typeof target.closest === 'function' && target.closest('[data-node-grip]'));
    }

    function showStatus(message, isError, action = null) {
      if (!statusCard) {
        return;
      }
      if (statusMessage) {
        statusMessage.textContent = message;
      }
      statusCard.hidden = false;
      statusCard.classList.toggle('error', !!isError);
      if (statusActionButton) {
        if (action) {
          statusActionButton.hidden = false;
          statusActionButton.textContent = action.label;
          statusActionButton.dataset.action = action.action;
        } else {
          statusActionButton.hidden = true;
          statusActionButton.textContent = '';
          delete statusActionButton.dataset.action;
        }
      }
    }

    function hideStatus() {
      if (!statusCard) {
        return;
      }
      statusCard.hidden = true;
      statusCard.classList.remove('error');
      if (statusMessage) {
        statusMessage.textContent = '';
      }
      if (statusActionButton) {
        statusActionButton.hidden = true;
        statusActionButton.textContent = '';
        delete statusActionButton.dataset.action;
      }
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

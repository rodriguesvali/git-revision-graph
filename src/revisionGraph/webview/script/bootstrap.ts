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
    const fetchAllButton = document.getElementById('fetchAllButton');
    const pullButton = document.getElementById('pullButton');
    const pushButton = document.getElementById('pushButton');
    const syncButton = document.getElementById('syncButton');
    const scopeSelect = document.getElementById('scopeSelect');
    const viewOptionsButton = document.getElementById('viewOptionsButton');
    const viewOptionsMenu = document.getElementById('viewOptionsMenu');
    const showTagsToggle = document.getElementById('showTagsToggle');
    const showRemoteBranchesToggle = document.getElementById('showRemoteBranchesToggle');
    const showStashesToggle = document.getElementById('showStashesToggle');
    const showMergeCommitsToggle = document.getElementById('showMergeCommitsToggle');
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
    let hasMergeConflicts = false;
    let hasConflictedMerge = false;
    let currentProjectionOptions = {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showMergeCommits: false,
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
    let graphEdgeByKey = new Map();
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
    let minimapEnabled = initialWebviewState.showMinimap === true;
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
    let activeWebviewTraceMessage = null;
    let viewportClientWidth = 0;
    let viewportClientHeight = 0;
    const VIRTUAL_RENDER_OVERSCAN_PX = 900;
    const VIRTUAL_RENDER_BUCKET_SIZE_PX = 1200;
    let pendingVirtualSceneRenderFrame = 0;
    let lastVirtualSceneKey = '';
    let virtualNodeIndex = new Map();
    let virtualEdgeIndex = new Map();
    const RELOAD_LONG_PRESS_DELAY_MS = 500;
    let reloadLongPressTimer = 0;
    let suppressNextReloadClick = false;
    let reloadCacheMenu = null;

    window.addEventListener('message', (event) => {
      handleHostMessage(event.data);
    });
    vscode.postMessage(createRevisionGraphWebviewReadyMessage());

    if (reloadButton) {
      reloadButton.addEventListener('pointerdown', (event) => {
        if (reloadButton.disabled || (event.button !== undefined && event.button !== 0)) {
          return;
        }
        scheduleReloadLongPressMenu();
      });
      reloadButton.addEventListener('pointerup', cancelReloadLongPressMenu);
      reloadButton.addEventListener('pointercancel', cancelReloadLongPressMenu);
      reloadButton.addEventListener('pointerleave', cancelReloadLongPressMenu);
      reloadButton.addEventListener('click', (event) => {
        if (suppressNextReloadClick) {
          suppressNextReloadClick = false;
          event.preventDefault();
          return;
        }
        reloadRevisionGraph();
      });
    }
    if (fetchAllButton) {
      fetchAllButton.addEventListener('click', () => {
        vscode.postMessage(createRevisionGraphFetchCurrentRepositoryMessage());
      });
    }
    if (pullButton) {
      pullButton.addEventListener('click', () => {
        postMessageWithLoading(createRevisionGraphPullCurrentHeadMessage(), 'Pulling current branch...', pullButton);
      });
    }
    if (pushButton) {
      pushButton.addEventListener('click', () => {
        vscode.postMessage(createRevisionGraphPushCurrentHeadMessage());
      });
    }
    if (syncButton) {
      syncButton.addEventListener('click', () => {
        postMessageWithLoading(createRevisionGraphSyncCurrentHeadMessage(), 'Synchronizing current branch...', syncButton);
      });
    }
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        const nextRefScope = scopeSelect.value;
        const options = { refScope: nextRefScope };
        postMessageWithLoading(createRevisionGraphProjectionOptionsMessage(options), 'Updating graph scope...', scopeSelect);
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
        postMessageWithLoading(createRevisionGraphProjectionOptionsMessage({ showTags: showTagsToggle.checked }), showTagsToggle.checked ? 'Showing tags...' : 'Hiding tags...', showTagsToggle);
      });
    }
    if (showRemoteBranchesToggle) {
      showRemoteBranchesToggle.addEventListener('change', () => {
        postMessageWithLoading(createRevisionGraphProjectionOptionsMessage({ showRemoteBranches: showRemoteBranchesToggle.checked }), showRemoteBranchesToggle.checked ? 'Showing remote branches...' : 'Hiding remote branches...', showRemoteBranchesToggle);
      });
    }
    if (showStashesToggle) {
      showStashesToggle.addEventListener('change', () => {
        postMessageWithLoading(createRevisionGraphProjectionOptionsMessage({ showStashes: showStashesToggle.checked }), showStashesToggle.checked ? 'Showing stash refs...' : 'Hiding stash refs...', showStashesToggle);
      });
    }
    if (showMergeCommitsToggle) {
      showMergeCommitsToggle.addEventListener('change', () => {
        postMessageWithLoading(createRevisionGraphProjectionOptionsMessage({ showMergeCommits: showMergeCommitsToggle.checked }), showMergeCommitsToggle.checked ? 'Showing merge commits...' : 'Hiding merge commits...', showMergeCommitsToggle);
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
          postMessageWithLoading(createRevisionGraphChooseRepositoryMessage(), 'Choosing repository...', statusActionButton);
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
    viewport.addEventListener('scroll', () => {
      scheduleVirtualSceneRender('scroll');
      syncMinimap('viewport');
    });
    viewport.addEventListener('scroll', closeContextMenu);
    window.addEventListener('resize', () => {
      readViewportLayoutSize();
      syncCanvasSize();
      updateScenePlacement();
      scheduleVirtualSceneRender('resize', true);
      syncMinimap();
      closeContextMenu();
    });
    window.addEventListener('mousemove', (event) => {
      if (minimapDragState) {
        if (event.buttons !== undefined && (event.buttons & 1) === 0) {
          endMinimapDrag();
          return;
        }
        centerViewportFromMinimapEvent(event);
        return;
      }
      if (nodeDragState) {
        if (event.buttons !== undefined && (event.buttons & 1) === 0) {
          endNodeDrag(true);
          return;
        }
        const defaultLeft = getDefaultNodeLeft(nodeDragState.hash);
        const rawOffset = nodeDragState.startOffset + (event.clientX - nodeDragState.startX) / currentZoom;
        nodeOffsets[nodeDragState.hash] = clampNodeOffset(nodeDragState.hash, defaultLeft, rawOffset);
        applyNodeLayout(false);
        return;
      }
      if (!dragState) {
        return;
      }
      if (event.buttons !== undefined && (event.buttons & 1) === 0) {
        endViewportDrag();
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
      endPointerDrivenInteractions();
    });
    window.addEventListener('blur', endPointerDrivenInteractions);
    window.addEventListener('dragstart', endPointerDrivenInteractions);
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('mouseleave', endPointerDrivenInteractions);
    }
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
      if (
        reloadCacheMenu &&
        !reloadCacheMenu.hidden &&
        !reloadCacheMenu.contains(event.target) &&
        !(reloadButton && reloadButton.contains(event.target))
      ) {
        closeReloadCacheMenu();
      }
    });
    window.addEventListener('blur', closeReloadCacheMenu);
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
        closeReloadCacheMenu();
        if (endNodeDrag(false)) {
          applyNodeLayout(false);
        }
        endViewportDrag();
        endMinimapDrag();
      }
    });

    syncMinimapPreference();
    readViewportLayoutSize();
    setZoom(1, { preserveViewport: false });
    syncCanvasSize();
    updateScenePlacement();
    syncToolbarActions();

    function endPointerDrivenInteractions() {
      endMinimapDrag();
      endNodeDrag(true);
      endViewportDrag();
    }

    function reloadRevisionGraph() {
      closeReloadCacheMenu();
      postMessageWithLoading(createRevisionGraphRefreshMessage(), 'Reloading revision graph...', reloadButton);
    }

    function reloadRevisionGraphWithEmptyCache() {
      closeReloadCacheMenu();
      postMessageWithLoading(
        createRevisionGraphRefreshWithEmptyCacheMessage(),
        'Reloading revision graph with empty cache...',
        reloadButton
      );
    }

    function scheduleReloadLongPressMenu() {
      cancelReloadLongPressMenu();
      reloadLongPressTimer = window.setTimeout(() => {
        reloadLongPressTimer = 0;
        suppressNextReloadClick = true;
        showReloadCacheMenu();
      }, RELOAD_LONG_PRESS_DELAY_MS);
    }

    function cancelReloadLongPressMenu() {
      if (reloadLongPressTimer) {
        window.clearTimeout(reloadLongPressTimer);
        reloadLongPressTimer = 0;
      }
    }

    function showReloadCacheMenu() {
      if (!reloadButton) {
        return;
      }
      if (!reloadCacheMenu) {
        reloadCacheMenu = document.createElement('div');
        reloadCacheMenu.className = 'reload-cache-menu';
        reloadCacheMenu.hidden = true;
        reloadCacheMenu.setAttribute('role', 'menu');
        const emptyCacheButton = document.createElement('button');
        emptyCacheButton.type = 'button';
        emptyCacheButton.className = 'reload-cache-menu-button';
        emptyCacheButton.textContent = 'With Empty Cache';
        emptyCacheButton.setAttribute('role', 'menuitem');
        emptyCacheButton.addEventListener('click', (event) => {
          event.stopPropagation();
          reloadRevisionGraphWithEmptyCache();
        });
        reloadCacheMenu.appendChild(emptyCacheButton);
        document.body.appendChild(reloadCacheMenu);
      }

      reloadCacheMenu.hidden = false;
      const buttonRect = reloadButton.getBoundingClientRect();
      const menuRect = reloadCacheMenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const leftLimit = Math.max(8, viewportWidth - menuRect.width - 8);
      const left = Math.min(Math.max(8, buttonRect.left), leftLimit);
      reloadCacheMenu.style.left = left + 'px';
      reloadCacheMenu.style.top = Math.max(8, buttonRect.bottom + 6) + 'px';
      const firstButton = reloadCacheMenu.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    }

    function closeReloadCacheMenu() {
      cancelReloadLongPressMenu();
      if (reloadCacheMenu) {
        reloadCacheMenu.hidden = true;
      }
      suppressNextReloadClick = false;
    }

    function endMinimapDrag() {
      if (!minimapDragState) {
        return false;
      }

      minimapDragState = null;
      return true;
    }

    function endNodeDrag(shouldPersist) {
      if (!nodeDragState) {
        return false;
      }

      document.body.classList.remove('node-dragging');
      nodeDragState.element.classList.remove('dragging');
      if (shouldPersist) {
        persistNodeLayout();
      }
      nodeDragState = null;
      return true;
    }

    function endViewportDrag() {
      if (!dragState) {
        return false;
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
      return true;
    }

    function handleHostMessage(message) {
      if (!message || typeof message.type !== 'string') {
        return;
      }

      switch (message.type) {
        case 'init-state':
          applyTracedHostMessage(message, 'webview.apply.init-state', () => {
            applyState(message.state, true);
          });
          return;
        case 'update-state':
          applyTracedHostMessage(message, 'webview.apply.update-state', () => {
            applyState(message.state, false, { invalidateRemoteTagState: true });
          });
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

    function applyTracedHostMessage(message, phase, apply) {
      const previousTraceMessage = activeWebviewTraceMessage;
      activeWebviewTraceMessage = hasWebviewTraceContext(message) ? message : null;
      const startedAt = getTraceNow();
      try {
        apply();
      } finally {
        postWebviewLoadTrace(message, phase, startedAt, { includeDelivery: true });
        activeWebviewTraceMessage = previousTraceMessage;
      }
    }

    function traceWebviewPhase(phase, work, detail = '') {
      return traceWebviewPhaseForMessage(activeWebviewTraceMessage, phase, work, detail);
    }

    function traceWebviewPhaseForMessage(traceMessage, phase, work, detail = '') {
      if (!traceMessage) {
        return work();
      }

      const startedAt = getTraceNow();
      try {
        return work();
      } finally {
        postWebviewLoadTrace(traceMessage, phase, startedAt, { detail });
      }
    }

    function postWebviewLoadTrace(message, phase, startedAt, options = {}) {
      if (!hasWebviewTraceContext(message)) {
        return;
      }

      const finishedAt = getTraceNow();
      const durationMs = Math.max(0, finishedAt - startedAt);
      const deliveryMs = Math.max(0, startedAt - message.trace.sentAtMs);
      vscode.postMessage(createRevisionGraphLoadTraceMessage(
        phase,
        durationMs,
        buildWebviewLoadTraceDetail(message, options.includeDelivery ? deliveryMs : null, options.detail || ''),
        message.trace.requestId
      ));
    }

    function hasWebviewTraceContext(message) {
      return !!message && !!message.trace && typeof message.trace.requestId === 'number' && typeof message.trace.sentAtMs === 'number';
    }

    function buildWebviewLoadTraceDetail(message, deliveryMs, extraDetail) {
      const details = [
        'message=' + message.type
      ];
      if (deliveryMs !== null) {
        details.push('deliveryMs=' + Math.round(deliveryMs));
      }
      const payload = message.state || message.patch;
      if (payload && payload.scene) {
        details.push('nodes=' + ((payload.scene.nodes && payload.scene.nodes.length) || 0));
        details.push('edges=' + ((payload.scene.edges && payload.scene.edges.length) || 0));
      }
      if (payload && payload.references) {
        details.push('refs=' + payload.references.length);
      }
      if (extraDetail) {
        details.push(extraDetail);
      }
      return details.join('; ');
    }

    function getTraceNow() {
      return Date.now();
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
      traceWebviewPhase('webview.apply.state-model', () => {
        currentState = nextState;
        currentHeadName = nextState.currentHeadName || null;
        currentHeadUpstreamName = nextState.currentHeadUpstreamName || null;
        publishedLocalBranchNames = new Set(nextState.publishedLocalBranchNames || []);
        isWorkspaceDirty = !!nextState.isWorkspaceDirty;
        hasMergeConflicts = !!nextState.hasMergeConflicts;
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
      });

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

      const shouldResetSearch =
        nextState.viewMode !== 'ready' ||
        (!!previousRepositoryPath && previousRepositoryPath !== (nextState.repositoryPath || null));
      const shouldRecenter = !options.preserveViewport && (isInit || previousSceneLayoutKey !== sceneLayoutKey);
      const hasRestoredNodeOffsets = hasStoredNodeOffsets();
      const shouldPrecenterViewport = shouldRecenter && !hasRestoredNodeOffsets;

      traceWebviewPhase('webview.apply.update-chrome', () => updateChrome(nextState));
      traceWebviewPhase('webview.apply.render-scene', () => renderScene(nextState, { precenterViewport: shouldPrecenterViewport }));
      traceWebviewPhase('webview.apply.loading-status', () => {
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
      });

      if (hasRestoredNodeOffsets) {
        traceWebviewPhase('webview.apply.node-offsets', () => applyNodeLayout(false));
      }
      traceWebviewPhase('webview.apply.selection', () => syncSelection());
      traceWebviewPhase('webview.apply.search', () => {
        if (shouldResetSearch) {
          clearSearchQuery(false);
        } else {
          syncSearchResults({ preserveActiveHash: true, focusActive: false });
        }
      });
      const viewportTraceMessage = activeWebviewTraceMessage;
      requestAnimationFrame(() => {
        traceWebviewPhaseForMessage(viewportTraceMessage, 'webview.apply.viewport-frame', () => {
          if (viewportSnapshot) {
            restoreScenePlacementSnapshot(scenePlacementSnapshot);
            restoreViewportSnapshot(viewportSnapshot);
          } else if (shouldRecenter && !shouldPrecenterViewport) {
            centerGraphInViewport();
          }
        }, viewportSnapshot ? 'action=restore' : shouldPrecenterViewport ? 'action=precentered' : shouldRecenter ? 'action=recenter' : 'action=none');
      });
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
      const viewportSize = getViewportLayoutSize();
      const visibleWidth = Math.max(0, viewportSize.width - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewportSize.height - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
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

      const viewportSize = getViewportLayoutSize();
      const visibleWidth = Math.max(0, viewportSize.width - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewportSize.height - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
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
      if (showMergeCommitsToggle) {
        showMergeCommitsToggle.checked = !!state.projectionOptions.showMergeCommits;
      }
      syncViewOptionsButton();
    }

    function renderScene(state, options = {}) {
      traceWebviewPhase('webview.render-scene.geometry', () => {
        canvas.style.width = baseCanvasWidth + 'px';
        canvas.style.height = baseCanvasHeight + 'px';
        sceneLayer.style.width = baseCanvasWidth + 'px';
        sceneLayer.style.height = baseCanvasHeight + 'px';
        graphSvg.setAttribute('viewBox', '0 0 ' + baseCanvasWidth + ' ' + baseCanvasHeight);
      });

      if (state.viewMode !== 'ready') {
        traceWebviewPhase('webview.render-scene.clear', () => {
          edgeLayer.innerHTML = '';
          nodeLayer.innerHTML = '';
          sceneNodeByHash = new Map();
          resetVirtualSceneIndexes();
        });
        traceWebviewPhase('webview.render-scene.refresh-caches', () => refreshGraphCaches());
        traceWebviewPhase('webview.render-scene.canvas-layout', () => {
          syncCanvasSize();
          updateScenePlacement();
        });
        return;
      }

      const sceneNodes = (state.scene && state.scene.nodes) || [];
      traceWebviewPhase('webview.render-scene.indexes', () => {
        sceneNodeByHash = new Map(sceneNodes.map((node) => [node.hash, node]));
        rebuildVirtualSceneIndexes();
      }, 'nodes=' + graphNodes.length + '; edges=' + graphEdges.length);
      if (options.precenterViewport) {
        traceWebviewPhase('webview.render-scene.viewport-precenter', () => {
          syncCanvasSize();
          updateScenePlacement({ source: 'layout' });
          centerGraphInViewport({ source: 'layout', syncMinimap: false });
        }, 'action=recenter');
      }
      traceWebviewPhase('webview.render-scene.virtual-html', () => {
        renderVirtualScene({ force: true });
      }, 'nodes=' + sceneNodes.length + '; edges=' + graphEdges.length);

      traceWebviewPhase('webview.render-scene.refresh-caches', () => refreshGraphCaches());
      traceWebviewPhase('webview.render-scene.bind-handlers', () => bindSceneEventHandlers());
      traceWebviewPhase('webview.render-scene.canvas-layout', () => {
        syncCanvasSize();
        updateScenePlacement();
      });
    }

    function scheduleVirtualSceneRender(reason = 'viewport', force = false) {
      if (force) {
        lastVirtualSceneKey = '';
      }
      if (pendingVirtualSceneRenderFrame) {
        return;
      }

      pendingVirtualSceneRenderFrame = requestAnimationFrame(() => {
        pendingVirtualSceneRenderFrame = 0;
        traceWebviewPhase('webview.render-scene.virtual-frame', () => {
          renderVirtualScene({ reason, force });
        }, 'reason=' + reason);
      });
    }

    function renderVirtualScene(options = {}) {
      if (!currentState || currentState.viewMode !== 'ready') {
        edgeLayer.innerHTML = '';
        nodeLayer.innerHTML = '';
        lastVirtualSceneKey = '';
        refreshGraphCaches();
        return;
      }

      const viewportBounds = getVirtualViewportBounds();
      const visibleLayouts = collectVirtualNodeCandidates(viewportBounds).filter((layout) =>
        sceneNodeByHash.has(layout.hash) && isLayoutVisible(layout, viewportBounds)
      );
      const visibleHashes = new Set(visibleLayouts.map((layout) => layout.hash));
      const visibleEdges = collectVirtualEdgeCandidates(viewportBounds).filter((edge) =>
        isEdgeVisible(edge, viewportBounds, visibleHashes)
      );
      const nextVirtualSceneKey = buildVirtualSceneKey(visibleHashes, visibleEdges);

      if (!options.force && nextVirtualSceneKey === lastVirtualSceneKey) {
        return;
      }

      const layoutByHash = graphNodeByHash;
      nodeLayer.innerHTML = visibleLayouts
        .map((layout) => renderNodeMarkup(sceneNodeByHash.get(layout.hash), layout))
        .join('');
      edgeLayer.innerHTML = visibleEdges
        .map((edge) => renderEdgeMarkup(edge, layoutByHash))
        .join('');
      lastVirtualSceneKey = nextVirtualSceneKey;
      refreshGraphCaches();
      applyNodeLayout(false, { syncMinimap: false, updateScenePlacement: false });
      syncSelection();
      syncSearchHighlights();
    }

    function getVirtualViewportBounds() {
      const visibleSize = getVisibleViewportSize();
      const visibleLeft = Math.max(0, (viewport.scrollLeft - ${VIEWPORT_PADDING_LEFT}) / currentZoom - layoutOffsetX);
      const visibleTop = Math.max(0, (viewport.scrollTop - ${VIEWPORT_PADDING_TOP}) / currentZoom - layoutOffsetY);
      const visibleWidth = visibleSize.width / currentZoom;
      const visibleHeight = visibleSize.height / currentZoom;
      const overscan = VIRTUAL_RENDER_OVERSCAN_PX / Math.max(currentZoom, 0.1);

      return {
        left: Math.max(0, visibleLeft - overscan),
        top: Math.max(0, visibleTop - overscan),
        right: visibleLeft + visibleWidth + overscan,
        bottom: visibleTop + visibleHeight + overscan
      };
    }

    function isLayoutVisible(layout, bounds) {
      const left = layout.defaultLeft + Number(nodeOffsets[layout.hash] || 0);
      const right = left + layout.width;
      const top = layout.defaultTop;
      const bottom = top + layout.height;
      return right >= bounds.left && left <= bounds.right && bottom >= bounds.top && top <= bounds.bottom;
    }

    function isEdgeVisible(edge, bounds, visibleHashes) {
      if (visibleHashes.has(edge.from) || visibleHashes.has(edge.to)) {
        return true;
      }

      const fromLayout = graphNodeByHash.get(edge.from);
      const toLayout = graphNodeByHash.get(edge.to);
      if (!fromLayout || !toLayout) {
        return false;
      }

      const fromX = fromLayout.defaultLeft + Number(nodeOffsets[fromLayout.hash] || 0) + fromLayout.width / 2;
      const fromY = fromLayout.defaultTop + fromLayout.height / 2;
      const toX = toLayout.defaultLeft + Number(nodeOffsets[toLayout.hash] || 0) + toLayout.width / 2;
      const toY = toLayout.defaultTop + toLayout.height / 2;
      return Math.max(fromX, toX) >= bounds.left &&
        Math.min(fromX, toX) <= bounds.right &&
        Math.max(fromY, toY) >= bounds.top &&
        Math.min(fromY, toY) <= bounds.bottom;
    }

    function rebuildVirtualSceneIndexes() {
      virtualNodeIndex = buildVirtualNodeIndex(graphNodes);
      virtualEdgeIndex = buildVirtualEdgeIndex(graphEdges);
    }

    function resetVirtualSceneIndexes() {
      virtualNodeIndex = new Map();
      virtualEdgeIndex = new Map();
    }

    function buildVirtualNodeIndex(layouts) {
      const index = new Map();
      for (const layout of layouts) {
        addVirtualIndexEntry(index, layout.defaultTop, layout.defaultTop + layout.height, layout);
      }
      return index;
    }

    function buildVirtualEdgeIndex(edges) {
      const index = new Map();
      for (const edge of edges) {
        const bounds = getEdgeVerticalBounds(edge);
        if (!bounds) {
          continue;
        }
        addVirtualIndexEntry(index, bounds.top, bounds.bottom, edge);
      }
      return index;
    }

    function getEdgeVerticalBounds(edge) {
      const fromLayout = graphNodeByHash.get(edge.from);
      const toLayout = graphNodeByHash.get(edge.to);
      if (!fromLayout || !toLayout) {
        return null;
      }

      return {
        top: Math.min(fromLayout.defaultTop, toLayout.defaultTop),
        bottom: Math.max(fromLayout.defaultTop + fromLayout.height, toLayout.defaultTop + toLayout.height)
      };
    }

    function addVirtualIndexEntry(index, top, bottom, value) {
      const bucketRange = getVirtualBucketRange(top, bottom);
      if (!bucketRange) {
        return;
      }

      for (let bucket = bucketRange.first; bucket <= bucketRange.last; bucket += 1) {
        const entries = index.get(bucket);
        if (entries) {
          entries.push(value);
        } else {
          index.set(bucket, [value]);
        }
      }
    }

    function getVirtualBucketRange(top, bottom) {
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
        return null;
      }

      const first = Math.floor(Math.max(0, Math.min(top, bottom)) / VIRTUAL_RENDER_BUCKET_SIZE_PX);
      const last = Math.floor(Math.max(0, Math.max(top, bottom)) / VIRTUAL_RENDER_BUCKET_SIZE_PX);
      return { first, last };
    }

    function collectVirtualNodeCandidates(bounds) {
      return collectVirtualIndexCandidates(virtualNodeIndex, bounds, (layout) => layout.hash);
    }

    function collectVirtualEdgeCandidates(bounds) {
      return collectVirtualIndexCandidates(virtualEdgeIndex, bounds, getVirtualEdgeKey);
    }

    function collectVirtualIndexCandidates(index, bounds, getKey) {
      const bucketRange = getVirtualBucketRange(bounds.top, bounds.bottom);
      if (!bucketRange) {
        return [];
      }

      const candidates = [];
      const seen = new Set();
      for (let bucket = bucketRange.first; bucket <= bucketRange.last; bucket += 1) {
        const entries = index.get(bucket) || [];
        for (const entry of entries) {
          const key = getKey(entry);
          if (!key || seen.has(key)) {
            continue;
          }
          seen.add(key);
          candidates.push(entry);
        }
      }
      return candidates;
    }

    function getVirtualEdgeKey(edge) {
      return edge.from + '->' + edge.to;
    }

    function buildVirtualSceneKey(visibleHashes, visibleEdges) {
      return [
        [...visibleHashes].sort().join(','),
        visibleEdges.map(getVirtualEdgeKey).sort().join(',')
      ].join('|');
    }

    function refreshGraphCaches() {
      nodeElements = new Map(
        Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
      );
      edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
      headNodeHash = getCurrentHeadNodeHash();
      graphEdgeByKey = new Map(graphEdges.map((edge) => [getVirtualEdgeKey(edge), edge]));
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

      const path = describeEdgePathForLayouts(edge, parentNode, childNode);

	      return '<path class="graph-edge" data-edge-from="' + edge.from + '" data-edge-to="' + edge.to + '" d="' + path + '" fill="none" stroke="var(--edge)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>';
	    }

    function describeEdgePathForLayouts(edge, sourceNode, targetNode) {
      const anchors = getEdgeAnchorPoints(sourceNode, targetNode);
      const routedPath = describeRoutedEdgePath(edge, sourceNode, targetNode);
      return routedPath || describeEdgePath(anchors.sourceX, anchors.sourceY, anchors.targetX, anchors.targetY);
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

    function describeRoutedEdgePath(edge, sourceNode, targetNode) {
      const route = getRenderableEdgeRoute(edge);
      if (!route) {
        return null;
      }

      const anchors = getEdgeAnchorPoints(sourceNode, targetNode);
      const rawSource = route[0];
      const rawTarget = route[route.length - 1];
      const sourceCenter = {
        x: sourceNode.defaultLeft + sourceNode.width / 2,
        y: sourceNode.defaultTop + sourceNode.height / 2
      };
      const targetCenter = {
        x: targetNode.defaultLeft + targetNode.width / 2,
        y: targetNode.defaultTop + targetNode.height / 2
      };
      const sourceDelta = {
        x: sourceCenter.x - rawSource.x,
        y: sourceCenter.y - rawSource.y
      };
      const targetDelta = {
        x: targetCenter.x - rawTarget.x,
        y: targetCenter.y - rawTarget.y
      };
      const rawDeltaY = rawTarget.y - rawSource.y;
      const fallbackSpan = Math.max(route.length - 1, 1);
      const pathPoints = [
        { x: anchors.sourceX, y: anchors.sourceY },
        ...route.slice(1, -1).map((point, index) => {
          const t = Number.isFinite(rawDeltaY) && Math.abs(rawDeltaY) > 0.001
            ? clamp((point.y - rawSource.y) / rawDeltaY, 0, 1)
            : (index + 1) / fallbackSpan;
          return {
            x: point.x + sourceDelta.x + (targetDelta.x - sourceDelta.x) * t,
            y: point.y + sourceDelta.y + (targetDelta.y - sourceDelta.y) * t
          };
        }),
        { x: anchors.targetX, y: anchors.targetY }
      ];

      return describePolylinePath(pathPoints);
    }

    function getRenderableEdgeRoute(edge) {
      const route = edge && edge.route;
      if (!Array.isArray(route) || route.length <= 2 || !route.every(isFiniteRoutePoint)) {
        return null;
      }

      return [...route].reverse();
    }

    function isFiniteRoutePoint(point) {
      return !!point &&
        typeof point.x === 'number' &&
        Number.isFinite(point.x) &&
        typeof point.y === 'number' &&
        Number.isFinite(point.y);
    }

    function describePolylinePath(points) {
      return points
        .map((point, index) => (index === 0 ? 'M' : 'L') + ' ' + formatPathNumber(point.x) + ' ' + formatPathNumber(point.y))
        .join(' ');
    }

    function formatPathNumber(value) {
      return String(Number(value.toFixed(3)));
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
	      return formatShortCommitHash(node.hash);
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

    function formatShortCommitHash(hash) {
      return String(hash || '').slice(0, 8);
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
          label: formatShortCommitHash(hash),
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
          label: formatShortCommitHash(node.hash),
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
      lastVirtualSceneKey = '';
      refreshGraphCaches();
      showStatus(message, true);
    }
  `;
}

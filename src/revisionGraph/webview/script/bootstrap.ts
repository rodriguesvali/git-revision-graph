const EDGE_VERTICAL_INSET = 6;
const VIEWPORT_PADDING_TOP = 18;
const VIEWPORT_PADDING_RIGHT = 0;
const VIEWPORT_PADDING_BOTTOM = 18;
const VIEWPORT_PADDING_LEFT = 18;

    const vscode = acquireRevisionGraphWebviewApi();
    const zoomLevels = REVISION_GRAPH_WEBVIEW_ZOOM_LEVELS;
    const {
      viewport, canvas, sceneLayer, graphSvg, edgeLayer, nodeLayer,
      statusCard, statusMessage, statusActionButton, contextMenu, referenceTooltip,
      graphMinimap, minimapSvg, minimapEdgeLayer, minimapNodeLayer, minimapViewport,
      minimapZoomOutButton, minimapZoomResetButton, minimapZoomInButton,
      loadingOverlay, loadingMessage, reloadButton, reloadMenuButton, fetchAllButton,
      pullButton, pushButton, pushMenuButton, syncButton, scopeSelect, viewOptionsButton,
      viewOptionsMenu, showTagsToggle, showRemoteBranchesToggle, showStashesToggle,
      showMergeCommitsToggle, showMinimapToggle, flowGovernanceOptions,
      flowGovernanceEnabledToggle, searchInput, searchResultBadge, searchPrevButton,
      searchNextButton, searchClearButton, rangeFilter, rangeFilterLabel,
      rangeFilterClearButton, descendantFilter, descendantFilterLabel,
      descendantFilterClearButton, centerHeadButton, zoomOutButton, zoomResetButton, zoomInButton
    } = createRevisionGraphWebviewDom();
    type RevisionGraphWebviewLegacyNodeLayout = Record<string, unknown> & {
      readonly hash: string;
      readonly defaultLeft: number;
      readonly defaultTop: number;
      readonly width: number;
      readonly height: number;
    };
    type RevisionGraphWebviewLegacyEdge = Record<string, unknown> & {
      readonly from: string;
      readonly to: string;
      readonly route?: readonly unknown[];
    };
    type RevisionGraphWebviewLegacySceneNode = Record<string, unknown> & {
      readonly hash: string;
      readonly refs: readonly RevisionGraphWebviewNodePresentationReference[];
      readonly subject?: string;
      readonly author?: string;
      readonly date?: string;
    };
    type RevisionGraphWebviewLegacyFlowReference = Record<string, unknown> & {
      readonly refName: string;
      readonly kind?: string;
    };
    type RevisionGraphWebviewLegacyFlowGovernance = Record<string, unknown> & {
      readonly enabled?: boolean;
      readonly configSource?: string;
      readonly branchKinds?: readonly unknown[];
      readonly references?: readonly RevisionGraphWebviewLegacyFlowReference[];
    };
    type RevisionGraphWebviewStateHostMessage = Extract<
      RevisionGraphWebviewHostMessage,
      { readonly type: 'init-state' | 'update-state' }
    >;
    type RevisionGraphWebviewTraceContext = {
      readonly trace: { readonly requestId: number; readonly sentAtMs: number };
    };
    type RevisionGraphWebviewTracedStateHostMessage = RevisionGraphWebviewStateHostMessage & RevisionGraphWebviewTraceContext;
    type RevisionGraphWebviewSelectionTarget = RevisionGraphWebviewTarget & { readonly id: string };
    type RevisionGraphWebviewSelectionSnapshotEntry = Pick<
      RevisionGraphWebviewSelectionTarget,
      'id' | 'hash' | 'revision' | 'label' | 'kind'
    >;
    type RevisionGraphWebviewSelectionSnapshot = readonly RevisionGraphWebviewSelectionSnapshotEntry[];
    type RevisionGraphWebviewScenePlacementSnapshot = {
      readonly layoutOffsetX: number;
      readonly layoutOffsetY: number;
    };
    let currentState: RevisionGraphWebviewHostState | null = null;
    let references: RevisionGraphWebviewHostReference[] = [];
    let currentHeadName: string | null = null;
    let currentHeadUpstreamName: string | null = null;
    let publishedLocalBranchNames = new Set<string>();
    let isWorkspaceDirty = false;
    let hasMergeConflicts = false;
    let hasConflictedMerge = false;
    let currentProjectionOptions: RevisionGraphWebviewProjectionOptions = {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showMergeCommits: false,
      showCurrentBranchDescendants: false,
      revisionRange: undefined,
      descendantFocus: undefined
    };
    let currentFlowGovernance: RevisionGraphWebviewLegacyFlowGovernance | null = null;
    let flowReferenceByName = new Map<string, RevisionGraphWebviewLegacyFlowReference>();
    let mergeBlockedTargets = new Set<string>();
    let graphNodes: RevisionGraphWebviewLegacyNodeLayout[] = [];
    let graphEdges: RevisionGraphWebviewLegacyEdge[] = [];
    let selected: string[] = [];
    let headNodeHash: string | null = null;
    let nodeElements = new Map<string, HTMLElement>();
    let sceneNodeByHash = new Map<string, RevisionGraphWebviewLegacySceneNode>();
    let edgeElements: Element[] = [];
    let graphNodeByHash = new Map<string, RevisionGraphWebviewLegacyNodeLayout>();
    let graphEdgeByKey = new Map<string, RevisionGraphWebviewLegacyEdge>();
    let parentMap = new Map<string, string[]>();
    let childMap = new Map<string, string[]>();
    let headDistanceByHash = new Map<string, number>();
    let primaryAncestorNextByHash: Readonly<Record<string, string>> = {};
    let sceneLayoutKey = 'empty';
    let baseCanvasWidth = 880;
    let baseCanvasHeight = 480;
    let currentZoom = 1;
    const minimapZoomLevels = REVISION_GRAPH_WEBVIEW_MINIMAP_ZOOM_LEVELS;
    const initialWebviewState = readRevisionGraphWebviewPersistentState(vscode);
    let minimapZoom = 1;
    let minimapEnabled = initialWebviewState.showMinimap === true;
    let layoutOffsetX = 0;
    let layoutOffsetY = 0;
    let dragState: RevisionGraphWebviewViewportDragState | null = null;
    let nodeDragState: {
      readonly hash: string;
      readonly element: HTMLElement;
      readonly startX: number;
      readonly startOffset: number;
    } | null = null;
    let suppressNodeClick = false;
    let nodeOffsets: Record<string, number> = {};
    let searchQuery = '';
    let searchResultHashes: string[] = [];
    let activeSearchResultIndex = -1;
    let toolbarBusy = false;
    let remoteTagPublicationState = new Map<string, string>();
    let pendingRemoteTagStateRequests = new Set<string>();
    let activeContextMenuRequest: {
      readonly clientX: number;
      readonly clientY: number;
      readonly target: RevisionGraphWebviewTarget;
    } | null = null;
    let minimapDragState: { active: boolean } | null = null;
    let pendingMinimapSyncFrame = 0;
    let pendingMinimapSyncMode = 'none';
    let sceneEventHandlersBound = false;
    let activeWebviewTraceMessage: RevisionGraphWebviewStateHostMessage | null = null;
    let viewportClientWidth = 0;
    let viewportClientHeight = 0;
    const VIRTUAL_RENDER_OVERSCAN_PX = 900;
    const VIRTUAL_RENDER_BUCKET_SIZE_PX = 1200;
    let pendingVirtualSceneRenderFrame = 0;
    let lastVirtualSceneKey = '';
    let virtualNodeIndex = new Map<number, RevisionGraphWebviewLegacyNodeLayout[]>();
    let virtualEdgeIndex = new Map<number, RevisionGraphWebviewLegacyEdge[]>();
    let reloadCacheMenu: HTMLDivElement | null = null;
    let pushModeMenu: HTMLDivElement | null = null;
    const flowKindLabels: Readonly<Record<string, string>> = {
      main: 'Main',
      release: 'Release',
      sync: 'Sync',
      package: 'Package',
      feature: 'Feature',
      task: 'Task',
      bug: 'Bug',
      hotfix: 'Hotfix',
      unknown: 'Unknown'
    };
    const flowKindBadges: Readonly<Record<string, string>> = {
      main: 'main',
      release: 'rel',
      sync: 'sync',
      package: 'pkg',
      feature: 'feat',
      task: 'task',
      bug: 'bug',
      hotfix: 'hotfix',
      unknown: '?'
    };

    window.addEventListener('message', (event) => {
      if (isRevisionGraphWebviewHostMessage(event.data)) {
        handleHostMessage(event.data);
      }
    });
    vscode.postMessage(createRevisionGraphWebviewReadyMessage());

    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        reloadRevisionGraph();
      });
    }
    if (reloadMenuButton) {
      reloadMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (reloadCacheMenu && !reloadCacheMenu.hidden) {
          closeReloadCacheMenu();
        } else {
          showReloadCacheMenu();
        }
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
        pushCurrentHead('normal');
      });
    }
    if (pushMenuButton) {
      pushMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (pushModeMenu && !pushModeMenu.hidden) {
          closePushModeMenu();
        } else {
          showPushModeMenu();
        }
      });
    }
    if (syncButton) {
      syncButton.addEventListener('click', () => {
        postMessageWithLoading(createRevisionGraphSyncCurrentHeadMessage(), 'Synchronizing current branch...', syncButton);
      });
    }
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        const nextRefScope = scopeSelect.value as NonNullable<RevisionGraphWebviewProjectionOptions['refScope']>;
        const options: RevisionGraphWebviewProjectionOptions = {
          refScope: nextRefScope,
          revisionRange: null,
          descendantFocus: null
        };
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
    if (flowGovernanceEnabledToggle) {
      flowGovernanceEnabledToggle.addEventListener('change', () => {
        updateFlowGovernanceOptions({ enabled: flowGovernanceEnabledToggle.checked });
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
    if (rangeFilterClearButton) {
      rangeFilterClearButton.addEventListener('click', () => {
        postMessageWithLoading(
          createRevisionGraphProjectionOptionsMessage({ revisionRange: null }),
          'Exiting Focus Range...',
          rangeFilterClearButton,
          'subtle'
        );
      });
    }
    if (descendantFilterClearButton) {
      descendantFilterClearButton.addEventListener('click', () => {
        postMessageWithLoading(
          createRevisionGraphProjectionOptionsMessage({ descendantFocus: null }),
          'Exiting Focus Descendants...',
          descendantFilterClearButton,
          'subtle'
        );
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
        const target = event.target;
        const isMinimapZoomButton = target instanceof Element && !!target.closest('.minimap-zoom-button');
        if (!minimapEnabled || isMinimapZoomButton) {
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
      dragState = createRevisionGraphWebviewViewportDragState(
        event.clientX,
        event.clientY,
        viewport.scrollLeft,
        viewport.scrollTop
      );
      viewport.classList.add('dragging');
      closeContextMenu();
      event.preventDefault();
    });
    viewport.addEventListener('scroll', () => {
      scheduleVirtualSceneRender('scroll');
      syncMinimap('viewport');
    });
    viewport.addEventListener('scroll', closeContextMenu);
    viewport.addEventListener('scroll', hideReferenceTooltip);
    window.addEventListener('resize', () => {
      readViewportLayoutSize();
      syncCanvasSize();
      updateScenePlacement();
      scheduleVirtualSceneRender('resize', true);
      syncMinimap();
      closeContextMenu();
      hideReferenceTooltip();
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
        nodeOffsets[nodeDragState.hash] = calculateRevisionGraphWebviewNodeDragOffset(
          nodeDragState.startOffset,
          nodeDragState.startX,
          event.clientX,
          currentZoom,
          defaultLeft,
          getNodeWidth(nodeDragState.hash),
          getCanvasWidth()
        );
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
      const dragUpdate = calculateRevisionGraphWebviewViewportDrag(
        dragState,
        event.clientX,
        event.clientY
      );
      if (dragUpdate.shouldSuppressNodeClick) {
        suppressNodeClick = true;
      }
      dragState = { ...dragState, moved: dragUpdate.moved };
      viewport.scrollLeft = dragUpdate.scrollLeft;
      viewport.scrollTop = dragUpdate.scrollTop;
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
    bindReferenceTooltipEvents();
    window.addEventListener('click', (event) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!contextMenu.contains(target)) {
        closeContextMenu();
      }
      if (
        viewOptionsMenu &&
        !viewOptionsMenu.hidden &&
        !viewOptionsMenu.contains(target) &&
        !(viewOptionsButton && viewOptionsButton.contains(target))
      ) {
        closeViewOptionsMenu();
      }
      if (
        reloadCacheMenu &&
        !reloadCacheMenu.hidden &&
        !reloadCacheMenu.contains(target) &&
        !(reloadButton && reloadButton.contains(target)) &&
        !(reloadMenuButton && reloadMenuButton.contains(target))
      ) {
        closeReloadCacheMenu();
      }
      if (
        pushModeMenu &&
        !pushModeMenu.hidden &&
        !pushModeMenu.contains(target) &&
        !(pushButton && pushButton.contains(target)) &&
        !(pushMenuButton && pushMenuButton.contains(target))
      ) {
        closePushModeMenu();
      }
    });
    window.addEventListener('blur', closeReloadCacheMenu);
    window.addEventListener('blur', closePushModeMenu);
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
        closePushModeMenu();
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

    function showReloadCacheMenu() {
      if (!reloadMenuButton || reloadMenuButton.disabled) {
        return;
      }
      closePushModeMenu();
      if (!reloadCacheMenu) {
        reloadCacheMenu = document.createElement('div');
        reloadCacheMenu.id = 'reloadCacheMenu';
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
      reloadMenuButton.setAttribute('aria-expanded', 'true');
      const buttonRect = reloadMenuButton.getBoundingClientRect();
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
      if (reloadCacheMenu) {
        reloadCacheMenu.hidden = true;
      }
      if (reloadMenuButton) {
        reloadMenuButton.setAttribute('aria-expanded', 'false');
      }
    }

    function pushCurrentHead(mode: 'normal' | 'force-with-lease' | 'force') {
      closePushModeMenu();
      vscode.postMessage(createRevisionGraphPushCurrentHeadMessage(mode));
    }

    function showPushModeMenu() {
      if (!pushMenuButton || pushMenuButton.disabled) {
        return;
      }
      closeReloadCacheMenu();
      if (!pushModeMenu) {
        const menu = document.createElement('div');
        pushModeMenu = menu;
        menu.id = 'pushModeMenu';
        menu.className = 'reload-cache-menu push-mode-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        const pushModes: ReadonlyArray<{ readonly label: string; readonly mode: 'force-with-lease' | 'force' }> = [
          { label: 'Push with Force With Lease', mode: 'force-with-lease' },
          { label: 'Push with Force', mode: 'force' }
        ];
        pushModes.forEach((pushMode) => {
          const modeButton = document.createElement('button');
          modeButton.type = 'button';
          modeButton.className = 'reload-cache-menu-button';
          modeButton.textContent = pushMode.label;
          modeButton.setAttribute('role', 'menuitem');
          modeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            pushCurrentHead(pushMode.mode);
          });
          menu.appendChild(modeButton);
        });
        document.body.appendChild(menu);
      }

      pushModeMenu.hidden = false;
      pushMenuButton.setAttribute('aria-expanded', 'true');
      const buttonRect = pushMenuButton.getBoundingClientRect();
      const menuRect = pushModeMenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const leftLimit = Math.max(8, viewportWidth - menuRect.width - 8);
      const left = Math.min(Math.max(8, buttonRect.left), leftLimit);
      pushModeMenu.style.left = left + 'px';
      pushModeMenu.style.top = Math.max(8, buttonRect.bottom + 6) + 'px';
      const firstButton = pushModeMenu.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    }

    function closePushModeMenu() {
      if (pushModeMenu) {
        pushModeMenu.hidden = true;
      }
      if (pushMenuButton) {
        pushMenuButton.setAttribute('aria-expanded', 'false');
      }
    }

    function endMinimapDrag() {
      if (!minimapDragState) {
        return false;
      }

      minimapDragState = null;
      return true;
    }

    function endNodeDrag(shouldPersist: boolean) {
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

    function handleHostMessage(message: RevisionGraphWebviewHostMessage) {
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
        case 'set-commit-short-stat':
          setCommitShortStat(message.commitHash, message.shortStat);
          return;
        case 'show-flow-pr-context':
          showFlowPullRequestContextForm(message);
          return;
        case 'show-flow-branch-form': showRevisionGraphWebviewFlowBranchForm(message, getSelectableTargets(), showFlowBranchForm); return;
        case 'set-loading':
          showLoading(message.label, null, message.mode || 'blocking');
          return;
        case 'set-error':
          showError(message.message);
          return;
      }
    }

    function applyTracedHostMessage(
      message: RevisionGraphWebviewStateHostMessage,
      phase: string,
      apply: () => void
    ) {
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

    function traceWebviewPhase<Result>(phase: string, work: () => Result, detail = ''): Result {
      return traceWebviewPhaseForMessage(activeWebviewTraceMessage, phase, work, detail);
    }

    function traceWebviewPhaseForMessage<Result>(
      traceMessage: RevisionGraphWebviewStateHostMessage | null,
      phase: string,
      work: () => Result,
      detail = ''
    ): Result {
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

    function postWebviewLoadTrace(
      message: RevisionGraphWebviewStateHostMessage,
      phase: string,
      startedAt: number,
      options: { readonly includeDelivery?: boolean; readonly detail?: string } = {}
    ) {
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

    function hasWebviewTraceContext(
      message: RevisionGraphWebviewStateHostMessage | null
    ): message is RevisionGraphWebviewTracedStateHostMessage {
      if (!message || !('trace' in message)) {
        return false;
      }
      const trace = message.trace;
      return !!trace
        && typeof trace === 'object'
        && typeof (trace as Record<string, unknown>).requestId === 'number'
        && typeof (trace as Record<string, unknown>).sentAtMs === 'number';
    }

    function buildWebviewLoadTraceDetail(
      message: RevisionGraphWebviewTracedStateHostMessage,
      deliveryMs: number | null,
      extraDetail: string
    ) {
      const details = [
        'message=' + message.type
      ];
      if (deliveryMs !== null) {
        details.push('deliveryMs=' + Math.round(deliveryMs));
      }
      const payload = message.state;
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

    function applyState(
      nextState: RevisionGraphWebviewHostState,
      isInit: boolean,
      options: {
        readonly preserveSelection?: boolean;
        readonly preserveViewport?: boolean;
        readonly invalidateRemoteTagState?: boolean;
      } = {}
    ) {
      if (!nextState) {
        return;
      }

      const previousRepositoryPath = currentState && currentState.repositoryPath ? currentState.repositoryPath : null;
      const selectionSnapshot = options.preserveSelection ? captureSelectionSnapshot() : [];
      const scenePlacementSnapshot = options.preserveViewport ? captureScenePlacementSnapshot() : null;
      const viewportSnapshot = options.preserveViewport ? captureViewportSnapshot() : null;
      const previousSceneLayoutKey = sceneLayoutKey;
      if (previousRepositoryPath && previousRepositoryPath !== (nextState.repositoryPath || null)) {
        clearReferenceTooltipCommitStats();
        hideReferenceTooltip();
      }
      traceWebviewPhase('webview.apply.state-model', () => {
        const stateModel = createRevisionGraphWebviewRuntimeStateModel(nextState, currentProjectionOptions);
        currentState = stateModel.state;
        currentHeadName = stateModel.currentHeadName;
        currentHeadUpstreamName = stateModel.currentHeadUpstreamName;
        publishedLocalBranchNames = new Set(stateModel.publishedLocalBranchNames);
        isWorkspaceDirty = stateModel.isWorkspaceDirty;
        hasMergeConflicts = stateModel.hasMergeConflicts;
        hasConflictedMerge = stateModel.hasConflictedMerge;
        currentProjectionOptions = stateModel.projectionOptions;
        currentFlowGovernance = stateModel.flowGovernance;
        flowReferenceByName = buildFlowReferenceMap(currentFlowGovernance);
        mergeBlockedTargets = new Set(stateModel.mergeBlockedTargets);
        references = [...stateModel.references];
        syncRemoteTagStateCache(stateModel.state, previousRepositoryPath, !!options.invalidateRemoteTagState);
        graphNodes = stateModel.graphNodes as RevisionGraphWebviewLegacyNodeLayout[];
        graphEdges = stateModel.graphEdges as RevisionGraphWebviewLegacyEdge[];
        graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
        primaryAncestorNextByHash = stateModel.primaryAncestorNextByHash;
        sceneLayoutKey = stateModel.sceneLayoutKey;
        baseCanvasWidth = stateModel.baseCanvasWidth;
        baseCanvasHeight = stateModel.baseCanvasHeight;
      });

      if (previousSceneLayoutKey !== sceneLayoutKey) {
        nodeOffsets = restoreRevisionGraphNodeOffsets(vscode, sceneLayoutKey);
      }

      if (options.preserveSelection) {
        restoreSelectionSnapshot(selectionSnapshot);
      } else {
        const availableReferenceIds = new Set(getVisibleReferences().map((ref) => ref.id));
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

    function syncRemoteTagStateCache(
      nextState: RevisionGraphWebviewHostState,
      previousRepositoryPath: string | null,
      invalidateRemoteTagState: boolean
    ) {
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

    function setRemoteTagState(tagName: string, state: string) {
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

    function restoreSelectionSnapshot(snapshot: RevisionGraphWebviewSelectionSnapshot) {
      const nextSelected: string[] = [];
      const usedReferenceIds = new Set<string>();
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

    function findSelectionMatch(
      target: RevisionGraphWebviewSelectionSnapshotEntry,
      usedReferenceIds: ReadonlySet<string>
    ): RevisionGraphWebviewSelectionTarget | null {
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

      const matchPredicates: ReadonlyArray<(ref: RevisionGraphWebviewSelectionTarget) => boolean> = [
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
      const visibleWidth = Math.max(0, viewportSize.width - VIEWPORT_PADDING_LEFT - VIEWPORT_PADDING_RIGHT);
      const visibleHeight = Math.max(0, viewportSize.height - VIEWPORT_PADDING_TOP - VIEWPORT_PADDING_BOTTOM);
      return captureRevisionGraphWebviewViewportSceneCenter({
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        zoom: currentZoom,
        visibleWidth,
        visibleHeight,
        paddingLeft: VIEWPORT_PADDING_LEFT,
        paddingTop: VIEWPORT_PADDING_TOP,
        layoutOffsetX,
        layoutOffsetY
      });
    }

    function captureScenePlacementSnapshot() {
      return {
        layoutOffsetX,
        layoutOffsetY
      };
    }

    function restoreScenePlacementSnapshot(snapshot: RevisionGraphWebviewScenePlacementSnapshot | null) {
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

    function restoreViewportSnapshot(snapshot: RevisionGraphWebviewViewportSceneCenter | null) {
      if (!snapshot) {
        return;
      }

      const viewportSize = getViewportLayoutSize();
      const visibleWidth = Math.max(0, viewportSize.width - VIEWPORT_PADDING_LEFT - VIEWPORT_PADDING_RIGHT);
      const visibleHeight = Math.max(0, viewportSize.height - VIEWPORT_PADDING_TOP - VIEWPORT_PADDING_BOTTOM);
      const nextPosition = calculateRevisionGraphWebviewViewportScrollPosition({
        centerX: snapshot.sceneCenterX + layoutOffsetX,
        centerY: snapshot.sceneCenterY + layoutOffsetY,
        zoom: currentZoom,
        visibleWidth,
        visibleHeight,
        paddingLeft: VIEWPORT_PADDING_LEFT,
        paddingTop: VIEWPORT_PADDING_TOP
      });
      viewport.scrollLeft = nextPosition.scrollLeft;
      viewport.scrollTop = nextPosition.scrollTop;
      syncMinimap('viewport');
    }

    function hasStoredNodeOffsets() {
      return Object.values(nodeOffsets).some((offset) => Math.abs(Number(offset) || 0) > 0.5);
    }

    function updateChrome(state: RevisionGraphWebviewHostState) {
      if (scopeSelect) {
        scopeSelect.value = state.projectionOptions.refScope || 'all';
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
      syncFlowGovernanceControls(state.flowGovernance || null);
      syncRangeFilter(state.projectionOptions.revisionRange);
      syncDescendantFilter(state.projectionOptions.descendantFocus);
      syncViewOptionsButton();
    }

    function buildFlowReferenceMap(
      flowGovernance: RevisionGraphWebviewLegacyFlowGovernance | null
    ): Map<string, RevisionGraphWebviewLegacyFlowReference> {
      const nextMap = new Map<string, RevisionGraphWebviewLegacyFlowReference>();
      if (!flowGovernance || !Array.isArray(flowGovernance.references)) {
        return nextMap;
      }
      for (const branch of flowGovernance.references) {
        if (branch && typeof branch.refName === 'string') {
          nextMap.set(branch.refName, branch);
        }
      }
      return nextMap;
    }

    function hasFlowGovernanceState(
      flowGovernance: RevisionGraphWebviewLegacyFlowGovernance | null = currentFlowGovernance
    ): flowGovernance is RevisionGraphWebviewLegacyFlowGovernance & { readonly branchKinds: readonly unknown[] } {
      return !!flowGovernance && Array.isArray(flowGovernance.branchKinds);
    }

    function isFlowGovernanceActive(
      flowGovernance: RevisionGraphWebviewLegacyFlowGovernance | null = currentFlowGovernance
    ) {
      return hasFlowGovernanceState(flowGovernance) && flowGovernance.enabled === true;
    }

    function syncFlowGovernanceControls(
      flowGovernance: RevisionGraphWebviewLegacyFlowGovernance | null = currentFlowGovernance
    ) {
      const isActive = isFlowGovernanceActive(flowGovernance);
      const canShowControls = hasFlowGovernanceState(flowGovernance) && flowGovernance.configSource !== 'invalid';
      if (flowGovernanceOptions) {
        flowGovernanceOptions.hidden = !canShowControls;
      }
      if (!canShowControls) {
        return;
      }

      if (flowGovernanceEnabledToggle) {
        flowGovernanceEnabledToggle.checked = flowGovernance.enabled === true;
      }
    }

    function getFlowBranchInfo(refName: string): RevisionGraphWebviewLegacyFlowReference | null {
      return flowReferenceByName.get(refName) || null;
    }

    function isReferenceVisible(reference: { readonly id: string; readonly hash: string; readonly name: string; readonly kind: string } | null): boolean {
      if (!reference) {
        return false;
      }
      if (!isFlowGovernanceActive()) {
        return true;
      }
      return true;
    }

    function getVisibleReferences() {
      return references.filter(isReferenceVisible);
    }

    function syncRangeFilter(revisionRange: RevisionGraphWebviewProjectionOptions['revisionRange']) {
      if (!rangeFilter || !rangeFilterLabel) {
        return;
      }

      if (!revisionRange) {
        rangeFilter.hidden = true;
        rangeFilterLabel.textContent = '';
        rangeFilterLabel.title = '';
        rangeFilter.setAttribute('aria-label', 'Focus Range inactive');
        return;
      }

      const rangeLabel = revisionRange.baseLabel + ' → ' + revisionRange.compareLabel;
      rangeFilter.hidden = false;
      rangeFilterLabel.textContent = rangeLabel;
      rangeFilterLabel.title = 'Focused range: ' + rangeLabel;
      rangeFilter.setAttribute(
        'aria-label',
        'Focus Range active from ' + revisionRange.baseLabel + ' to ' + revisionRange.compareLabel
      );
    }

    function syncDescendantFilter(descendantFocus: RevisionGraphWebviewProjectionOptions['descendantFocus']) {
      if (!descendantFilter || !descendantFilterLabel) {
        return;
      }

      if (!descendantFocus) {
        descendantFilter.hidden = true;
        descendantFilterLabel.textContent = '';
        descendantFilterLabel.title = '';
        descendantFilter.setAttribute('aria-label', 'Focus Descendants inactive');
        return;
      }

      descendantFilter.hidden = false;
      descendantFilterLabel.textContent = descendantFocus.anchorLabel;
      descendantFilterLabel.title = 'Focused descendants from: ' + descendantFocus.anchorLabel;
      descendantFilter.setAttribute(
        'aria-label',
        'Focus Descendants active from ' + descendantFocus.anchorLabel
      );
    }

    function renderScene(
      state: RevisionGraphWebviewHostState,
      options: { readonly precenterViewport?: boolean } = {}
    ) {
      runRevisionGraphWebviewSceneRenderLifecycle({
        isReady: state.viewMode === 'ready',
        shouldPrecenterViewport: !!options.precenterViewport,
        prepareGeometry: () => traceWebviewPhase('webview.render-scene.geometry', () => {
          applyRevisionGraphWebviewSceneGeometry(
            { canvas, sceneLayer, graphSvg },
            baseCanvasWidth,
            baseCanvasHeight
          );
        }),
        clearScene: () => traceWebviewPhase('webview.render-scene.clear', () => {
          clearRevisionGraphWebviewVirtualSceneDom({ nodeLayer, edgeLayer });
          sceneNodeByHash = new Map();
          resetVirtualSceneIndexes();
        }),
        refreshGraphCaches: () => traceWebviewPhase('webview.render-scene.refresh-caches', () => refreshGraphCaches()),
        syncCanvasAndPlacement: () => traceWebviewPhase('webview.render-scene.canvas-layout', () => {
          syncCanvasSize();
          updateScenePlacement();
        }),
        prepareIndexes: () => {
          const sceneNodes = ((state.scene && state.scene.nodes) || []) as RevisionGraphWebviewLegacySceneNode[];
          traceWebviewPhase('webview.render-scene.indexes', () => {
            sceneNodeByHash = new Map(sceneNodes.map((node) => [node.hash, node]));
            rebuildVirtualSceneIndexes();
          }, 'nodes=' + graphNodes.length + '; edges=' + graphEdges.length);
        },
        precenterViewport: () => traceWebviewPhase('webview.render-scene.viewport-precenter', () => {
          syncCanvasSize();
          updateScenePlacement({ source: 'layout' });
          centerGraphInViewport({ source: 'layout', syncMinimap: false });
        }, 'action=recenter'),
        renderVirtualScene: () => {
          const sceneNodes = ((state.scene && state.scene.nodes) || []) as RevisionGraphWebviewLegacySceneNode[];
          traceWebviewPhase('webview.render-scene.virtual-html', () => {
            renderVirtualScene({ force: true });
          }, 'nodes=' + sceneNodes.length + '; edges=' + graphEdges.length);
        },
        bindSceneEventHandlers: () => traceWebviewPhase('webview.render-scene.bind-handlers', () => bindSceneEventHandlers())
      });
    }

    function scheduleVirtualSceneRender(reason = 'viewport', force = false) {
      scheduleRevisionGraphWebviewVirtualSceneRender({
        force,
        pendingFrame: pendingVirtualSceneRenderFrame,
        setSceneKey: (sceneKey) => {
          lastVirtualSceneKey = sceneKey;
        },
        setPendingFrame: (frame) => {
          pendingVirtualSceneRenderFrame = frame;
        },
        requestFrame: (callback) => requestAnimationFrame(callback),
        render: () => {
          traceWebviewPhase('webview.render-scene.virtual-frame', () => {
            renderVirtualScene({ reason, force });
          }, 'reason=' + reason);
        }
      });
    }

    function renderVirtualScene(options: { readonly force?: boolean; readonly reason?: string } = {}) {
      if (!currentState || currentState.viewMode !== 'ready') {
        clearRevisionGraphWebviewVirtualSceneDom({ nodeLayer, edgeLayer });
        resetRevisionGraphWebviewVirtualSceneKey((sceneKey) => {
          lastVirtualSceneKey = sceneKey;
        });
        refreshGraphCaches();
        return;
      }

      const viewportBounds = getVirtualViewportBounds();
      const { visibleLayouts, visibleHashes, visibleEdges } = selectRevisionGraphWebviewVirtualScene({
        nodeCandidates: collectVirtualNodeCandidates(viewportBounds),
        containsSceneNode: (hash) => sceneNodeByHash.has(hash),
        isLayoutVisible: (layout) => isLayoutVisible(layout, viewportBounds),
        edgeCandidates: collectVirtualEdgeCandidates(viewportBounds),
        isEdgeVisible: (edge, hashes) => isEdgeVisible(edge, viewportBounds, hashes)
      });
      const nextVirtualSceneKey = buildVirtualSceneKey(visibleHashes, visibleEdges);
      const decision = createRevisionGraphWebviewVirtualSceneRenderDecision(
        !!options.force,
        lastVirtualSceneKey,
        nextVirtualSceneKey
      );

      if (!decision.shouldCommit) {
        return;
      }

      const layoutByHash = graphNodeByHash;
      const markup = createRevisionGraphWebviewVirtualSceneMarkup({
        visibleLayouts,
        visibleEdges,
        renderNodeMarkup: (layout) => renderNodeMarkup(sceneNodeByHash.get(layout.hash), layout),
        renderEdgeMarkup: (edge) => renderEdgeMarkup(edge, layoutByHash)
      });
      commitRevisionGraphWebviewVirtualSceneDom({ nodeLayer, edgeLayer }, markup);
      completeRevisionGraphWebviewVirtualSceneCommit({
        sceneKey: decision.nextSceneKey,
        setSceneKey: (sceneKey) => {
          lastVirtualSceneKey = sceneKey;
        },
        refreshGraphCaches,
        applyNodeLayout: () => applyNodeLayout(false, { syncMinimap: false, updateScenePlacement: false }),
        syncSelection,
        syncSearchHighlights
      });
    }

    function getVirtualViewportBounds() {
      const visibleSize = getVisibleViewportSize();
      return createRevisionGraphWebviewVirtualViewportBounds({
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        zoom: currentZoom,
        visibleWidth: visibleSize.width,
        visibleHeight: visibleSize.height,
        paddingLeft: VIEWPORT_PADDING_LEFT,
        paddingTop: VIEWPORT_PADDING_TOP,
        layoutOffsetX,
        layoutOffsetY,
        overscanPx: VIRTUAL_RENDER_OVERSCAN_PX
      });
    }

    function isLayoutVisible(
      layout: RevisionGraphWebviewLegacyNodeLayout,
      bounds: RevisionGraphWebviewVirtualViewportBounds
    ): boolean {
      return isRevisionGraphWebviewVirtualLayoutVisible(
        layout,
        Number(nodeOffsets[layout.hash] || 0),
        bounds
      );
    }

    function isEdgeVisible(
      edge: RevisionGraphWebviewLegacyEdge,
      bounds: RevisionGraphWebviewVirtualViewportBounds,
      visibleHashes: ReadonlySet<string>
    ): boolean {
      return isRevisionGraphWebviewVirtualEdgeVisible(
        edge,
        bounds,
        visibleHashes,
        graphNodeByHash,
        nodeOffsets
      );
    }

    function rebuildVirtualSceneIndexes() {
      virtualNodeIndex = buildVirtualNodeIndex(graphNodes);
      virtualEdgeIndex = buildVirtualEdgeIndex(graphEdges);
    }

    function resetVirtualSceneIndexes() {
      virtualNodeIndex = new Map();
      virtualEdgeIndex = new Map();
    }

    function buildVirtualNodeIndex(layouts: readonly RevisionGraphWebviewLegacyNodeLayout[]) {
      return buildRevisionGraphWebviewVirtualIndex(
        layouts,
        VIRTUAL_RENDER_BUCKET_SIZE_PX,
        (layout) => ({
          top: layout.defaultTop,
          bottom: layout.defaultTop + layout.height
        })
      );
    }

    function buildVirtualEdgeIndex(edges: readonly RevisionGraphWebviewLegacyEdge[]) {
      return buildRevisionGraphWebviewVirtualIndex(
        edges,
        VIRTUAL_RENDER_BUCKET_SIZE_PX,
        getEdgeVerticalBounds
      );
    }

    function getEdgeVerticalBounds(edge: RevisionGraphWebviewLegacyEdge) {
      return getRevisionGraphWebviewVirtualEdgeVerticalBounds(edge, graphNodeByHash);
    }

    function collectVirtualNodeCandidates(bounds: RevisionGraphWebviewVirtualViewportBounds) {
      return collectRevisionGraphWebviewVirtualIndexCandidates(
        virtualNodeIndex,
        bounds,
        VIRTUAL_RENDER_BUCKET_SIZE_PX,
        (layout) => layout.hash
      );
    }

    function collectVirtualEdgeCandidates(bounds: RevisionGraphWebviewVirtualViewportBounds) {
      return collectRevisionGraphWebviewVirtualIndexCandidates(
        virtualEdgeIndex,
        bounds,
        VIRTUAL_RENDER_BUCKET_SIZE_PX,
        getVirtualEdgeKey
      );
    }

    function getVirtualEdgeKey(edge: RevisionGraphWebviewLegacyEdge): string {
      return createRevisionGraphWebviewVirtualEdgeKey(edge);
    }

    function buildVirtualSceneKey(
      visibleHashes: ReadonlySet<string>,
      visibleEdges: readonly RevisionGraphWebviewLegacyEdge[]
    ): string {
      return createRevisionGraphWebviewVirtualSceneKey(visibleHashes, visibleEdges);
    }

    function refreshGraphCaches() {
      nodeElements = new Map(
        Array.from(document.querySelectorAll<HTMLElement>('[data-node-hash]'))
          .map((element) => [element.getAttribute('data-node-hash'), element] as const)
          .filter((entry): entry is readonly [string, HTMLElement] => entry[0] !== null)
      );
      edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
      headNodeHash = getCurrentHeadNodeHash();
      graphEdgeByKey = new Map(graphEdges.map((edge) => [getVirtualEdgeKey(edge), edge]));
      parentMap = buildRevisionGraphWebviewDirectionalMap(graphNodes, graphEdges, 'from', 'to');
      childMap = buildRevisionGraphWebviewDirectionalMap(graphNodes, graphEdges, 'to', 'from');
      headDistanceByHash = headNodeHash
        ? buildRevisionGraphWebviewDistanceMap(headNodeHash, parentMap)
        : new Map();
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

      nodeLayer.addEventListener('mouseover', (event) => {
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        if (refElement && (!(event.relatedTarget instanceof Node) || !refElement.contains(event.relatedTarget))) {
          showReferenceTooltip(refElement);
        }
      });
      nodeLayer.addEventListener('mouseout', (event) => {
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        if (refElement && (!(event.relatedTarget instanceof Node) || !refElement.contains(event.relatedTarget))) {
          scheduleHideReferenceTooltip();
        }
      });
      nodeLayer.addEventListener('focusin', (event) => {
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        if (refElement) {
          showReferenceTooltip(refElement);
        }
      });
      nodeLayer.addEventListener('focusout', handleReferenceTooltipReferenceFocusOut);
      nodeLayer.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        const refElement = findEventTargetElement(event, '[data-ref-id]');
        const refId = refElement ? refElement.getAttribute('data-ref-id') : '';
        if (!refId) {
          return;
        }
        event.preventDefault();
        toggleSelection(refId, event.ctrlKey || event.metaKey);
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
        const node = grip.closest<HTMLElement>('[data-node-hash]');
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

    function findEventTargetElement(event: Event, selector: string): HTMLElement | null {
      const target = event.target;
      if (!(target instanceof Element)) {
        return null;
      }
      const element = target.closest<HTMLElement>(selector);
      return element && nodeLayer.contains(element) ? element : null;
    }

    function renderNodeMarkup(
      node: RevisionGraphWebviewLegacySceneNode | undefined,
      layout: RevisionGraphWebviewLegacyNodeLayout | undefined,
      renderKey?: string
    ): string {
      if (!node || !layout) {
        return '';
      }
      const nodeRenderKey = renderKey || getNodeRenderKey(node, layout);
      const visibleRefs = getRevisionGraphWebviewVisibleNodeReferences(node, isReferenceVisible);
      return renderRevisionGraphWebviewNodeMarkup({
        node,
        layout,
        nodeRenderKey,
        visibleReferences: visibleRefs,
        getFlowKind: (referenceName) => {
          const flowBranch = isFlowGovernanceActive() ? getFlowBranchInfo(referenceName) : null;
          return flowBranch?.kind ?? null;
        },
        flowKindBadges
      });
    }

    function getNodeRenderKey(
      node: RevisionGraphWebviewLegacySceneNode | undefined,
      layout: RevisionGraphWebviewLegacyNodeLayout | undefined
    ): string {
      if (!node || !layout) {
        return '';
      }

      const visibleRefs = getRevisionGraphWebviewVisibleNodeReferences(node, isReferenceVisible);
      return createRevisionGraphWebviewNodeRenderKey(
        node,
        layout,
        visibleRefs,
        currentFlowGovernance ? { enabled: currentFlowGovernance.enabled } : null
      );
    }

    function renderEdgeMarkup(
      edge: RevisionGraphWebviewLegacyEdge,
      layoutByHash: ReadonlyMap<string, RevisionGraphWebviewLegacyNodeLayout>
    ): string {
      return renderRevisionGraphWebviewEdgeMarkup(edge, layoutByHash, EDGE_VERTICAL_INSET);
    }

    function createReferenceId(hash: string, kind: string, name: string): string {
      return hash + '::' + kind + '::' + name;
    }

    function createCommitSelectionId(hash: string): string {
      return 'commit::' + hash;
    }

    function formatShortCommitHash(hash: string): string {
      return String(hash || '').slice(0, 8);
    }

    function getSelectionTarget(selectionId: string): RevisionGraphWebviewSelectionTarget | null {
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
          kind: 'commit' as const
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

    function getSelectableTargets(): RevisionGraphWebviewSelectionTarget[] {
      const refTargets: RevisionGraphWebviewSelectionTarget[] = getVisibleReferences().map((reference) => ({
        id: reference.id,
        hash: reference.hash,
        name: reference.name,
        revision: reference.name,
        label: reference.name,
        kind: reference.kind
      }));
      const commitTargets: RevisionGraphWebviewSelectionTarget[] = Array.from(sceneNodeByHash.values())
        .filter((node) => node.refs.length === 0)
        .map((node) => ({
          id: createCommitSelectionId(node.hash),
          hash: node.hash,
          name: node.hash,
          revision: node.hash,
          label: formatShortCommitHash(node.hash),
          kind: 'commit' as const
        }));

      return [...refTargets, ...commitTargets];
    }

    function getStructuralNodeTarget(hash: string): RevisionGraphWebviewSelectionTarget | null {
      return getSelectionTarget(createCommitSelectionId(hash));
    }

    function toggleSelection(selectionId: string, additive: boolean) {
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

    function isNodeGripEvent(event: Event): boolean {
      const target = event.target;
      return target instanceof Element && !!target.closest('[data-node-grip]');
    }

    function showStatus(
      message: string,
      isError: boolean,
      action: RevisionGraphWebviewStatusAction | null = null
    ) {
      showRevisionGraphWebviewStatus(
        {
          card: statusCard,
          message: statusMessage,
          actionButton: statusActionButton
        },
        message,
        !!isError,
        action
      );
    }

    function hideStatus() {
      hideRevisionGraphWebviewStatus({
        card: statusCard,
        message: statusMessage,
        actionButton: statusActionButton
      });
    }

    function showError(message: string) {
      hideLoading();
      edgeLayer.innerHTML = '';
      nodeLayer.innerHTML = '';
      lastVirtualSceneKey = '';
      refreshGraphCaches();
      showStatus(message, true);
    }

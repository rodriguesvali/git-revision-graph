export function renderRevisionGraphScriptInteractions(): string {
  return `
    function setZoom(zoom, options = {}) {
      const shouldPreserveViewport = options.preserveViewport !== false;
      const scenePlacementSnapshot = shouldPreserveViewport ? captureScenePlacementSnapshot() : null;
      const viewportSnapshot = shouldPreserveViewport ? captureViewportSnapshot() : null;
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      syncCanvasSize();
      applyNodeLayout(false);
      if (shouldPreserveViewport) {
        restoreScenePlacementSnapshot(scenePlacementSnapshot);
        restoreViewportSnapshot(viewportSnapshot);
      }
      syncToolbarActions();
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

    function resetZoom() {
      setZoom(1);
    }

    function setMinimapZoom(zoom) {
      minimapZoom = zoom;
      syncMinimap();
      syncToolbarActions();
    }

    function zoomInMinimap() {
      const nextZoom = minimapZoomLevels.find((value) => value > minimapZoom);
      if (nextZoom) {
        setMinimapZoom(nextZoom);
      }
    }

    function resetMinimapZoom() {
      setMinimapZoom(1);
    }

    function zoomOutMinimap() {
      const previousLevels = minimapZoomLevels.filter((value) => value < minimapZoom);
      const nextZoom = previousLevels.length > 0 ? previousLevels[previousLevels.length - 1] : undefined;
      if (nextZoom) {
        setMinimapZoom(nextZoom);
      }
    }

    function syncSelection() {
      const baseTarget = selected[0] ? getSelectionTarget(selected[0]) : null;
      const compareTarget = selected[1] ? getSelectionTarget(selected[1]) : null;
      for (const element of document.querySelectorAll('[data-ref-id]')) {
        const refId = element.getAttribute('data-ref-id');
        element.classList.toggle('base', refId === selected[0]);
        element.classList.toggle('compare', refId === selected[1]);
        element.classList.toggle('has-compare', selected.length === 2 && refId === selected[0]);
      }
      for (const [hash, element] of nodeElements.entries()) {
        element.classList.toggle('base-target', !!baseTarget && baseTarget.hash === hash);
        element.classList.toggle('has-compare', selected.length === 2 && !!baseTarget && baseTarget.hash === hash);
        element.classList.toggle('compare-target', !!compareTarget && compareTarget.hash === hash);
      }
      syncRelationshipHighlights();
      syncSearchHighlights();
      syncMinimap();
    }

    function setSearchQuery(nextQuery) {
      searchQuery = typeof nextQuery === 'string' ? nextQuery : '';
      syncSearchResults({ preserveActiveHash: false, focusActive: true });
    }

    function clearSearchQuery(keepFocus = false) {
      searchQuery = '';
      syncSearchResults({ preserveActiveHash: false, focusActive: false });
      if (keepFocus && searchInput) {
        focusSearchInput(false);
      }
    }

    function syncSearchResults(options = {}) {
      const normalizedQuery = getNormalizedSearchQuery();
      const previousActiveHash = options.preserveActiveHash ? getActiveSearchResultHash() : null;
      if (!currentState || currentState.viewMode !== 'ready' || normalizedQuery.length === 0) {
        searchResultHashes = [];
        activeSearchResultIndex = -1;
        syncSearchUi();
        syncSearchHighlights();
        return;
      }

      searchResultHashes = currentState.scene.nodes
        .slice()
        .sort((left, right) => left.row - right.row)
        .filter((node) => nodeMatchesSearchQuery(node, normalizedQuery))
        .map((node) => node.hash);

      if (searchResultHashes.length === 0) {
        activeSearchResultIndex = -1;
      } else if (previousActiveHash) {
        const preservedIndex = searchResultHashes.indexOf(previousActiveHash);
        activeSearchResultIndex = preservedIndex >= 0 ? preservedIndex : 0;
      } else {
        activeSearchResultIndex = 0;
      }

      syncSearchUi();
      syncSearchHighlights();
      if (options.focusActive && activeSearchResultIndex >= 0) {
        requestAnimationFrame(() => {
          focusActiveSearchResult();
        });
      }
    }

    function syncSearchUi() {
      const normalizedQuery = getNormalizedSearchQuery();
      if (searchInput && searchInput.value !== searchQuery) {
        searchInput.value = searchQuery;
      }
      if (searchResultBadge) {
        searchResultBadge.textContent =
          searchResultHashes.length > 0 && activeSearchResultIndex >= 0
            ? (activeSearchResultIndex + 1) + '/' + searchResultHashes.length
            : '0 results';
      }
      if (searchPrevButton) {
        searchPrevButton.disabled = toolbarBusy || normalizedQuery.length === 0 || searchResultHashes.length < 2;
      }
      if (searchNextButton) {
        searchNextButton.disabled = toolbarBusy || normalizedQuery.length === 0 || searchResultHashes.length < 2;
      }
      if (searchClearButton) {
        searchClearButton.disabled = toolbarBusy || normalizedQuery.length === 0;
      }
      if (searchInput) {
        searchInput.disabled = toolbarBusy;
      }
    }

    function syncSearchHighlights() {
      const matchHashes = new Set(searchResultHashes);
      const activeHash = getActiveSearchResultHash();
      for (const [hash, element] of nodeElements.entries()) {
        element.classList.toggle('search-match', matchHashes.has(hash));
        element.classList.toggle('search-active', hash === activeHash);
      }
    }

    function focusSearchInput(selectText = false) {
      if (!searchInput) {
        return;
      }
      searchInput.focus();
      if (selectText && typeof searchInput.select === 'function') {
        searchInput.select();
      }
    }

    function focusNextSearchResult() {
      if (searchResultHashes.length === 0) {
        return;
      }
      setActiveSearchResultIndex(activeSearchResultIndex + 1, true);
    }

    function focusPreviousSearchResult() {
      if (searchResultHashes.length === 0) {
        return;
      }
      setActiveSearchResultIndex(activeSearchResultIndex - 1, true);
    }

    function setActiveSearchResultIndex(nextIndex, focusActive) {
      if (searchResultHashes.length === 0) {
        activeSearchResultIndex = -1;
        syncSearchUi();
        syncSearchHighlights();
        return;
      }

      const normalizedIndex = ((nextIndex % searchResultHashes.length) + searchResultHashes.length) % searchResultHashes.length;
      activeSearchResultIndex = normalizedIndex;
      syncSearchUi();
      syncSearchHighlights();
      if (focusActive) {
        focusActiveSearchResult();
      }
    }

    function focusActiveSearchResult() {
      const activeHash = getActiveSearchResultHash();
      if (!activeHash) {
        return;
      }
      centerNodeInViewport(activeHash);
    }

    function getActiveSearchResultHash() {
      return activeSearchResultIndex >= 0 ? searchResultHashes[activeSearchResultIndex] || null : null;
    }

    function getNormalizedSearchQuery() {
      return String(searchQuery || '').trim().toLowerCase();
    }

    function nodeMatchesSearchQuery(node, normalizedQuery) {
      if (!normalizedQuery) {
        return false;
      }

      const candidateValues = [
        node.hash,
        node.hash.slice(0, 8),
        node.subject || '',
        node.author || '',
        ...node.refs.map((ref) => ref.name)
      ];
      return candidateValues.some((value) => String(value).toLowerCase().includes(normalizedQuery));
    }

    function syncRelationshipHighlights() {
      const baseTarget = selected[0] ? getSelectionTarget(selected[0]) : undefined;
      const compareTarget = selected[1] ? getSelectionTarget(selected[1]) : undefined;

      if (baseTarget && compareTarget) {
        const selectedHashes = new Set(
          [baseTarget.hash, compareTarget.hash].filter((hash) => typeof hash === 'string' && hash.length > 0)
        );

        for (const [hash, element] of nodeElements.entries()) {
          element.classList.toggle('selected', selectedHashes.has(hash));
          element.classList.remove('related', 'ancestor-related', 'descendant-related');
        }

        for (const element of edgeElements) {
          element.classList.remove('related', 'ancestor-path', 'descendant-path', 'muted');
        }
        return;
      }

      const anchorHash = baseTarget ? baseTarget.hash : null;
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
      activeContextMenuRequest = { clientX, clientY, target };
      const base = selected[0] ? getSelectionTarget(selected[0]) : undefined;
      const compare = selected[1] ? getSelectionTarget(selected[1]) : undefined;
      const targetLabel = target.label || target.name;
      const isCurrentHead = target.kind === 'head' || (
        target.kind === 'branch'
        && !!currentHeadName
        && target.name === currentHeadName
      );
      const canSyncCurrentHead =
        target.kind === 'head' &&
        !!currentHeadUpstreamName &&
        publishedLocalBranchNames.has(target.name);
      const canPublishBranch =
        (target.kind === 'head' || target.kind === 'branch') &&
        !publishedLocalBranchNames.has(target.name);
      const canResetCurrentWorkspace =
        target.kind === 'head' &&
        isWorkspaceDirty &&
        !hasConflictedMerge;
      const hasComparisonSelection =
        selected.length === 2 &&
        base &&
        compare &&
        (
          base.id === target.id
          || compare.id === target.id
          || base.hash === target.hash
          || compare.hash === target.hash
        );

      contextMenu.innerHTML = '';
      if (hasComparisonSelection) {
        appendMenuSection('Compare');
        appendMenuItem('Compare', () => postCompareSelected(base, compare), { primary: true });
        appendMenuItem('Show Log', () => postShowLogRange(base, compare));
        appendMenuItem('Unified Diff', () => postUnifiedDiff(base, compare));
        appendMenuSection('Inspect');
        appendMenuItem('Copy Commit Hash', () => postCopyCommitHash(target.hash));
        if (target.kind !== 'commit') {
          appendMenuItem('Copy ref name to clipboard', () => postCopyRefName(target));
        }
        appendMenuSection('Selection');
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        if (canSyncCurrentHead) {
          appendMenuSubmenu('Remote', [
            { label: 'Pull from ' + currentHeadUpstreamName, onClick: () => postPullCurrentHead() },
            { label: 'Push to ' + currentHeadUpstreamName, onClick: () => postPushCurrentHead() },
            { label: 'Sync with ' + currentHeadUpstreamName, onClick: () => postSyncCurrentHead() }
          ]);
        }
        appendMenuSection('Inspect');
        appendMenuItem('Show Log', () => postShowLogTarget(target));
        appendMenuItem('Copy Commit Hash', () => postCopyCommitHash(target.hash));
        if (target.kind !== 'commit') {
          appendMenuItem('Copy ref name to clipboard', () => postCopyRefName(target));
        }
        appendMenuSection('Compare');
        appendMenuItem('Compare With Worktree', () => postCompareWithWorktree(target));
        if (target.kind !== 'commit' && target.kind !== 'tag' && target.kind !== 'stash' && !isCurrentHead) {
          appendMenuSection('Branch Operations');
          appendMenuItem('Checkout to: ' + targetLabel, () => postCheckout(target));
        }
        if (canResetCurrentWorkspace) {
          appendMenuSection('Destructive');
          appendMenuItem('Reset Workspace to HEAD', () => postResetCurrentWorkspace(false), { destructive: true });
          appendMenuItem('Reset Workspace and Remove Untracked Files', () => postResetCurrentWorkspace(true), { destructive: true });
        }
        if (canPublishBranch) {
          appendMenuSection('Create And Publish');
          appendMenuItem('Publish Branch to Remote', () => postPublishBranch(target));
        }
        if (target.kind !== 'stash') {
          appendMenuSection('Create And Publish');
          appendMenuItem('Create New Branch', () => postCreateBranch(target));
          appendMenuItem('Create Tag', () => postCreateTag(target));
        }
        if (target.kind === 'tag') {
          const remoteTagState = remoteTagPublicationState.get(target.name);
          if (remoteTagState === 'published') {
            appendMenuSection('Destructive');
            appendMenuItem('Delete Remote Tag', () => postDeleteRemoteTag(target), { destructive: true });
          } else if (remoteTagState === 'unpublished') {
            appendMenuSection('Create And Publish');
            appendMenuItem('Push Tag to Remote', () => postPushTag(target));
          } else if (remoteTagState === 'unknown') {
            appendMenuSection('Create And Publish');
            appendMenuItem('Could Not Check Remote Tag', () => {}, { disabled: true });
          } else {
            appendMenuSection('Create And Publish');
            appendMenuItem('Checking Remote Tag...', () => {}, { disabled: true });
            requestRemoteTagState(target);
          }
        }
        if (target.kind !== 'commit' && !isCurrentHead && target.kind !== 'stash') {
          if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
            const deleteLabel = target.kind === 'tag'
              ? 'Delete Tag: ' + targetLabel
              : target.kind === 'remote'
                ? 'Delete Remote Branch: ' + targetLabel
                : 'Delete Branch: ' + targetLabel;
            appendMenuSection('Destructive');
            appendMenuItem(deleteLabel, () => postDelete(target), { destructive: true });
          }
          if (!mergeBlockedTargets.has(target.kind + '::' + target.name)) {
            appendMenuSection('Branch Operations');
            appendMenuItem('Merge Into ' + (currentHeadName || 'Current HEAD'), () => postMerge(target));
          }
        }
        if (selected.length > 0) {
          appendMenuSection('Selection');
          appendMenuItem('Clear Selection', () => {
            selected.splice(0, selected.length);
            syncSelection();
          });
        }
      }
      contextMenu.classList.add('open');
      placeContextMenu(clientX, clientY);
    }

    function appendMenuSubmenu(label, entries) {
      if (!contextMenu || entries.length === 0) {
        return;
      }

      delete contextMenu.dataset.currentSection;
      const group = document.createElement('div');
      group.className = 'context-menu-group';

      const parent = document.createElement('button');
      parent.className = 'context-item context-menu-parent';
      parent.type = 'button';
      parent.setAttribute('aria-haspopup', 'menu');
      parent.innerHTML = '<span>' + escapeHtml(label) + '</span><span class="context-menu-chevron">›</span>';
      group.appendChild(parent);

      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      submenu.setAttribute('role', 'menu');
      submenu.setAttribute('aria-label', label);
      for (const entry of entries) {
        const button = document.createElement('button');
        button.className = 'context-item';
        button.type = 'button';
        button.textContent = entry.label;
        button.addEventListener('click', () => {
          entry.onClick();
          closeContextMenu();
        });
        submenu.appendChild(button);
      }
      group.appendChild(submenu);
      contextMenu.appendChild(group);
    }

    function appendMenuSection(label) {
      if (!contextMenu || contextMenu.dataset.currentSection === label) {
        return;
      }
      contextMenu.dataset.currentSection = label;
      if (contextMenu.children.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'context-separator';
        separator.setAttribute('role', 'separator');
        contextMenu.appendChild(separator);
      }
    }

    function appendMenuItem(label, onClick, options = {}) {
      const button = document.createElement('button');
      button.className = 'context-item';
      if (options.primary) {
        button.classList.add('primary');
      }
      if (options.destructive) {
        button.classList.add('destructive');
      }
      button.textContent = label;
      button.disabled = !!options.disabled;
      button.addEventListener('click', () => {
        onClick();
        closeContextMenu();
      });
      contextMenu.appendChild(button);
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function placeContextMenu(clientX, clientY) {
      const margin = 8;
      contextMenu.style.left = '0px';
      contextMenu.style.top = '0px';
      const rect = typeof contextMenu.getBoundingClientRect === 'function'
        ? contextMenu.getBoundingClientRect()
        : { width: 260, height: 320 };
      const width = rect.width || 260;
      const height = rect.height || 320;
      const windowWidth = window.innerWidth || 1024;
      const windowHeight = window.innerHeight || 768;
      const maxLeft = Math.max(margin, windowWidth - width - margin);
      const maxTop = Math.max(margin, windowHeight - height - margin);
      contextMenu.style.left = Math.min(Math.max(margin, clientX), maxLeft) + 'px';
      contextMenu.style.top = Math.min(Math.max(margin, clientY), maxTop) + 'px';
    }

    function closeContextMenu() {
      contextMenu.classList.remove('open');
      contextMenu.innerHTML = '';
      activeContextMenuRequest = null;
      delete contextMenu.dataset.currentSection;
    }

    function toggleViewOptionsMenu() {
      if (!viewOptionsMenu || !viewOptionsButton) {
        return;
      }
      const shouldOpen = viewOptionsMenu.hidden;
      viewOptionsMenu.hidden = !shouldOpen;
      viewOptionsButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      closeContextMenu();
    }

    function closeViewOptionsMenu() {
      if (!viewOptionsMenu || !viewOptionsButton) {
        return;
      }
      viewOptionsMenu.hidden = true;
      viewOptionsButton.setAttribute('aria-expanded', 'false');
    }

    function syncViewOptionsButton() {
      if (!viewOptionsButton) {
        return;
      }
      const visibleOptions = [
        currentProjectionOptions.showTags ? 'tags' : null,
        currentProjectionOptions.showRemoteBranches ? 'remotes' : null,
        currentProjectionOptions.showStashes ? 'stash' : null,
        minimapEnabled ? 'minimap' : null
      ].filter(Boolean);
      viewOptionsButton.title = visibleOptions.length > 0
        ? 'View options: showing ' + visibleOptions.join(', ')
        : 'View options: refs only';
    }

    function syncMinimapPreference() {
      if (showMinimapToggle) {
        showMinimapToggle.checked = minimapEnabled;
      }
      if (!minimapEnabled && graphMinimap) {
        minimapDragState = null;
        graphMinimap.hidden = true;
      }
      syncViewOptionsButton();
    }

    function setMinimapEnabled(enabled) {
      minimapEnabled = !!enabled;
      persistWebviewUiState();
      syncMinimapPreference();
      if (minimapEnabled) {
        syncMinimap('full');
      }
      syncToolbarActions();
    }

    function persistWebviewUiState() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        showMinimap: minimapEnabled
      });
    }

    function postCompareSelected(base, compare) {
      vscode.postMessage({
        type: 'compare-selected',
        baseRevision: base.revision,
        baseLabel: base.label,
        compareRevision: compare.revision,
        compareLabel: compare.label
      });
    }

    function postShowLogRange(base, compare) {
      vscode.postMessage({
        type: 'show-log',
        source: {
          kind: 'range',
          baseRevision: base.revision,
          baseLabel: base.label,
          compareRevision: compare.revision,
          compareLabel: compare.label
        }
      });
    }

    function postUnifiedDiff(base, compare) {
      vscode.postMessage({
        type: 'open-unified-diff',
        baseRevision: base.revision,
        compareRevision: compare.revision
      });
    }

    function postShowLogTarget(target) {
      vscode.postMessage({
        type: 'show-log',
        source: {
          kind: 'target',
          revision: target.revision,
          label: target.label
        }
      });
    }

    function postCompareWithWorktree(target) {
      vscode.postMessage({ type: 'compare-with-worktree', revision: target.revision, label: target.label });
    }

    function postCopyCommitHash(commitHash) {
      vscode.postMessage({ type: 'copy-commit-hash', commitHash });
    }

    function postCopyRefName(target) {
      vscode.postMessage({ type: 'copy-ref-name', refName: target.name, refKind: target.kind });
    }

    function postCheckout(target) {
      vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
    }

    function postSyncCurrentHead() {
      vscode.postMessage({ type: 'sync-current-head' });
    }

    function postPullCurrentHead() {
      vscode.postMessage({ type: 'pull-current-head' });
    }

    function postPushCurrentHead() {
      vscode.postMessage({ type: 'push-current-head' });
    }

    function postResetCurrentWorkspace(includeUntracked) {
      vscode.postMessage({ type: 'reset-current-workspace', includeUntracked: !!includeUntracked });
    }

    function postPublishBranch(target) {
      vscode.postMessage({
        type: 'publish-branch',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      });
    }

    function postCreateBranch(target) {
      vscode.postMessage({
        type: 'create-branch',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      });
    }

    function postCreateTag(target) {
      vscode.postMessage({
        type: 'create-tag',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      });
    }

    function requestRemoteTagState(target) {
      if (
        !target ||
        target.kind !== 'tag' ||
        remoteTagPublicationState.has(target.name) ||
        pendingRemoteTagStateRequests.has(target.name)
      ) {
        return;
      }

      pendingRemoteTagStateRequests.add(target.name);
      vscode.postMessage({
        type: 'resolve-remote-tag-state',
        refName: target.name
      });
    }

    function postPushTag(target) {
      vscode.postMessage({
        type: 'push-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      });
    }

    function postDeleteRemoteTag(target) {
      vscode.postMessage({
        type: 'delete-remote-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      });
    }

    function postDelete(target) {
      vscode.postMessage({ type: 'delete', refName: target.name, refKind: target.kind });
    }

    function postMerge(target) {
      vscode.postMessage({ type: 'merge', refName: target.name });
    }

    function syncToolbarActions() {
      const canZoomIn = zoomLevels.some((value) => value > currentZoom);
      const canZoomOut = zoomLevels.some((value) => value < currentZoom);
      const canResetZoom = currentZoom !== 1;
      const canZoomInMinimap = minimapZoomLevels.some((value) => value > minimapZoom);
      const canZoomOutMinimap = minimapZoomLevels.some((value) => value < minimapZoom);
      const canResetMinimapZoom = minimapZoom !== 1;
      if (scopeSelect) {
        scopeSelect.disabled = toolbarBusy;
      }
      if (viewOptionsButton) {
        viewOptionsButton.disabled = toolbarBusy;
      }
      if (reloadButton) {
        reloadButton.disabled = toolbarBusy;
      }
      if (abortMergeButton) {
        abortMergeButton.disabled = toolbarBusy || !currentState?.hasConflictedMerge;
      }
      if (showTagsToggle) {
        showTagsToggle.disabled = toolbarBusy;
      }
      if (showRemoteBranchesToggle) {
        showRemoteBranchesToggle.disabled = toolbarBusy;
      }
      if (showStashesToggle) {
        showStashesToggle.disabled = toolbarBusy;
      }
      if (showMinimapToggle) {
        showMinimapToggle.disabled = toolbarBusy;
      }
      if (centerHeadButton) {
        centerHeadButton.disabled = toolbarBusy;
      }
      if (zoomInButton) {
        zoomInButton.disabled = toolbarBusy || !canZoomIn;
      }
      if (zoomOutButton) {
        zoomOutButton.disabled = toolbarBusy || !canZoomOut;
      }
      if (zoomResetButton) {
        zoomResetButton.disabled = toolbarBusy || !canResetZoom;
      }
      if (minimapZoomInButton) {
        minimapZoomInButton.disabled = toolbarBusy || !minimapEnabled || !canZoomInMinimap;
      }
      if (minimapZoomOutButton) {
        minimapZoomOutButton.disabled = toolbarBusy || !minimapEnabled || !canZoomOutMinimap;
      }
      if (minimapZoomResetButton) {
        minimapZoomResetButton.disabled = toolbarBusy || !minimapEnabled || !canResetMinimapZoom;
      }
    }

    function setToolbarBusy(isBusy, pendingControl = null) {
      toolbarBusy = isBusy;
      const controls = [
        scopeSelect,
        viewOptionsButton,
        showTagsToggle,
        showRemoteBranchesToggle,
        showStashesToggle,
        abortMergeButton,
        searchInput,
        searchPrevButton,
        searchNextButton,
        searchClearButton,
        reloadButton,
        centerHeadButton,
        zoomOutButton,
        zoomResetButton,
        zoomInButton,
        minimapZoomOutButton,
        minimapZoomResetButton,
        minimapZoomInButton,
        statusActionButton
      ];
      for (const control of controls) {
        if (!control) {
          continue;
        }
        if (!isBusy) {
          control.removeAttribute('data-pending');
          control.removeAttribute('aria-busy');
        } else if (pendingControl === control) {
          control.setAttribute('data-pending', 'true');
          control.setAttribute('aria-busy', 'true');
        } else {
          control.removeAttribute('data-pending');
          control.removeAttribute('aria-busy');
        }
      }
      syncToolbarActions();
      syncSearchUi();
    }

	    function postMessageWithLoading(message, label, pendingControl = null, mode = 'blocking') {
	      if (toolbarBusy) {
	        return;
	      }
	      showLoading(label, pendingControl, mode);
      requestAnimationFrame(() => {
        vscode.postMessage(message);
	      });
	    }

	    function waitForNextFrame() {
	      return new Promise((resolve) => {
	        requestAnimationFrame(() => {
	          resolve();
	        });
	      });
	    }

	    async function runWithLoading(label, work, pendingControl = null, mode = 'blocking') {
	      if (toolbarBusy) {
	        return;
	      }
	      showLoading(label, pendingControl, mode);
	      await waitForNextFrame();
	      try {
	        await work();
	      } finally {
	        await waitForNextFrame();
	        hideLoading();
	      }
	    }

	    function showLoading(label, pendingControl = null, mode = 'blocking') {
	      if (typeof label === 'string' && loadingMessage) {
	        loadingMessage.textContent = label;
	      }
      if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'false');
        loadingOverlay.setAttribute('data-mode', mode);
      }
      setToolbarBusy(true, pendingControl);
      closeViewOptionsMenu();
      document.body.classList.remove('loading', 'loading-subtle');
      if (mode === 'subtle') {
        document.body.classList.add('loading-subtle');
        document.body.removeAttribute('aria-busy');
      } else {
        document.body.classList.add('loading');
        document.body.setAttribute('aria-busy', 'true');
      }
      closeContextMenu();
    }

    function hideLoading() {
      if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'true');
        loadingOverlay.removeAttribute('data-mode');
      }
      setToolbarBusy(false);
      document.body.classList.remove('loading', 'loading-subtle');
      document.body.removeAttribute('aria-busy');
    }
  `;
}

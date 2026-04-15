export function renderRevisionGraphScriptInteractions(): string {
  return `
    function setZoom(zoom) {
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      syncCanvasSize();
      applyNodeLayout(false);
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

    function syncSelection() {
      for (const element of document.querySelectorAll('[data-ref-id]')) {
        const refId = element.getAttribute('data-ref-id');
        element.classList.toggle('base', refId === selected[0]);
        element.classList.toggle('compare', refId === selected[1]);
        element.classList.toggle('has-compare', selected.length === 2 && refId === selected[0]);
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
	      const isCurrentHead = target.kind === 'head' || (
	        target.kind === 'branch'
	        && !!currentHeadName
	        && target.name === currentHeadName
	      );
      const canSyncCurrentHead = target.kind === 'head' && !!currentHeadUpstreamName;
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
	        if (target.kind !== 'tag' && target.kind !== 'stash' && !isCurrentHead) {
	          appendMenuItem('Checkout to: ' + target.name, () => {
	            vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
	          });
	        }
        if (canSyncCurrentHead) {
          appendMenuItem('Sync with ' + currentHeadUpstreamName, () => {
            vscode.postMessage({ type: 'sync-current-head' });
          });
        }
	        if (target.kind !== 'stash') {
	          appendMenuItem('Create New Branch', () => {
	            vscode.postMessage({ type: 'create-branch', refName: target.name, refKind: target.kind });
	          });
	        }
	        if (!isCurrentHead && target.kind !== 'stash') {
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

    function syncToolbarActions() {
      const canZoomIn = zoomLevels.some((value) => value > currentZoom);
      const canZoomOut = zoomLevels.some((value) => value < currentZoom);
      if (scopeSelect) {
        scopeSelect.disabled = toolbarBusy;
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
      if (showBranchingsToggle) {
        showBranchingsToggle.disabled = toolbarBusy;
      }
      if (fetchButton) {
        fetchButton.disabled = toolbarBusy;
      }
      if (reorganizeButton) {
        reorganizeButton.disabled = toolbarBusy;
      }
      if (zoomInButton) {
        zoomInButton.disabled = toolbarBusy || !canZoomIn;
      }
      if (zoomOutButton) {
        zoomOutButton.disabled = toolbarBusy || !canZoomOut;
      }
    }

    function setToolbarBusy(isBusy, pendingControl = null) {
      toolbarBusy = isBusy;
      const controls = [
        scopeSelect,
        showTagsToggle,
        showRemoteBranchesToggle,
        showStashesToggle,
        showBranchingsToggle,
        searchInput,
        searchPrevButton,
        searchNextButton,
        searchClearButton,
        fetchButton,
        reorganizeButton,
        zoomOutButton,
        zoomInButton
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

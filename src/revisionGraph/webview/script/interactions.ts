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
      syncSelectionActions();
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
        appendMenuSection('Selection');
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        appendMenuSection('Inspect');
        appendMenuItem('Show Log', () => postShowLogTarget(target));
        appendMenuItem('Copy Commit Hash', () => postCopyCommitHash(target.hash));
        appendMenuSection('Compare');
        appendMenuItem('Compare With Worktree', () => postCompareWithWorktree(target));
        if (target.kind !== 'commit' && target.kind !== 'tag' && target.kind !== 'stash' && !isCurrentHead) {
          appendMenuSection('Branch Operations');
          appendMenuItem('Checkout to: ' + targetLabel, () => postCheckout(target));
        }
        if (canSyncCurrentHead) {
          appendMenuSection('Branch Operations');
          appendMenuItem('Sync with ' + currentHeadUpstreamName, () => postSyncCurrentHead());
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
          if (knownRemoteTagNames.has(target.name)) {
            appendMenuSection('Destructive');
            appendMenuItem('Delete Remote Tag', () => postDeleteRemoteTag(target), { destructive: true });
          } else {
            appendMenuSection('Create And Publish');
            appendMenuItem('Push Tag to Remote', () => postPushTag(target));
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
      contextMenu.querySelector('.context-item')?.focus();
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
        currentProjectionOptions.showBranchingsAndMerges ? 'branching/merge commits' : null
      ].filter(Boolean);
      viewOptionsButton.title = visibleOptions.length > 0
        ? 'View options: showing ' + visibleOptions.join(', ')
        : 'View options: refs only';
    }

    function syncSelectionActions() {
      if (!selectionActionBar) {
        return;
      }

      const base = selected[0] ? getSelectionTarget(selected[0]) : null;
      const compare = selected[1] ? getSelectionTarget(selected[1]) : null;
      selectionActionBar.innerHTML = '';

      if (!base) {
        selectionActionBar.hidden = true;
        return;
      }

      selectionActionBar.hidden = false;
      const summary = document.createElement('span');
      summary.className = 'selection-summary';
      summary.textContent = compare
        ? 'Compare ' + base.label + ' -> ' + compare.label
        : base.label;
      selectionActionBar.appendChild(summary);

      if (compare) {
        appendSelectionAction('Compare', () => postCompareSelected(base, compare), { primary: true });
        appendSelectionAction('Show Log', () => postShowLogRange(base, compare));
        appendSelectionAction('Unified Diff', () => postUnifiedDiff(base, compare));
        appendSelectionAction('Copy Hash', () => postCopyCommitHash(compare.hash));
      } else {
        appendSelectionAction('Compare Worktree', () => postCompareWithWorktree(base), { primary: true });
        appendSelectionAction('Show Log', () => postShowLogTarget(base));
        appendSelectionAction('Copy Hash', () => postCopyCommitHash(base.hash));
        if (base.kind !== 'stash') {
          appendSelectionAction('Branch', () => postCreateBranch(base));
          appendSelectionAction('Tag', () => postCreateTag(base));
        }
      }

      appendSelectionAction('Clear', () => {
        selected.splice(0, selected.length);
        syncSelection();
      });
    }

    function appendSelectionAction(label, onClick, options = {}) {
      const button = document.createElement('button');
      button.className = 'selection-action';
      if (options.primary) {
        button.classList.add('primary');
      }
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        onClick();
        closeContextMenu();
      });
      selectionActionBar.appendChild(button);
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

    function postCheckout(target) {
      vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
    }

    function postSyncCurrentHead() {
      vscode.postMessage({ type: 'sync-current-head' });
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
      if (scopeSelect) {
        scopeSelect.disabled = toolbarBusy;
      }
      if (viewOptionsButton) {
        viewOptionsButton.disabled = toolbarBusy;
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
        viewOptionsButton,
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
        zoomInButton,
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

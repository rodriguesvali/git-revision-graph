export function renderRevisionGraphScriptInteractions(): string {
  return `
    function setZoom(zoom, options = {}) {
      const shouldPreserveViewport = options.preserveViewport !== false;
      const scenePlacementSnapshot = shouldPreserveViewport ? captureScenePlacementSnapshot() : null;
      const viewportSnapshot = shouldPreserveViewport ? captureViewportSnapshot() : null;
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      syncCanvasSize();
      scheduleVirtualSceneRender('zoom', true);
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
        formatShortCommitHash(node.hash),
        node.subject || '',
        node.author || '',
        ...node.refs
          .filter((ref) => isReferenceVisible({
            id: createReferenceId(node.hash, ref.kind, ref.name),
            hash: node.hash,
            name: ref.name,
            kind: ref.kind
          }))
          .map((ref) => ref.name)
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
      const canPublishBranch =
        (target.kind === 'head' || target.kind === 'branch') &&
        !publishedLocalBranchNames.has(target.name);
      const canAbortConflictedMerge =
        target.kind === 'head' &&
        hasConflictedMerge;
      const canStashCurrentWorkspace =
        target.kind === 'head' &&
        isWorkspaceDirty &&
        !hasMergeConflicts;
      const canResetToTarget =
        target.kind !== 'head' &&
        target.kind !== 'stash' &&
        !(target.kind === 'branch' && !!currentHeadName && target.name === currentHeadName);
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
      const focusRangeActionLabel = hasComparisonSelection
        ? getFocusRangeActionLabel(base, compare)
        : null;
      const focusDescendantsActionLabel = !hasComparisonSelection
        ? getFocusDescendantsActionLabel(target)
        : null;
      const flowBranch = isFlowGovernanceActive() && target.kind !== 'commit'
        ? getFlowBranchInfo(target.name)
        : null;

      contextMenu.innerHTML = '';
      if (hasComparisonSelection) {
        appendMenuSection('Compare');
        appendMenuItem('Compare', () => postCompareSelected(base, compare), { primary: true });
        appendMenuItem('Show Log', () => postShowLogRange(base, compare));
        appendMenuItem('Unified Diff', () => postUnifiedDiff(base, compare));
        if (focusRangeActionLabel) {
          appendMenuItem(focusRangeActionLabel, () => postFocusRange(base, compare));
        }
        appendMenuSection('Inspect');
        appendMenuItem('Copy Hash', () => postCopyCommitHash(target.hash));
        if (target.kind !== 'commit') {
          appendMenuItem('Copy Ref Name', () => postCopyRefName(target));
        }
        if (canAbortConflictedMerge) {
          appendMenuSection('Destructive');
          appendMenuItem('Abort Merge', () => postAbortMerge(), { destructive: true });
        }
        if (canResetToTarget) {
          appendMenuSection('Destructive');
          appendMenuItem('Reset to this', () => postResetToCommit(target), { destructive: true });
        }
        if (canStashCurrentWorkspace) {
          appendMenuSection('Stash');
          appendMenuItem('Stash Save', () => postStashSave());
        }
        appendMenuSection('Selection');
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        appendFlowGovernanceActions(flowBranch, target);
        appendMenuSection('Inspect');
        appendMenuItem('Show Log', () => postShowLogTarget(target));
        appendMenuItem('Copy Hash', () => postCopyCommitHash(target.hash));
        if (target.kind !== 'commit') {
          appendMenuItem('Copy Ref Name', () => postCopyRefName(target));
        }
        appendMenuSection('Compare');
        appendMenuItem('Compare With Worktree', () => postCompareWithWorktree(target));
        if (focusDescendantsActionLabel) {
          appendMenuSection('Navigate');
          appendMenuItem(focusDescendantsActionLabel, () => postFocusDescendants(target));
        }
        if (target.kind !== 'commit' && target.kind !== 'tag' && target.kind !== 'stash' && !isCurrentHead) {
          appendMenuSection('Branch Operations');
          appendMenuItem('Checkout to: ' + targetLabel, () => postCheckout(target));
        }
        if (canAbortConflictedMerge) {
          appendMenuSection('Destructive');
          appendMenuItem('Abort Merge', () => postAbortMerge(), { destructive: true });
        }
        if (canResetToTarget) {
          appendMenuSection('Destructive');
          appendMenuItem('Reset to this', () => postResetToCommit(target), { destructive: true });
        }
        if (canStashCurrentWorkspace) {
          appendMenuSection('Stash');
          appendMenuItem('Stash Save', () => postStashSave());
        }
        if (target.kind === 'stash') {
          appendMenuSection('Stash');
          appendMenuItem('Stash Apply', () => postStashApply(target));
          appendMenuItem('Stash Pop', () => postStashPop(target));
          appendMenuSection('Destructive');
          appendMenuItem('Remove Stash', () => postStashDrop(target), { destructive: true });
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
            appendMenuItem('Retry Remote Tag Check', () => retryRemoteTagState(target));
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

    function appendFlowGovernanceActions(flowBranch, target) {
      if (!flowBranch) {
        return;
      }

      const entries = [];
      if (flowBranch.kind === 'main') {
        entries.push(
          { label: 'Start New Release', onClick: () => showFlowBranchForm(target, 'release') },
          { label: 'Start New Feature', onClick: () => showFlowBranchForm(target, 'feature') },
          { label: 'Start New Hot Fix', onClick: () => showFlowBranchForm(target, 'hotfix') }
        );
      } else if (flowBranch.kind === 'feature') {
        entries.push(
          { label: 'Start New Task', onClick: () => showFlowBranchForm(target, 'task') },
          { label: 'Start New Bug', onClick: () => showFlowBranchForm(target, 'bug') }
        );
      } else if (flowBranch.kind === 'release') {
        const productionBranchName = getFlowProductionBranchName();
        entries.push({ label: 'Start New Bug', onClick: () => showFlowBranchForm(target, 'bug') });
        entries.push({ label: 'Validate Release Promotion', onClick: () => postValidateReleasePromotion(target) });
        if (productionBranchName) {
          entries.push(
            { label: 'Prepare Production Equalization', onClick: () => postPrepareFlowEqualization(target.name, productionBranchName) },
            { label: 'Copy Promotion PR Context', onClick: () => postCopyFlowPullRequestContext(target.name, productionBranchName) },
            { label: 'Open Promotion PR URL', onClick: () => postOpenFlowPullRequestUrl(target.name, productionBranchName) }
          );
        }
      }

      if (entries.length > 0) {
        appendMenuSection('Flow Governance');
        appendMenuSubmenu('Flow Governance', entries);
      }
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

    function appendMenuSubmenu(label, entries) {
      const group = document.createElement('div');
      group.className = 'context-menu-submenu';

      const button = document.createElement('button');
      button.className = 'context-menu-item context-submenu-trigger';
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');

      const labelSpan = document.createElement('span');
      labelSpan.className = 'context-menu-label';
      labelSpan.textContent = label;
      button.appendChild(labelSpan);

      const chevron = document.createElement('span');
      chevron.className = 'context-menu-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '>';
      button.appendChild(chevron);

      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      submenu.setAttribute('role', 'menu');
      submenu.setAttribute('aria-label', label);

      for (const entry of entries) {
        const submenuButton = document.createElement('button');
        submenuButton.className = 'context-menu-item';
        submenuButton.type = 'button';
        submenuButton.textContent = entry.label;
        submenuButton.addEventListener('click', () => {
          entry.onClick();
          closeContextMenu();
        });
        submenuButton.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            closeContextSubmenu(group);
            button.focus();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closeContextMenu();
          }
        });
        submenu.appendChild(submenuButton);
      }

      group.addEventListener('mouseenter', () => openContextSubmenu(group));
      group.addEventListener('mouseleave', () => closeContextSubmenu(group));
      group.addEventListener('focusin', () => openContextSubmenu(group));
      group.addEventListener('focusout', (event) => {
        if (!group.contains(event.relatedTarget)) {
          closeContextSubmenu(group);
        }
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openContextSubmenu(group);
          submenu.querySelector('.context-menu-item')?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeContextMenu();
        }
      });

      group.appendChild(button);
      group.appendChild(submenu);
      contextMenu.appendChild(group);
    }

    function openContextSubmenu(group) {
      closeContextSubmenus(group);
      group.classList.add('open');
      const trigger = group.querySelector('.context-submenu-trigger');
      const submenu = group.querySelector('.context-submenu');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'true');
      }
      if (submenu) {
        placeContextSubmenu(group, submenu);
      }
    }

    function closeContextSubmenus(exceptGroup = null) {
      for (const group of contextMenu.querySelectorAll('.context-menu-submenu.open')) {
        if (group === exceptGroup) {
          continue;
        }
        closeContextSubmenu(group);
      }
    }

    function closeContextSubmenu(group) {
      group.classList.remove('open');
      const trigger = group.querySelector('.context-submenu-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    }

    function placeContextSubmenu(group, submenu) {
      const margin = 8;
      submenu.style.left = '0px';
      submenu.style.top = '0px';
      const anchorRect = typeof group.getBoundingClientRect === 'function'
        ? group.getBoundingClientRect()
        : { left: 0, right: 250, top: 0 };
      const submenuRect = typeof submenu.getBoundingClientRect === 'function'
        ? submenu.getBoundingClientRect()
        : { width: 220, height: 120 };
      const width = submenuRect.width || 220;
      const height = submenuRect.height || 120;
      const windowWidth = window.innerWidth || 1024;
      const windowHeight = window.innerHeight || 768;
      let left = anchorRect.right + 6;
      if (left + width > windowWidth - margin) {
        left = anchorRect.left - width - 6;
      }
      let top = anchorRect.top - 6;
      if (top + height > windowHeight - margin) {
        top = windowHeight - height - margin;
      }
      if (top < margin) {
        top = margin;
      }
      submenu.style.left = Math.max(margin, left) + 'px';
      submenu.style.top = top + 'px';
    }

    function appendMenuItem(label, onClick, options = {}) {
      const button = document.createElement('button');
      button.className = 'context-menu-item';
      button.type = 'button';
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

    function showFlowBranchForm(target, branchKind) {
      closeContextMenu();
      const dialog = ensureFlowBranchDialog();
      const copy = getFlowBranchDialogCopy(branchKind);
      dialog.target = target;
      dialog.branchKind = branchKind;
      dialog.title.textContent = copy.title;
      dialog.submitButton.textContent = copy.submitLabel;
      const usesStructuredName = branchKind === 'task' || branchKind === 'bug' || branchKind === 'hotfix';
      const requiresDescription = branchKind === 'bug' || branchKind === 'hotfix';
      dialog.nameLabel.hidden = usesStructuredName;
      dialog.nameInput.required = !usesStructuredName;
      dialog.nameInput.setAttribute('aria-required', String(!usesStructuredName));
      dialog.taskDevLabel.hidden = !usesStructuredName;
      dialog.taskDevInput.required = usesStructuredName;
      dialog.taskDevInput.setAttribute('aria-required', String(usesStructuredName));
      dialog.taskDevText.textContent = branchKind === 'bug'
        ? 'Bug ID *'
        : branchKind === 'hotfix' ? 'Hotfix ID *' : 'Dev Task *';
      dialog.taskDevInput.inputMode = branchKind === 'task' ? 'numeric' : 'text';
      dialog.shortNameLabel.hidden = !usesStructuredName;
      dialog.shortNameInput.required = usesStructuredName;
      dialog.shortNameInput.setAttribute('aria-required', String(usesStructuredName));
      dialog.descriptionText.textContent = requiresDescription ? 'Description *' : 'Description';
      dialog.descriptionInput.required = requiresDescription;
      dialog.descriptionInput.setAttribute('aria-required', String(requiresDescription));
      dialog.nameInput.value = '';
      dialog.taskDevInput.value = '';
      dialog.shortNameInput.value = '';
      dialog.descriptionInput.value = '';
      setFlowBranchDialogError(dialog, '');
      dialog.backdrop.hidden = false;
      document.body.classList.add('flow-dialog-open');
      window.setTimeout(() => (usesStructuredName ? dialog.taskDevInput : dialog.nameInput).focus(), 0);
    }

    function ensureFlowBranchDialog() {
      let backdrop = document.getElementById('flowBranchDialog');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'flowBranchDialog';
        backdrop.className = 'flow-dialog-backdrop';
        backdrop.hidden = true;

        const form = document.createElement('form');
        form.className = 'flow-dialog';
        form.setAttribute('role', 'dialog');
        form.setAttribute('aria-modal', 'true');
        form.setAttribute('aria-labelledby', 'flowBranchDialogTitle');

        const title = document.createElement('h2');
        title.id = 'flowBranchDialogTitle';
        title.className = 'flow-dialog-title';
        form.appendChild(title);

        const nameLabel = document.createElement('label');
        nameLabel.id = 'flowBranchNameLabel';
        nameLabel.className = 'flow-form-field';
        nameLabel.setAttribute('for', 'flowBranchNameInput');
        const nameText = document.createElement('span');
        nameText.className = 'flow-form-label';
        nameText.textContent = 'Name *';
        const nameInput = document.createElement('input');
        nameInput.id = 'flowBranchNameInput';
        nameInput.className = 'flow-form-input';
        nameInput.type = 'text';
        nameInput.required = true;
        nameInput.setAttribute('aria-required', 'true');
        nameInput.maxLength = 240;
        nameInput.autocomplete = 'off';
        nameLabel.appendChild(nameText);
        nameLabel.appendChild(nameInput);
        form.appendChild(nameLabel);

        const taskDevLabel = document.createElement('label');
        taskDevLabel.id = 'flowBranchTaskDevLabel';
        taskDevLabel.className = 'flow-form-field';
        taskDevLabel.setAttribute('for', 'flowBranchTaskDevInput');
        taskDevLabel.hidden = true;
        const taskDevText = document.createElement('span');
        taskDevText.className = 'flow-form-label';
        taskDevText.textContent = 'Dev Task *';
        const taskDevInput = document.createElement('input');
        taskDevInput.id = 'flowBranchTaskDevInput';
        taskDevInput.className = 'flow-form-input';
        taskDevInput.type = 'text';
        taskDevInput.inputMode = 'numeric';
        taskDevInput.setAttribute('aria-required', 'true');
        taskDevInput.maxLength = 40;
        taskDevInput.autocomplete = 'off';
        taskDevLabel.appendChild(taskDevText);
        taskDevLabel.appendChild(taskDevInput);
        form.appendChild(taskDevLabel);

        const shortNameLabel = document.createElement('label');
        shortNameLabel.id = 'flowBranchShortNameLabel';
        shortNameLabel.className = 'flow-form-field';
        shortNameLabel.setAttribute('for', 'flowBranchShortNameInput');
        shortNameLabel.hidden = true;
        const shortNameText = document.createElement('span');
        shortNameText.className = 'flow-form-label';
        shortNameText.textContent = 'Short name *';
        const shortNameInput = document.createElement('input');
        shortNameInput.id = 'flowBranchShortNameInput';
        shortNameInput.className = 'flow-form-input';
        shortNameInput.type = 'text';
        shortNameInput.setAttribute('aria-required', 'true');
        shortNameInput.maxLength = 199;
        shortNameInput.autocomplete = 'off';
        shortNameLabel.appendChild(shortNameText);
        shortNameLabel.appendChild(shortNameInput);
        form.appendChild(shortNameLabel);

        const descriptionLabel = document.createElement('label');
        descriptionLabel.className = 'flow-form-field';
        descriptionLabel.setAttribute('for', 'flowBranchDescriptionInput');
        const descriptionText = document.createElement('span');
        descriptionText.className = 'flow-form-label';
        descriptionText.textContent = 'Description';
        const descriptionInput = document.createElement('textarea');
        descriptionInput.id = 'flowBranchDescriptionInput';
        descriptionInput.className = 'flow-form-input flow-form-textarea';
        descriptionInput.maxLength = 2048;
        descriptionLabel.appendChild(descriptionText);
        descriptionLabel.appendChild(descriptionInput);
        form.appendChild(descriptionLabel);

        const error = document.createElement('div');
        error.className = 'flow-form-error';
        error.setAttribute('role', 'alert');
        error.hidden = true;
        form.appendChild(error);

        const actions = document.createElement('div');
        actions.className = 'flow-dialog-actions';
        const cancelButton = document.createElement('button');
        cancelButton.className = 'flow-dialog-button';
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        const submitButton = document.createElement('button');
        submitButton.className = 'flow-dialog-button primary';
        submitButton.type = 'submit';
        submitButton.textContent = 'Create Release';
        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        backdrop.appendChild(form);
        document.body.appendChild(backdrop);

        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) {
            closeFlowBranchDialog();
          }
        });
        cancelButton.addEventListener('click', closeFlowBranchDialog);
        form.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeFlowBranchDialog();
          }
        });
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const dialog = ensureFlowBranchDialog();
          const branchKind = dialog.branchKind;
          const taskDev = dialog.taskDevInput.value.trim();
          const shortName = dialog.shortNameInput.value.trim();
          const usesStructuredName = branchKind === 'task' || branchKind === 'bug' || branchKind === 'hotfix';
          const name = usesStructuredName
            ? taskDev + '-' + shortName
            : dialog.nameInput.value.trim();
          const description = dialog.descriptionInput.value.trim();
          if (branchKind === 'task' && !/^[0-9]+$/.test(taskDev)) {
            setFlowBranchDialogError(dialog, 'Dev Task must be a number.');
            dialog.taskDevInput.focus();
            return;
          }
          if (branchKind === 'hotfix' && !taskDev) {
            setFlowBranchDialogError(dialog, 'Hotfix ID is required.');
            dialog.taskDevInput.focus();
            return;
          }
          if (branchKind === 'bug' && !taskDev) {
            setFlowBranchDialogError(dialog, 'Bug ID is required.');
            dialog.taskDevInput.focus();
            return;
          }
          if (usesStructuredName && !shortName) {
            setFlowBranchDialogError(dialog, 'Short name is required.');
            dialog.shortNameInput.focus();
            return;
          }
          if (!usesStructuredName && !name) {
            setFlowBranchDialogError(dialog, 'Name is required.');
            dialog.nameInput.focus();
            return;
          }
          if ((branchKind === 'bug' || branchKind === 'hotfix') && !description) {
            setFlowBranchDialogError(dialog, 'Description is required.');
            dialog.descriptionInput.focus();
            return;
          }

          const target = dialog.target;
          if (!target || !branchKind) {
            closeFlowBranchDialog();
            return;
          }

          vscode.postMessage(createRevisionGraphStartFlowBranchMessage(target, branchKind, name, description));
          closeFlowBranchDialog();
        });
      }

      return {
        backdrop,
        form: backdrop.querySelector('.flow-dialog'),
        title: backdrop.querySelector('#flowBranchDialogTitle'),
        submitButton: backdrop.querySelector('.flow-dialog-button.primary'),
        nameLabel: backdrop.querySelector('#flowBranchNameLabel'),
        nameInput: backdrop.querySelector('#flowBranchNameInput'),
        taskDevLabel: backdrop.querySelector('#flowBranchTaskDevLabel'),
        taskDevText: backdrop.querySelector('#flowBranchTaskDevLabel .flow-form-label'),
        taskDevInput: backdrop.querySelector('#flowBranchTaskDevInput'),
        shortNameLabel: backdrop.querySelector('#flowBranchShortNameLabel'),
        shortNameInput: backdrop.querySelector('#flowBranchShortNameInput'),
        descriptionText: backdrop.querySelector('[for="flowBranchDescriptionInput"] .flow-form-label'),
        descriptionInput: backdrop.querySelector('#flowBranchDescriptionInput'),
        error: backdrop.querySelector('.flow-form-error'),
        get target() {
          return backdrop.__flowBranchTarget || null;
        },
        set target(value) {
          backdrop.__flowBranchTarget = value;
        },
        get branchKind() {
          return backdrop.__flowBranchKind || null;
        },
        set branchKind(value) {
          backdrop.__flowBranchKind = value;
        }
      };
    }

    function closeFlowBranchDialog() {
      const backdrop = document.getElementById('flowBranchDialog');
      if (!backdrop) {
        return;
      }
      backdrop.hidden = true;
      backdrop.__flowBranchTarget = null;
      backdrop.__flowBranchKind = null;
      document.body.classList.remove('flow-dialog-open');
    }

    function setFlowBranchDialogError(dialog, message) {
      dialog.error.textContent = message;
      dialog.error.hidden = !message;
    }

    function getFlowBranchDialogCopy(branchKind) {
      if (branchKind === 'task') {
        return { title: 'Start New Task', submitLabel: 'Create Task' };
      }
      if (branchKind === 'feature') {
        return { title: 'Start New Feature', submitLabel: 'Create Feature' };
      }
      if (branchKind === 'hotfix') {
        return { title: 'Start New Hot Fix', submitLabel: 'Create Hot Fix' };
      }
      if (branchKind === 'bug') {
        return { title: 'Start New Bug', submitLabel: 'Create Bug' };
      }
      return { title: 'Start New Release', submitLabel: 'Create Release' };
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
        currentProjectionOptions.showMergeCommits ? 'merge commits' : null,
        currentFlowGovernance && currentFlowGovernance.enabled ? 'flow governance' : null,
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

    function updateFlowGovernanceOptions(options) {
      if (!hasFlowGovernanceState()) {
        return;
      }
      vscode.postMessage(createRevisionGraphFlowGovernanceOptionsMessage(options));
    }

    function postValidateReleasePromotion(target) {
      postMessageWithLoading(
        createRevisionGraphValidateReleasePromotionMessage(target),
        'Validating release promotion...',
        null,
        'subtle'
      );
    }

    function postPrepareFlowEqualization(releaseRefName, productionRefName) {
      postMessageWithLoading(
        createRevisionGraphPrepareFlowEqualizationMessage(releaseRefName, productionRefName),
        'Preparing production equalization...'
      );
    }

    function postCopyFlowPullRequestContext(sourceRefName, targetRefName) {
      vscode.postMessage(createRevisionGraphCopyFlowPullRequestContextMessage(sourceRefName, targetRefName));
    }

    function postOpenFlowPullRequestUrl(sourceRefName, targetRefName) {
      vscode.postMessage(createRevisionGraphOpenFlowPullRequestUrlMessage(sourceRefName, targetRefName));
    }

    function getFlowProductionBranchName() {
      if (!isFlowGovernanceActive() || !currentFlowGovernance || !Array.isArray(currentFlowGovernance.references)) {
        return null;
      }
      const production = currentFlowGovernance.references.find((ref) => ref && ref.kind === 'main');
      return production ? production.refName : null;
    }

    function persistWebviewUiState() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        showMinimap: minimapEnabled
      });
    }

    function postCompareSelected(base, compare) {
      vscode.postMessage(createRevisionGraphCompareSelectedMessage(base, compare));
    }

    function postShowLogRange(base, compare) {
      vscode.postMessage(createRevisionGraphShowLogRangeMessage(base, compare));
    }

    function postUnifiedDiff(base, compare) {
      vscode.postMessage(createRevisionGraphUnifiedDiffMessage(base, compare));
    }

    function getFocusRangeActionLabel(base, compare, activeRange = currentProjectionOptions.revisionRange) {
      if (!activeRange) {
        return 'Focus Range';
      }
      if (
        activeRange.baseRevision === base.revision &&
        activeRange.compareRevision === compare.revision
      ) {
        return null;
      }
      return 'Update Focus Range';
    }

    function postFocusRange(base, compare) {
      postMessageWithLoading(
        createRevisionGraphFocusRangeMessage(base, compare),
        currentProjectionOptions.revisionRange
          ? 'Updating Focus Range...'
          : 'Focusing selected range...',
        null,
        'subtle'
      );
    }

    function getFocusDescendantsActionLabel(target, activeFocus = currentProjectionOptions.descendantFocus) {
      if (!activeFocus) {
        return 'Focus Descendants';
      }
      if (activeFocus.anchorRevision === target.hash) {
        return null;
      }
      return 'Update Focus Descendants';
    }

    function postFocusDescendants(target) {
      postMessageWithLoading(
        createRevisionGraphFocusDescendantsMessage(target),
        currentProjectionOptions.descendantFocus
          ? 'Updating Focus Descendants...'
          : 'Focusing descendants...',
        null,
        'subtle'
      );
    }

    function postShowLogTarget(target) {
      vscode.postMessage(createRevisionGraphShowLogTargetMessage(target));
    }

    function postCompareWithWorktree(target) {
      vscode.postMessage(createRevisionGraphCompareWithWorktreeMessage(target));
    }

    function postCopyCommitHash(commitHash) {
      vscode.postMessage(createRevisionGraphCopyCommitHashMessage(commitHash));
    }

    function postCopyRefName(target) {
      vscode.postMessage(createRevisionGraphCopyRefNameMessage(target));
    }

    function postCheckout(target) {
      vscode.postMessage(createRevisionGraphCheckoutMessage(target));
    }

    function postResetToCommit(target) {
      vscode.postMessage(createRevisionGraphResetToCommitMessage(target));
    }

    function postSyncCurrentHead() {
      vscode.postMessage(createRevisionGraphSyncCurrentHeadMessage());
    }

    function postPullCurrentHead() {
      vscode.postMessage(createRevisionGraphPullCurrentHeadMessage());
    }

    function getCurrentHeadRemoteActionState() {
      const canUseCurrentHeadRemote =
        currentState &&
        currentState.viewMode === 'ready' &&
        !!currentHeadName &&
        !!currentHeadUpstreamName &&
        publishedLocalBranchNames.has(currentHeadName) &&
        references.some((ref) => ref.kind === 'head' && ref.name === currentHeadName);
      return {
        canUseCurrentHeadRemote: !!canUseCurrentHeadRemote,
        upstreamLabel: currentHeadUpstreamName || 'upstream'
      };
    }

    function postResetCurrentWorkspace(includeUntracked) {
      vscode.postMessage(createRevisionGraphResetCurrentWorkspaceMessage(includeUntracked));
    }

    function postStashSave() {
      postMessageWithLoading(createRevisionGraphStashSaveMessage(), 'Saving workspace changes to stash...');
    }

    function postStashApply(target) {
      vscode.postMessage(createRevisionGraphStashApplyMessage(target));
    }

    function postStashPop(target) {
      vscode.postMessage(createRevisionGraphStashPopMessage(target));
    }

    function postStashDrop(target) {
      vscode.postMessage(createRevisionGraphStashDropMessage(target));
    }

    function postPublishBranch(target) {
      vscode.postMessage(createRevisionGraphPublishBranchMessage(target));
    }

    function postCreateBranch(target) {
      vscode.postMessage(createRevisionGraphCreateBranchMessage(target));
    }

    function postCreateTag(target) {
      vscode.postMessage(createRevisionGraphCreateTagMessage(target));
    }

    function retryRemoteTagState(target) {
      if (!target || target.kind !== 'tag') {
        return;
      }

      remoteTagPublicationState.delete(target.name);
      requestRemoteTagState(target);
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
      vscode.postMessage(createRevisionGraphResolveRemoteTagStateMessage(target));
    }

    function postPushTag(target) {
      vscode.postMessage(createRevisionGraphPushTagMessage(target));
    }

    function postDeleteRemoteTag(target) {
      vscode.postMessage(createRevisionGraphDeleteRemoteTagMessage(target));
    }

    function postDelete(target) {
      vscode.postMessage(createRevisionGraphDeleteMessage(target));
    }

    function postMerge(target) {
      vscode.postMessage(createRevisionGraphMergeMessage(target));
    }

    function postAbortMerge() {
      postMessageWithLoading(createRevisionGraphAbortMergeMessage(), 'Aborting merge...');
    }

    function syncToolbarActions() {
      const canZoomIn = zoomLevels.some((value) => value > currentZoom);
      const canZoomOut = zoomLevels.some((value) => value < currentZoom);
      const canResetZoom = currentZoom !== 1;
      const canZoomInMinimap = minimapZoomLevels.some((value) => value > minimapZoom);
      const canZoomOutMinimap = minimapZoomLevels.some((value) => value < minimapZoom);
      const canResetMinimapZoom = minimapZoom !== 1;
      const remoteActionState = getCurrentHeadRemoteActionState();
      const hasRepository = !!currentState?.repositoryPath && !currentState?.loading;
      if (scopeSelect) {
        scopeSelect.disabled = toolbarBusy;
      }
      if (viewOptionsButton) {
        viewOptionsButton.disabled = toolbarBusy;
      }
      if (reloadButton) {
        reloadButton.disabled = toolbarBusy;
      }
      if (reloadMenuButton) {
        reloadMenuButton.disabled = toolbarBusy;
      }
      if (fetchAllButton) {
        fetchAllButton.disabled = toolbarBusy || !hasRepository;
      }
      if (pullButton) {
        pullButton.disabled = toolbarBusy || !remoteActionState.canUseCurrentHeadRemote;
        pullButton.title = 'Pull from ' + remoteActionState.upstreamLabel;
        pullButton.setAttribute('aria-label', pullButton.title);
      }
      if (pushButton) {
        pushButton.disabled = toolbarBusy || !remoteActionState.canUseCurrentHeadRemote;
        pushButton.title = 'Push to ' + remoteActionState.upstreamLabel;
        pushButton.setAttribute('aria-label', pushButton.title);
      }
      if (pushMenuButton) {
        pushMenuButton.disabled = toolbarBusy || !remoteActionState.canUseCurrentHeadRemote;
        pushMenuButton.title = 'More push options for ' + remoteActionState.upstreamLabel;
        pushMenuButton.setAttribute('aria-label', pushMenuButton.title);
      }
      if (syncButton) {
        syncButton.disabled = toolbarBusy || !remoteActionState.canUseCurrentHeadRemote;
        syncButton.title = 'Sync with ' + remoteActionState.upstreamLabel;
        syncButton.setAttribute('aria-label', syncButton.title);
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
      if (showMergeCommitsToggle) {
        showMergeCommitsToggle.disabled = toolbarBusy;
      }
      if (showMinimapToggle) {
        showMinimapToggle.disabled = toolbarBusy;
      }
      if (flowGovernanceEnabledToggle) {
        flowGovernanceEnabledToggle.disabled = toolbarBusy || !hasFlowGovernanceState();
      }
      if (rangeFilterClearButton) {
        rangeFilterClearButton.disabled = toolbarBusy;
      }
      if (descendantFilterClearButton) {
        descendantFilterClearButton.disabled = toolbarBusy;
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
        showMergeCommitsToggle,
        flowGovernanceEnabledToggle,
        searchInput,
        searchPrevButton,
        searchNextButton,
        searchClearButton,
        rangeFilterClearButton,
        descendantFilterClearButton,
        reloadButton,
        reloadMenuButton,
        fetchAllButton,
        pullButton,
        pushButton,
        pushMenuButton,
        syncButton,
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

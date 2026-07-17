    type RevisionGraphWebviewMenuEntry = { readonly label: string; readonly onClick: () => void };
    type RevisionGraphWebviewMenuItemOptions = {
      readonly primary?: boolean;
      readonly destructive?: boolean;
      readonly disabled?: boolean;
    };
    const contextSubmenuCloseScheduler = createRevisionGraphWebviewContextSubmenuCloseScheduler();
    function setZoom(zoom: number, options: { readonly preserveViewport?: boolean } = {}) {
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
      const nextZoom = getNextRevisionGraphWebviewZoomLevel(zoomLevels, currentZoom);
      if (nextZoom !== undefined) {
        setZoom(nextZoom);
      }
    }

    function zoomOut() {
      const nextZoom = getPreviousRevisionGraphWebviewZoomLevel(zoomLevels, currentZoom);
      if (nextZoom !== undefined) {
        setZoom(nextZoom);
      }
    }

    function resetZoom() {
      setZoom(1);
    }

    function setMinimapZoom(zoom: number) {
      minimapZoom = zoom;
      syncMinimap();
      syncToolbarActions();
    }

    function zoomInMinimap() {
      const nextZoom = getNextRevisionGraphWebviewZoomLevel(minimapZoomLevels, minimapZoom);
      if (nextZoom !== undefined) {
        setMinimapZoom(nextZoom);
      }
    }

    function resetMinimapZoom() {
      setMinimapZoom(1);
    }

    function zoomOutMinimap() {
      const nextZoom = getPreviousRevisionGraphWebviewZoomLevel(minimapZoomLevels, minimapZoom);
      if (nextZoom !== undefined) {
        setMinimapZoom(nextZoom);
      }
    }

    function syncSelection() {
      const baseTarget = selected[0] ? getSelectionTarget(selected[0]) : null;
      const compareTarget = selected[1] ? getSelectionTarget(selected[1]) : null;
      syncRevisionGraphWebviewSelectionHighlightsUi(
        Array.from(document.querySelectorAll('[data-ref-id]')),
        nodeElements,
        selected[0] || null,
        selected[1] || null,
        baseTarget && typeof baseTarget.hash === 'string' ? baseTarget.hash : null,
        compareTarget && typeof compareTarget.hash === 'string' ? compareTarget.hash : null,
        selected.length === 2
      );
      syncRelationshipHighlights();
      syncSearchHighlights();
      syncMinimap();
    }

    function setSearchQuery(nextQuery: string) {
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

    function syncSearchResults(options: { readonly preserveActiveHash?: boolean; readonly focusActive?: boolean } = {}) {
      const normalizedQuery = getNormalizedSearchQuery();
      const previousActiveHash = options.preserveActiveHash ? getActiveSearchResultHash() : null;
      if (!currentState || currentState.viewMode !== 'ready' || normalizedQuery.length === 0) {
        searchResultHashes = [];
        activeSearchResultIndex = -1;
        syncSearchUi();
        syncSearchHighlights();
        return;
      }

      searchResultHashes = [...getRevisionGraphWebviewSearchResultHashes(
        currentState.scene.nodes as unknown as readonly RevisionGraphWebviewSearchNode[],
        normalizedQuery,
        (hash, reference) => isReferenceVisible({
          id: createReferenceId(hash, reference.kind, reference.name),
          hash,
          name: reference.name,
          kind: reference.kind
        })
      )];

      activeSearchResultIndex = getRevisionGraphWebviewSearchActiveResultIndex(
        searchResultHashes,
        previousActiveHash
      );

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
      syncRevisionGraphWebviewSearchUi(
        {
          input: searchInput,
          resultBadge: searchResultBadge,
          previousButton: searchPrevButton,
          nextButton: searchNextButton,
          clearButton: searchClearButton
        },
        {
          query: searchQuery,
          isQueryActive: normalizedQuery.length > 0,
          resultCount: searchResultHashes.length,
          activeResultIndex: activeSearchResultIndex,
          isToolbarBusy: toolbarBusy
        }
      );
    }

    function syncSearchHighlights() {
      syncRevisionGraphWebviewSearchHighlights(
        nodeElements,
        searchResultHashes,
        getActiveSearchResultHash()
      );
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

    function setActiveSearchResultIndex(nextIndex: number, focusActive: boolean) {
      activeSearchResultIndex = normalizeRevisionGraphWebviewSearchResultIndex(
        searchResultHashes,
        nextIndex
      );
      if (activeSearchResultIndex < 0) {
        syncSearchUi();
        syncSearchHighlights();
        return;
      }

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
      return getRevisionGraphWebviewActiveSearchResultHash(searchResultHashes, activeSearchResultIndex);
    }

    function getNormalizedSearchQuery() {
      return normalizeRevisionGraphWebviewSearchQuery(searchQuery);
    }

    function syncRelationshipHighlights() {
      const baseTarget = selected[0] ? getSelectionTarget(selected[0]) : undefined;
      const compareTarget = selected[1] ? getSelectionTarget(selected[1]) : undefined;
      const baseHash = baseTarget && typeof baseTarget.hash === 'string' ? baseTarget.hash : null;
      const compareHash = compareTarget && typeof compareTarget.hash === 'string' ? compareTarget.hash : null;
      const ancestorPath = baseHash && !compareHash ? getPrimaryAncestorPath(baseHash) : [];
      const descendantPath = baseHash && !compareHash ? tracePrimaryPath(baseHash, 'descendant') : [];
      const highlights = createRevisionGraphWebviewRelationshipHighlights(
        baseHash,
        compareHash,
        ancestorPath,
        descendantPath
      );
      syncRevisionGraphWebviewRelationshipHighlightsUi(nodeElements, edgeElements, highlights);
    }

    function openContextMenu(clientX: number, clientY: number, target: RevisionGraphWebviewTarget) {
      activeContextMenuRequest = { clientX, clientY, target };
      const selectedTargets = selected
        .map((selectionId) => getSelectionTarget(selectionId))
        .filter((candidate): candidate is RevisionGraphWebviewSelectionTarget => candidate !== null);
      const comparisonTargets = getRevisionGraphWebviewContextMenuComparisonTargets(
        selectedTargets,
        target
      );
      const plan = createRevisionGraphWebviewContextMenuPlan({
        target,
        comparisonTargets,
        currentHeadName,
        publishedLocalBranchNames,
        isWorkspaceDirty,
        hasMergeConflicts,
        hasConflictedMerge,
        mergeBlockedTargets,
        remoteTagState: remoteTagPublicationState.get(target.name),
        focusRangeActionLabel: comparisonTargets
          ? getFocusRangeActionLabel(comparisonTargets.base, comparisonTargets.compare)
          : null,
        focusDescendantsActionLabel: comparisonTargets
          ? null
          : getFocusDescendantsActionLabel(target),
        hasSelection: selected.length > 0
      });
      const actionHandlers = createContextMenuActionHandlers(target, comparisonTargets);

      contextMenu.innerHTML = '';
      if (!comparisonTargets && isFlowGovernanceActive() && target.kind !== 'commit') {
        appendFlowGovernanceActions(getFlowBranchInfo(target.name), target);
      }
      for (const item of plan.items) {
        appendMenuSection(item.section);
        appendMenuItem(item.label, actionHandlers[item.action], item);
      }
      if (plan.shouldRequestRemoteTagState) {
        requestRemoteTagState(target);
      }
      contextMenu.classList.add('open');
      placeContextMenu(clientX, clientY);
    }

    function createContextMenuActionHandlers(
      target: RevisionGraphWebviewTarget,
      comparisonTargets: RevisionGraphWebviewContextMenuComparisonTargets | null
    ): Readonly<Record<RevisionGraphWebviewContextMenuAction, () => void>> {
      const base = comparisonTargets?.base || target;
      const compare = comparisonTargets?.compare || target;
      return {
        'abort-merge': () => postAbortMerge(),
        checkout: () => postCheckout(target),
        'clear-selection': () => clearContextMenuSelection(),
        'compare-selected': () => postCompareSelected(base, compare),
        'compare-with-worktree': () => postCompareWithWorktree(target),
        'copy-hash': () => postCopyCommitHash(target.hash),
        'copy-ref-name': () => postCopyRefName(target),
        'create-branch': () => postCreateBranch(target),
        'create-tag': () => postCreateTag(target),
        'delete-ref': () => postDelete(target),
        'delete-remote-tag': () => postDeleteRemoteTag(target),
        'focus-descendants': () => postFocusDescendants(target),
        'focus-range': () => postFocusRange(base, compare),
        merge: () => postMerge(target),
        'publish-branch': () => postPublishBranch(target),
        'push-tag': () => postPushTag(target),
        'remote-tag-loading': () => {},
        'reset-to-commit': () => postResetToCommit(target),
        'retry-remote-tag-state': () => retryRemoteTagState(target),
        'show-log-range': () => postShowLogRange(base, compare),
        'show-log-target': () => postShowLogTarget(target),
        'stash-apply': () => postStashApply(target),
        'stash-drop': () => postStashDrop(target),
        'stash-pop': () => postStashPop(target),
        'stash-save': () => postStashSave(),
        'unified-diff': () => postUnifiedDiff(base, compare)
      };
    }

    function clearContextMenuSelection() {
      selected.splice(0, selected.length);
      syncSelection();
    }

    function appendFlowGovernanceActions(
      flowBranch: RevisionGraphWebviewLegacyFlowReference | null,
      target: RevisionGraphWebviewTarget
    ) {
      if (!flowBranch) {
        return;
      }

      const entries: RevisionGraphWebviewMenuEntry[] = [];
      if (flowBranch.kind === 'main') {
        entries.push(
          { label: 'Start New Release', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'release')) },
          { label: 'Start New Feature', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'feature')) },
          { label: 'Start New Hot Fix', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'hotfix')) }
        );
      } else if (flowBranch.kind === 'feature') {
        entries.push(
          { label: 'Start New Task', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'task')) },
          { label: 'Start New Bug', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'bug')) },
          { label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) },
          { label: 'Promotion PR Context', onClick: () => openFlowPullRequestContextForm(target) }
        );
      } else if (flowBranch.kind === 'release') {
        const productionBranchName = getFlowProductionBranchName();
        entries.push({ label: 'Start New Bug', onClick: () => vscode.postMessage(createRevisionGraphPrepareStartFlowBranchMessage(target, 'bug')) });
        entries.push({ label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) });
        if (productionBranchName) {
          entries.push(
            { label: 'Promotion PR Context', onClick: () => postCopyFlowPullRequestContext(target.name, productionBranchName) }
          );
        }
      } else if (flowBranch.kind === 'hotfix' || flowBranch.kind === 'sync' || flowBranch.kind === 'task') {
        const pullRequestTargetName = flowBranch.kind === 'hotfix' ? getFlowProductionBranchName()
          : getFlowPullRequestTargets(target.name)[0]?.targetRefName;
        if (pullRequestTargetName) {
          entries.push(
            { label: 'Promotion PR Context', onClick: () => postCopyFlowPullRequestContext(target.name, pullRequestTargetName) }
          );
        }
      }

      if (entries.length > 0) {
        appendMenuSection('Flow Governance');
        appendMenuSubmenu('Flow Governance', entries);
      }
    }

    function appendMenuSection(label: string) {
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

    function appendMenuSubmenu(label: string, entries: readonly RevisionGraphWebviewMenuEntry[]) {
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

      const keepSubmenuOpen = () => {
        contextSubmenuCloseScheduler.cancel(group);
        openContextSubmenu(group);
      };
      group.addEventListener('mouseenter', keepSubmenuOpen);
      submenu.addEventListener('mouseenter', keepSubmenuOpen);
      group.addEventListener('mouseleave', () => contextSubmenuCloseScheduler.schedule(group, () => closeContextSubmenu(group)));
      group.addEventListener('focusin', keepSubmenuOpen);
      group.addEventListener('focusout', (event) => {
        if (!group.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) {
          closeContextSubmenu(group);
        }
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openContextSubmenu(group);
          submenu.querySelector<HTMLElement>('.context-menu-item')?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeContextMenu();
        }
      });

      group.appendChild(button);
      group.appendChild(submenu);
      contextMenu.appendChild(group);
    }

    function openContextSubmenu(group: HTMLElement) {
      contextSubmenuCloseScheduler.cancel(group);
      closeContextSubmenus(group);
      group.classList.add('open');
      const trigger = group.querySelector('.context-submenu-trigger');
      const submenu = group.querySelector<HTMLElement>('.context-submenu');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'true');
      }
      if (submenu) {
        placeContextSubmenu(group, submenu);
      }
    }

    function closeContextSubmenus(exceptGroup: HTMLElement | null = null) {
      for (const group of Array.from(contextMenu.querySelectorAll<HTMLElement>('.context-menu-submenu.open'))) {
        if (group === exceptGroup) {
          continue;
        }
        closeContextSubmenu(group);
      }
    }

    function closeContextSubmenu(group: HTMLElement) {
      contextSubmenuCloseScheduler.cancel(group);
      group.classList.remove('open');
      const trigger = group.querySelector('.context-submenu-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    }

    function placeContextSubmenu(group: HTMLElement, submenu: HTMLElement) {
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
      const placement = calculateRevisionGraphWebviewContextSubmenuPlacement({
        anchorLeft: anchorRect.left, anchorRight: anchorRect.right, anchorTop: anchorRect.top,
        submenuWidth: width, submenuHeight: height,
        viewportWidth: window.innerWidth || 1024,
        viewportHeight: window.innerHeight || 768
      });
      submenu.style.left = placement.left + 'px';
      submenu.style.top = placement.top + 'px';
    }

    function appendMenuItem(label: string, onClick: () => void, options: RevisionGraphWebviewMenuItemOptions = {}) {
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

    const flowAiTextInteractions = createRevisionGraphWebviewFlowAiTextInteractions((message) => vscode.postMessage(message));
    const flowBranchDialogController = createRevisionGraphWebviewFlowBranchDialogController({
      closeContextMenu,
      submit: (target, branchKind, name, description) => {
        vscode.postMessage(createRevisionGraphStartFlowBranchMessage(target, branchKind, name, description));
      },
      ...flowAiTextInteractions.releaseDependencies
    });
    function showFlowBranchForm(target: RevisionGraphWebviewTarget, branchKind: RevisionGraphWebviewFlowBranchKind) {
      flowBranchDialogController.show(target, branchKind);
    }

    function getFlowPullRequestTargets(sourceRefName: string): RevisionGraphWebviewFlowPullRequestTarget[] {
      if (!currentFlowGovernance || !Array.isArray(currentFlowGovernance.pullRequestTargets)) {
        return [];
      }
      return currentFlowGovernance.pullRequestTargets.filter((target) =>
        target && target.sourceRefName === sourceRefName
      );
    }

    const flowPullRequestDialogController = createRevisionGraphWebviewFlowPullRequestDialogController({
      closeContextMenu,
      getTargets: getFlowPullRequestTargets,
      requestContext: postCopyFlowPullRequestContext,
      ...flowAiTextInteractions.pullRequestDependencies,
      renderCopyIcon: renderCopyHashIcon
    });

    function openFlowPullRequestContextForm(target: RevisionGraphWebviewTarget) {
      flowPullRequestDialogController.open(target);
    }

    function showFlowPullRequestContextForm(context: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-pr-context' }>) {
      flowPullRequestDialogController.showContext(context);
    }

    function getFlowEqualizationOrigins(targetRefName: string): string[] {
      return getRevisionGraphWebviewFlowEqualizationOrigins(
        isFlowGovernanceActive(),
        currentFlowGovernance?.references,
        targetRefName
      );
    }

    const flowEqualizationDialogController = createRevisionGraphWebviewFlowEqualizationDialogController({
      closeContextMenu,
      getOrigins: getFlowEqualizationOrigins,
      prepare: postPrepareFlowEqualization
    });

    function showFlowEqualizationForm(target: RevisionGraphWebviewTarget) {
      flowEqualizationDialogController.show(target);
    }

    function escapeHtml(value: unknown): string {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function placeContextMenu(clientX: number, clientY: number) {
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
      contextSubmenuCloseScheduler.cancel();
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
      if (syncRevisionGraphWebviewMinimapPreferenceUi(showMinimapToggle, graphMinimap, minimapEnabled)) {
        minimapDragState = null;
      }
      syncViewOptionsButton();
    }

    function setMinimapEnabled(enabled: boolean) {
      minimapEnabled = !!enabled;
      persistWebviewUiState();
      syncMinimapPreference();
      if (minimapEnabled) {
        syncMinimap('full');
      }
      syncToolbarActions();
    }

    function updateFlowGovernanceOptions(options: RevisionGraphWebviewFlowGovernanceOptions) {
      if (!hasFlowGovernanceState()) {
        return;
      }
      vscode.postMessage(createRevisionGraphFlowGovernanceOptionsMessage(options));
    }

    function postPrepareFlowEqualization(targetRefName: string, originRefName: string, description: string) {
      postMessageWithLoading(
        createRevisionGraphPrepareFlowEqualizationMessage(targetRefName, originRefName, description),
        'Preparing equalization...'
      );
    }

    function postCopyFlowPullRequestContext(sourceRefName: string, targetRefName: string) {
      vscode.postMessage(createRevisionGraphCopyFlowPullRequestContextMessage(sourceRefName, targetRefName));
    }

    function getFlowProductionBranchName() {
      if (!isFlowGovernanceActive() || !currentFlowGovernance || !Array.isArray(currentFlowGovernance.references)) {
        return null;
      }
      const production = currentFlowGovernance.references.find((ref) => ref && ref.kind === 'main');
      return production ? production.refName : null;
    }

    function persistWebviewUiState() {
      persistRevisionGraphMinimapPreference(vscode, minimapEnabled);
    }

    function postCompareSelected(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCompareSelectedMessage(base, compare));
    }

    function postShowLogRange(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphShowLogRangeMessage(base, compare));
    }

    function postUnifiedDiff(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphUnifiedDiffMessage(base, compare));
    }

    function getFocusRangeActionLabel(
      base: RevisionGraphWebviewTarget,
      compare: RevisionGraphWebviewTarget,
      activeRange = currentProjectionOptions.revisionRange
    ) {
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

    function postFocusRange(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget) {
      postMessageWithLoading(
        createRevisionGraphFocusRangeMessage(base, compare),
        currentProjectionOptions.revisionRange
          ? 'Updating Focus Range...'
          : 'Focusing selected range...',
        null,
        'subtle'
      );
    }

    function getFocusDescendantsActionLabel(
      target: RevisionGraphWebviewTarget,
      activeFocus = currentProjectionOptions.descendantFocus
    ) {
      if (!activeFocus) {
        return 'Focus Descendants';
      }
      if (activeFocus.anchorRevision === target.hash) {
        return null;
      }
      return 'Update Focus Descendants';
    }

    function postFocusDescendants(target: RevisionGraphWebviewTarget) {
      postMessageWithLoading(
        createRevisionGraphFocusDescendantsMessage(target),
        currentProjectionOptions.descendantFocus
          ? 'Updating Focus Descendants...'
          : 'Focusing descendants...',
        null,
        'subtle'
      );
    }

    function postShowLogTarget(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphShowLogTargetMessage(target));
    }

    function postCompareWithWorktree(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCompareWithWorktreeMessage(target));
    }

    function postCopyCommitHash(commitHash: string) {
      vscode.postMessage(createRevisionGraphCopyCommitHashMessage(commitHash));
    }

    function postCopyRefName(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCopyRefNameMessage(target));
    }

    function postCheckout(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCheckoutMessage(target));
    }

    function postResetToCommit(target: RevisionGraphWebviewTarget) {
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

    function postStashSave() {
      postMessageWithLoading(createRevisionGraphStashSaveMessage(), 'Saving workspace changes to stash...');
    }

    function postStashApply(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphStashApplyMessage(target));
    }

    function postStashPop(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphStashPopMessage(target));
    }

    function postStashDrop(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphStashDropMessage(target));
    }

    function postPublishBranch(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphPublishBranchMessage(target));
    }

    function postCreateBranch(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCreateBranchMessage(target));
    }

    function postCreateTag(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphCreateTagMessage(target));
    }

    function retryRemoteTagState(target: RevisionGraphWebviewTarget) {
      if (!target || target.kind !== 'tag') {
        return;
      }

      remoteTagPublicationState.delete(target.name);
      requestRemoteTagState(target);
    }

    function requestRemoteTagState(target: RevisionGraphWebviewTarget) {
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

    function postPushTag(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphPushTagMessage(target));
    }

    function postDeleteRemoteTag(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphDeleteRemoteTagMessage(target));
    }

    function postDelete(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphDeleteMessage(target));
    }

    function postMerge(target: RevisionGraphWebviewTarget) {
      vscode.postMessage(createRevisionGraphMergeMessage(target));
    }

    function postAbortMerge() {
      postMessageWithLoading(createRevisionGraphAbortMergeMessage(), 'Aborting merge...');
    }

    function syncToolbarActions() {
      const { canZoomIn, canZoomOut, canResetZoom } = getRevisionGraphWebviewZoomCapabilities(
        zoomLevels,
        currentZoom
      );
      const {
        canZoomIn: canZoomInMinimap,
        canZoomOut: canZoomOutMinimap,
        canResetZoom: canResetMinimapZoom
      } = getRevisionGraphWebviewZoomCapabilities(minimapZoomLevels, minimapZoom);
      const remoteActionState = getCurrentHeadRemoteActionState();
      const hasRepository = !!currentState?.repositoryPath && !currentState?.loading;
      syncRevisionGraphWebviewBasicToolbarUi(
        { scopeSelect, viewOptionsButton, reloadButton, reloadMenuButton, fetchAllButton },
        toolbarBusy,
        hasRepository
      );
      syncRevisionGraphWebviewRemoteToolbarUi(
        { pullButton, pushButton, pushMenuButton, syncButton },
        toolbarBusy,
        remoteActionState.canUseCurrentHeadRemote,
        remoteActionState.upstreamLabel
      );
      syncRevisionGraphWebviewViewOptionsToolbarUi(
        { showTagsToggle, showRemoteBranchesToggle, showStashesToggle, showMergeCommitsToggle, showMinimapToggle, flowGovernanceEnabledToggle, rangeFilterClearButton, descendantFilterClearButton },
        toolbarBusy,
        hasFlowGovernanceState()
      );
      syncRevisionGraphWebviewCenterHeadToolbarUi(centerHeadButton, toolbarBusy);
      syncRevisionGraphWebviewZoomToolbarUi(
        { zoomInButton, zoomOutButton, zoomResetButton, minimapZoomInButton, minimapZoomOutButton, minimapZoomResetButton },
        toolbarBusy, minimapEnabled, canZoomIn, canZoomOut, canResetZoom,
        canZoomInMinimap, canZoomOutMinimap, canResetMinimapZoom
      );
    }

    function setToolbarBusy(isBusy: boolean, pendingControl: HTMLElement | null = null) {
      toolbarBusy = isBusy;
      applyRevisionGraphWebviewToolbarBusyState([
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
      ], isBusy, pendingControl);
      syncToolbarActions();
      syncSearchUi();
    }

	    function postMessageWithLoading(
	      message: RevisionGraphWebviewMessage,
	      label: string,
	      pendingControl: HTMLElement | null = null,
	      mode: RevisionGraphWebviewLoadingMode = 'blocking'
	    ) {
	      if (toolbarBusy) {
	        return;
	      }
	      showLoading(label, pendingControl, mode);
      requestAnimationFrame(() => {
        vscode.postMessage(message);
	      });
	    }

	    function waitForNextFrame(): Promise<void> {
	      return new Promise<void>((resolve) => {
	        requestAnimationFrame(() => {
	          resolve();
	        });
	      });
	    }

	    async function runWithLoading(
	      label: string,
	      work: () => void | Promise<void>,
	      pendingControl: HTMLElement | null = null,
	      mode: RevisionGraphWebviewLoadingMode = 'blocking'
	    ) {
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

	    function showLoading(
	      label: string,
	      pendingControl: HTMLElement | null = null,
	      mode: RevisionGraphWebviewLoadingMode = 'blocking'
	    ) {
      showRevisionGraphWebviewLoading(
        {
	          body: document.body as HTMLBodyElement,
          overlay: loadingOverlay,
          message: loadingMessage
        },
        label,
        mode
      );
      setToolbarBusy(true, pendingControl);
      closeViewOptionsMenu();
      closeContextMenu();
    }

    function hideLoading() {
      hideRevisionGraphWebviewLoading({
	        body: document.body as HTMLBodyElement,
        overlay: loadingOverlay,
        message: loadingMessage
      });
      setToolbarBusy(false);
    }

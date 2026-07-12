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
      syncRevisionGraphWebviewSelectionHighlightsUi(
        document.querySelectorAll('[data-ref-id]'),
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

      searchResultHashes = getRevisionGraphWebviewSearchResultHashes(
        currentState.scene.nodes,
        normalizedQuery,
        (hash, reference) => isReferenceVisible({
          id: createReferenceId(hash, reference.kind, reference.name),
          hash,
          name: reference.name,
          kind: reference.kind
        })
      );

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

    function setActiveSearchResultIndex(nextIndex, focusActive) {
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
          { label: 'Start New Bug', onClick: () => showFlowBranchForm(target, 'bug') },
          { label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) },
          { label: 'Promotion PR Context', onClick: () => openFlowPullRequestContextForm(target) }
        );
      } else if (flowBranch.kind === 'release') {
        const productionBranchName = getFlowProductionBranchName();
        entries.push({ label: 'Start New Bug', onClick: () => showFlowBranchForm(target, 'bug') });
        entries.push({ label: 'Prepare Equalization', onClick: () => showFlowEqualizationForm(target) });
        if (productionBranchName) {
          entries.push(
            { label: 'Promotion PR Context', onClick: () => postCopyFlowPullRequestContext(target.name, productionBranchName) }
          );
        }
      } else if (flowBranch.kind === 'hotfix') {
        const productionBranchName = getFlowProductionBranchName();
        if (productionBranchName) {
          entries.push(
            { label: 'Promotion PR Context', onClick: () => postCopyFlowPullRequestContext(target.name, productionBranchName) }
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

    function openFlowPullRequestContextForm(target) {
      closeContextMenu();
      const dialog = ensureFlowPullRequestContextDialog();
      dialog.sourceRefName = target.name;
      dialog.targetSelect.textContent = '';
      const targets = getFlowPullRequestTargets(target.name);
      dialog.targetLabel.hidden = targets.length <= 1;
      for (const candidate of targets) {
        const option = document.createElement('option');
        option.value = candidate.targetRefName;
        option.textContent = candidate.targetRefName;
        dialog.targetSelect.appendChild(option);
      }
      dialog.backdrop.hidden = false;
      document.body.classList.add('flow-dialog-open');
      applyFlowPullRequestTargetSelection();
      window.setTimeout(() => (dialog.targetLabel.hidden ? dialog.closeButton : dialog.targetSelect).focus(), 0);
    }

    function showFlowPullRequestContextForm(context) {
      const dialog = ensureFlowPullRequestContextDialog();
      if (!dialog.backdrop.hidden && (
        dialog.sourceRefName !== context.sourceRefName || dialog.targetRefName !== context.targetRefName
      )) {
        return;
      }
      if (dialog.backdrop.hidden) {
        dialog.sourceRefName = context.sourceRefName;
        dialog.targetRefName = context.targetRefName;
        dialog.targetSelect.textContent = '';
        const option = document.createElement('option');
        option.value = context.targetRefName;
        option.textContent = context.targetRefName;
        dialog.targetSelect.appendChild(option);
        dialog.targetLabel.hidden = true;
        dialog.flow.textContent = context.sourceRefName + ' -> ' + context.targetRefName;
        dialog.backdrop.hidden = false;
        document.body.classList.add('flow-dialog-open');
      }
      dialog.titleInput.value = context.title;
      dialog.descriptionInput.value = context.description;
      setFlowPullRequestContextActionsEnabled(true);
    }

    function ensureFlowPullRequestContextDialog() {
      let backdrop = document.getElementById('flowPullRequestContextDialog');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'flowPullRequestContextDialog';
        backdrop.className = 'flow-dialog-backdrop';
        backdrop.hidden = true;

        const dialog = document.createElement('div');
        dialog.className = 'flow-dialog flow-pr-context-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'flowPullRequestContextDialogTitle');

        const heading = document.createElement('h2');
        heading.id = 'flowPullRequestContextDialogTitle';
        heading.className = 'flow-dialog-title';
        heading.textContent = 'Promotion Pull Request Context';
        dialog.appendChild(heading);

        const introduction = document.createElement('p');
        introduction.className = 'flow-dialog-description';
        introduction.textContent = 'Review the generated context and copy each field into your Pull Request.';
        dialog.appendChild(introduction);

        const flowField = document.createElement('div');
        flowField.className = 'flow-form-field';
        const flowLabel = document.createElement('span');
        flowLabel.className = 'flow-form-label';
        flowLabel.textContent = 'Flow';
        const flow = document.createElement('div');
        flow.className = 'flow-pr-context-flow';
        flowField.appendChild(flowLabel);
        flowField.appendChild(flow);
        dialog.appendChild(flowField);

        const targetLabel = document.createElement('label');
        targetLabel.className = 'flow-form-field';
        targetLabel.setAttribute('for', 'flowPullRequestTargetSelect');
        const targetText = document.createElement('span');
        targetText.className = 'flow-form-label';
        targetText.textContent = 'Target release';
        const targetSelect = document.createElement('select');
        targetSelect.id = 'flowPullRequestTargetSelect';
        targetSelect.className = 'flow-form-input';
        targetLabel.appendChild(targetText);
        targetLabel.appendChild(targetSelect);
        dialog.insertBefore(targetLabel, flowField);

        const titleField = createFlowPullRequestContextField('Title', 'flowPullRequestTitleInput', false);
        const descriptionField = createFlowPullRequestContextField('Description', 'flowPullRequestDescriptionInput', true);
        dialog.appendChild(titleField.container);
        dialog.appendChild(descriptionField.container);

        const warning = document.createElement('div');
        warning.className = 'flow-pr-context-warning';
        warning.setAttribute('role', 'alert');
        warning.hidden = true;
        dialog.appendChild(warning);

        const actions = document.createElement('div');
        actions.className = 'flow-dialog-actions';
        const closeButton = document.createElement('button');
        closeButton.className = 'flow-dialog-button';
        closeButton.type = 'button';
        closeButton.textContent = 'Close';
        const openButton = document.createElement('button');
        openButton.className = 'flow-dialog-button primary';
        openButton.type = 'button';
        openButton.textContent = 'Open Pull Request on GitHub';
        actions.appendChild(closeButton);
        actions.appendChild(openButton);
        dialog.appendChild(actions);

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        titleField.copyButton.addEventListener('click', () => copyFlowPullRequestContextField('title'));
        descriptionField.copyButton.addEventListener('click', () => copyFlowPullRequestContextField('description'));
        targetSelect.addEventListener('change', applyFlowPullRequestTargetSelection);
        openButton.addEventListener('click', () => {
          const current = ensureFlowPullRequestContextDialog();
          if (current.sourceRefName && current.targetRefName) {
            postOpenFlowPullRequestUrl(current.sourceRefName, current.targetRefName);
          }
        });
        closeButton.addEventListener('click', closeFlowPullRequestContextDialog);
        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) {
            closeFlowPullRequestContextDialog();
          }
        });
        dialog.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeFlowPullRequestContextDialog();
          }
        });
      }

      return {
        backdrop,
        flow: backdrop.querySelector('.flow-pr-context-flow'),
        targetLabel: backdrop.querySelector('[for="flowPullRequestTargetSelect"]'),
        targetSelect: backdrop.querySelector('#flowPullRequestTargetSelect'),
        titleInput: backdrop.querySelector('#flowPullRequestTitleInput'),
        descriptionInput: backdrop.querySelector('#flowPullRequestDescriptionInput'),
        titleCopyButton: backdrop.querySelector('[aria-label="Copy Title"]'),
        descriptionCopyButton: backdrop.querySelector('[aria-label="Copy Description"]'),
        warning: backdrop.querySelector('.flow-pr-context-warning'),
        closeButton: backdrop.querySelector('.flow-dialog-button:not(.primary)'),
        openButton: backdrop.querySelector('.flow-dialog-button.primary'),
        get sourceRefName() { return backdrop.__flowPrSourceRefName || ''; },
        set sourceRefName(value) { backdrop.__flowPrSourceRefName = value; },
        get targetRefName() { return backdrop.__flowPrTargetRefName || ''; },
        set targetRefName(value) { backdrop.__flowPrTargetRefName = value; }
      };
    }

    function applyFlowPullRequestTargetSelection() {
      const dialog = ensureFlowPullRequestContextDialog();
      const candidate = getFlowPullRequestTargets(dialog.sourceRefName).find((target) =>
        target.targetRefName === dialog.targetSelect.value
      ) || getFlowPullRequestTargets(dialog.sourceRefName)[0];
      dialog.targetRefName = candidate ? candidate.targetRefName : '';
      dialog.targetSelect.value = dialog.targetRefName;
      dialog.flow.textContent = dialog.targetRefName
        ? dialog.sourceRefName + ' -> ' + dialog.targetRefName
        : dialog.sourceRefName + ' -> no release available';
      dialog.titleInput.value = '';
      dialog.descriptionInput.value = '';

      if (!candidate) {
        setFlowPullRequestContextWarning('No release branch is available as a Pull Request target.');
        setFlowPullRequestContextActionsEnabled(false);
        return;
      }
      if (candidate.status === 'production-not-ancestor') {
        setFlowPullRequestContextWarning(
          'Production promotion aborted: production contains commits missing from this source branch. ' +
          'Synchronize or equalize and validate the source before opening the Pull Request.'
        );
        setFlowPullRequestContextActionsEnabled(false);
        return;
      }
      if (candidate.status === 'production-out-of-sync') {
        setFlowPullRequestContextWarning(
          'Production promotion aborted: the local production branch is not synchronized with its remote. ' +
          'Synchronize production, refresh the graph, and retry.'
        );
        setFlowPullRequestContextActionsEnabled(false);
        return;
      }
      if (candidate.status === 'not-ahead') {
        setFlowPullRequestContextWarning(
          dialog.sourceRefName + ' has no commits ahead of ' + dialog.targetRefName + '. Choose another release.'
        );
        setFlowPullRequestContextActionsEnabled(false);
        return;
      }
      if (candidate.status === 'unknown') {
        setFlowPullRequestContextWarning('Could not verify whether this branch is eligible for the selected Pull Request target.');
        setFlowPullRequestContextActionsEnabled(false);
        return;
      }

      setFlowPullRequestContextWarning('');
      setFlowPullRequestContextActionsEnabled(false);
      postCopyFlowPullRequestContext(dialog.sourceRefName, dialog.targetRefName);
    }

    function setFlowPullRequestContextWarning(message) {
      const warning = ensureFlowPullRequestContextDialog().warning;
      warning.textContent = message;
      warning.hidden = !message;
    }

    function setFlowPullRequestContextActionsEnabled(enabled) {
      const dialog = ensureFlowPullRequestContextDialog();
      dialog.titleCopyButton.disabled = !enabled;
      dialog.descriptionCopyButton.disabled = !enabled;
      dialog.openButton.disabled = !enabled;
    }

    function getFlowPullRequestTargets(sourceRefName) {
      if (!currentFlowGovernance || !Array.isArray(currentFlowGovernance.pullRequestTargets)) {
        return [];
      }
      return currentFlowGovernance.pullRequestTargets.filter((target) =>
        target && target.sourceRefName === sourceRefName
      );
    }

    function createFlowPullRequestContextField(labelText, inputId, multiline) {
      const container = document.createElement('div');
      container.className = 'flow-form-field';
      const label = document.createElement('label');
      label.className = 'flow-form-label';
      label.setAttribute('for', inputId);
      label.textContent = labelText;
      const row = document.createElement('div');
      row.className = 'flow-pr-context-copy-row';
      const input = document.createElement(multiline ? 'textarea' : 'input');
      input.id = inputId;
      input.className = 'flow-form-input' + (multiline ? ' flow-form-textarea' : '');
      input.readOnly = true;
      if (!multiline) {
        input.type = 'text';
      }
      const copyButton = document.createElement('button');
      copyButton.className = 'flow-pr-context-copy';
      copyButton.type = 'button';
      copyButton.title = 'Copy ' + labelText;
      copyButton.setAttribute('aria-label', 'Copy ' + labelText);
      copyButton.innerHTML = renderCopyHashIcon();
      row.appendChild(input);
      row.appendChild(copyButton);
      container.appendChild(label);
      container.appendChild(row);
      return { container, input, copyButton };
    }

    function copyFlowPullRequestContextField(field) {
      const dialog = ensureFlowPullRequestContextDialog();
      if (!dialog.sourceRefName || !dialog.targetRefName) {
        return;
      }
      vscode.postMessage(createRevisionGraphCopyFlowPullRequestContextFieldMessage(
        dialog.sourceRefName,
        dialog.targetRefName,
        field
      ));
    }

    function closeFlowPullRequestContextDialog() {
      const backdrop = document.getElementById('flowPullRequestContextDialog');
      if (!backdrop) {
        return;
      }
      backdrop.hidden = true;
      backdrop.__flowPrSourceRefName = '';
      backdrop.__flowPrTargetRefName = '';
      document.body.classList.remove('flow-dialog-open');
    }

    function showFlowEqualizationForm(target) {
      closeContextMenu();
      const dialog = ensureFlowEqualizationDialog();
      dialog.target = target;
      dialog.originSelect.textContent = '';
      const origins = getFlowEqualizationOrigins(target.name);
      if (origins.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No eligible origin branches';
        option.disabled = true;
        option.selected = true;
        dialog.originSelect.appendChild(option);
      } else {
        for (const origin of origins) {
          const option = document.createElement('option');
          option.value = origin;
          option.textContent = origin;
          dialog.originSelect.appendChild(option);
        }
      }
      dialog.descriptionInput.value = '';
      setFlowEqualizationDialogError(dialog, '');
      dialog.backdrop.hidden = false;
      document.body.classList.add('flow-dialog-open');
      window.setTimeout(() => dialog.originSelect.focus(), 0);
    }

    function ensureFlowEqualizationDialog() {
      let backdrop = document.getElementById('flowEqualizationDialog');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'flowEqualizationDialog';
        backdrop.className = 'flow-dialog-backdrop';
        backdrop.hidden = true;

        const form = document.createElement('form');
        form.className = 'flow-dialog';
        form.setAttribute('role', 'dialog');
        form.setAttribute('aria-modal', 'true');
        form.setAttribute('aria-labelledby', 'flowEqualizationDialogTitle');

        const title = document.createElement('h2');
        title.id = 'flowEqualizationDialogTitle';
        title.className = 'flow-dialog-title';
        title.textContent = 'Prepare Equalization';
        form.appendChild(title);

        const originLabel = document.createElement('label');
        originLabel.className = 'flow-form-field';
        originLabel.setAttribute('for', 'flowEqualizationOriginInput');
        const originText = document.createElement('span');
        originText.className = 'flow-form-label';
        originText.textContent = 'Origin branch *';
        const originSelect = document.createElement('select');
        originSelect.id = 'flowEqualizationOriginInput';
        originSelect.className = 'flow-form-input';
        originSelect.required = true;
        originSelect.setAttribute('aria-required', 'true');
        originLabel.appendChild(originText);
        originLabel.appendChild(originSelect);
        form.appendChild(originLabel);

        const descriptionLabel = document.createElement('label');
        descriptionLabel.className = 'flow-form-field';
        descriptionLabel.setAttribute('for', 'flowEqualizationDescriptionInput');
        const descriptionText = document.createElement('span');
        descriptionText.className = 'flow-form-label';
        descriptionText.textContent = 'Description *';
        const descriptionInput = document.createElement('textarea');
        descriptionInput.id = 'flowEqualizationDescriptionInput';
        descriptionInput.className = 'flow-form-input flow-form-textarea';
        descriptionInput.required = true;
        descriptionInput.setAttribute('aria-required', 'true');
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
        submitButton.textContent = 'Prepare Equalization';
        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        backdrop.appendChild(form);
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', (event) => {
          if (event.target === backdrop) {
            closeFlowEqualizationDialog();
          }
        });
        cancelButton.addEventListener('click', closeFlowEqualizationDialog);
        form.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeFlowEqualizationDialog();
          }
        });
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const dialog = ensureFlowEqualizationDialog();
          const originRefName = dialog.originSelect.value;
          const description = dialog.descriptionInput.value.trim();
          if (!originRefName) {
            setFlowEqualizationDialogError(dialog, 'Origin branch is required.');
            dialog.originSelect.focus();
            return;
          }
          if (!description) {
            setFlowEqualizationDialogError(dialog, 'Description is required.');
            dialog.descriptionInput.focus();
            return;
          }
          const target = dialog.target;
          if (!target) {
            closeFlowEqualizationDialog();
            return;
          }

          closeFlowEqualizationDialog();
          postPrepareFlowEqualization(target.name, originRefName, description);
        });
      }

      return {
        backdrop,
        originSelect: backdrop.querySelector('#flowEqualizationOriginInput'),
        descriptionInput: backdrop.querySelector('#flowEqualizationDescriptionInput'),
        error: backdrop.querySelector('.flow-form-error'),
        get target() {
          return backdrop.__flowEqualizationTarget || null;
        },
        set target(value) {
          backdrop.__flowEqualizationTarget = value;
        }
      };
    }

    function closeFlowEqualizationDialog() {
      const backdrop = document.getElementById('flowEqualizationDialog');
      if (!backdrop) {
        return;
      }
      backdrop.hidden = true;
      backdrop.__flowEqualizationTarget = null;
      document.body.classList.remove('flow-dialog-open');
    }

    function setFlowEqualizationDialogError(dialog, message) {
      dialog.error.textContent = message;
      dialog.error.hidden = !message;
    }

    function getFlowEqualizationOrigins(targetRefName) {
      if (!isFlowGovernanceActive() || !currentFlowGovernance || !Array.isArray(currentFlowGovernance.references)) {
        return [];
      }

      const originsByName = new Map();
      for (const reference of currentFlowGovernance.references) {
        if (
          reference
          && reference.refName !== targetRefName
          && (reference.kind === 'main' || reference.kind === 'release')
        ) {
          originsByName.set(reference.refName, reference.kind);
        }
      }
      return [...originsByName.entries()]
        .sort(([leftName, leftKind], [rightName, rightKind]) => {
          if (leftKind !== rightKind) {
            return leftKind === 'main' ? -1 : 1;
          }
          return leftName.localeCompare(rightName);
        })
        .map(([refName]) => refName);
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

    function postPrepareFlowEqualization(targetRefName, originRefName, description) {
      postMessageWithLoading(
        createRevisionGraphPrepareFlowEqualizationMessage(targetRefName, originRefName, description),
        'Preparing equalization...'
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
      persistRevisionGraphMinimapPreference(vscode, minimapEnabled);
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
      showRevisionGraphWebviewLoading(
        {
          body: document.body,
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
        body: document.body,
        overlay: loadingOverlay,
        message: loadingMessage
      });
      setToolbarBusy(false);
    }

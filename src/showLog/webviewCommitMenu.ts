export function renderShowLogCommitMenuScript(): string {
  return `    function handleContextMenu(commitHash, clientX, clientY) {
      const compareSelection = getCompareSelectionForCommit(commitHash);
      const commit = findCommitByHash(commitHash);
      const copyReferenceNameMenu = renderCopyReferenceNameMenu(commit);
      const cherryPickCommitHashes = getCherryPickCommitHashes(commitHash);
      const formatPatchMenu = '<button class="context-menu-item" type="button" data-menu-action="formatPatch"'
        + (cherryPickCommitHashes.some(hash => findCommitByHash(hash)?.isMerge)
          ? ' disabled title="Merge commits cannot be exported with Format Patch"' : '') + '>Format Patch…</button>';
      contextMenuState = {
        kind: 'commit',
        commitHash, sourceToken: getCurrentSourceToken(),
        commitHashes: cherryPickCommitHashes,
        baseCommitHash: compareSelection?.baseCommitHash,
        compareCommitHash: compareSelection?.compareCommitHash
      };
      if (!contextMenu) {
        return;
      }
      if (compareSelection) {
        contextMenu.innerHTML = ''
          + '<button class="context-menu-item" type="button" data-menu-action="compareCommits">Compare</button>'
          + '<button class="context-menu-item" type="button" data-menu-action="cherryPickCommits">Cherry Pick</button>'
          + formatPatchMenu
          + copyReferenceNameMenu;
        showContextMenuAt(clientX, clientY);
        return;
      }
      if (isMultiSelectedContext(commitHash)) {
        contextMenu.innerHTML = '<button class="context-menu-item" type="button" data-menu-action="cherryPickCommits">Cherry Pick</button>' + formatPatchMenu;
        showContextMenuAt(clientX, clientY);
        return;
      }
      contextMenu.innerHTML = ''
        + '<button class="context-menu-item" type="button" data-menu-action="compareCommitWithWorktree">Compare with Worktree</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="openCommitDetails">Open Commit Details</button>'
        + formatPatchMenu
        + '<button class="context-menu-item" type="button" data-menu-action="startBugBisect">Find Bug Against HEAD…</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="checkoutCommit">Checkout to this</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="createTagFromCommit">Create Tag</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="cherryPickCommits">Cherry Pick</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="resetToCommit">Reset to this</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="copyCommitHash">Copy Hash</button>'
        + copyReferenceNameMenu;
      showContextMenuAt(clientX, clientY);
    }

`;
}

export function renderShowLogFileMenuScript(): string {
  return `    function openFileContextMenu(commitHash, changeId, clientX, clientY) {
      contextMenuState = { kind: 'file', commitHash, changeId };
      if (!contextMenu) {
        return;
      }
      const commit = currentState.commits.find(item => item.hash === commitHash);
      const file = commit?.changes.find(item => item.id === changeId);
      contextMenu.innerHTML = (file?.fileOpenActions || []).map(renderFileOpenButton).join('')
        + '<button class="context-menu-item" type="button" data-menu-action="openFile">Compare</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="compareWithWorktree">Compare with Worktree</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="revertFileToCommit">Revert to this</button>'
        + '<div class="context-menu-group">'
        + '  <div class="context-menu-parent context-menu-item" tabindex="0" role="button" aria-haspopup="menu" aria-label="Copy to Clipboard">'
        + '    <span>Copy to Clipboard</span>'
        + '    <span class="context-menu-chevron">›</span>'
        + '  </div>'
        + '  <div class="context-submenu" role="menu" aria-label="Copy to Clipboard">'
        + '    <button class="context-menu-item" type="button" data-menu-action="copyFileName">File Name</button>'
        + '    <button class="context-menu-item" type="button" data-menu-action="copyFullPath">Full Path</button>'
        + '  </div>'
        + '</div>';
      showContextMenuAt(clientX, clientY);
    }

`;
}

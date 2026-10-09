export function renderShowLogFileSearchScript(): string {
  return `
    let commitFileFilters = {};
    let pendingCommitFileFilterFocus = null;
    let commitFileFilterTimer = 0;
    let pendingCommitFileFilterSend = null;

    function renderCommitFiles(commit) {
      if (commit.loadingChanges) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card">Loading changed files...</div></div></div>';
      }
      if (commit.changeError) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card error">' + escapeHtml(commit.changeError) + '</div></div></div>';
      }
      if (!commit.changes.length) {
        return ''
          + '<div class="commit-files"><div class="commit-files-list"><div class="status-card">No changed files found for this commit.</div></div></div>';
      }
      const filterText = getCommitFileFilter(commit.hash);
      const visibleChanges = getVisibleCommitFileChanges(commit);
      return ''
        + '<div class="commit-files">'
        + '  <div class="commit-files-list">'
        + renderCommitFileSearch(commit.hash, filterText)
        + renderCommitFileFilterStatus(commit)
        + (getCommitFileFilterStatus(commit) ? '' : visibleChanges.length > 0
          ? visibleChanges.map((change) => ''
          + '    <div class="file-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-change-id="' + escapeHtml(change.id) + '" aria-haspopup="menu" aria-label="' + escapeHtml(change.path + '. ' + change.status + '. Double-click to compare. Press Shift+F10 or Enter for actions.') + '">'
          + '      <span class="file-path">' + escapeHtml(change.path) + '</span>'
          + '      <span class="file-status">' + escapeHtml(change.status) + '</span>'
          + '    </div>'
          ).join('')
          : '    <div class="status-card">No files match the active filter.</div>')
        + '  </div>'
        + '</div>';
    }

    function renderCommitFileSearch(commitHash, filterText) {
      return ''
        + '    <div class="commit-file-search-row">'
        + '      <div class="commit-file-search-control">'
        + '        <input class="commit-file-search-input" type="text" value="' + escapeHtml(filterText) + '" placeholder="Filter files · change:" aria-label="Filter changed files" title="Filter paths/status or change:&quot;validateToken&quot; in added/removed lines. Combine with file:src/." autocomplete="off" autocapitalize="off" spellcheck="false" data-commit-file-filter="' + escapeHtml(commitHash) + '" />'
        + '        <button class="commit-file-search-clear" type="button" title="Clear filter" aria-label="Clear filter" data-commit-file-filter-clear="' + escapeHtml(commitHash) + '"' + (filterText ? '' : ' disabled') + '>×</button>'
        + '      </div>'
        + '    </div>';
    }

    function getVisibleCommitFileChanges(commit) {
      const filter = commit.fileFilter;
      if (!filter) return commit.changes;
      if (getCommitFileFilterStatus(commit)) return [];
      const visibleIds = new Set(filter.visibleChangeIds || []);
      return commit.changes.filter(change => visibleIds.has(change.id));
    }

    function getCommitFileFilter(commitHash) {
      if (Object.prototype.hasOwnProperty.call(commitFileFilters, commitHash)) return commitFileFilters[commitHash];
      const commit = (currentState && currentState.commits || []).find(item => item.hash === commitHash);
      return commit && commit.fileFilter && commit.fileFilter.text || '';
    }

    function setCommitFileFilter(commitHash, value) {
      const drafts = { ...commitFileFilters, [commitHash]: String(value || '') };
      commitFileFilters = Object.fromEntries(Object.entries(drafts).slice(-100));
      clearTimeout(commitFileFilterTimer);
      const sourceToken = getCurrentSourceToken();
      const send = () => {
        const commit = (currentState && currentState.commits || []).find(item => item.hash === commitHash && item.expanded);
        if (sourceToken === getCurrentSourceToken() && commit) {
          vscode.postMessage({ type: 'setCommitFileFilter', commitHash, value, sourceToken });
        }
      };
      pendingCommitFileFilterSend = send;
      if (!value) flushPendingCommitFileFilter();
      else commitFileFilterTimer = setTimeout(flushPendingCommitFileFilter, 200);
    }

    function flushPendingCommitFileFilter() {
      clearTimeout(commitFileFilterTimer);
      const send = pendingCommitFileFilterSend;
      pendingCommitFileFilterSend = null;
      if (send) send();
    }

    function getCommitFileFilterStatus(commit) {
      const filter = commit.fileFilter;
      if (!filter) return '';
      if (filter.text !== getCommitFileFilter(commit.hash) || filter.loading) return 'Searching changed files...';
      return filter.error || '';
    }

    function renderCommitFileFilterStatus(commit) {
      const status = getCommitFileFilterStatus(commit);
      if (!status) return '';
      const isError = commit.fileFilter && commit.fileFilter.error && commit.fileFilter.text === getCommitFileFilter(commit.hash);
      return '<div class="status-card' + (isError ? ' error' : '') + '" role="status">' + escapeHtml(status) + '</div>';
    }

    function resetCommitFileFilters() {
      clearTimeout(commitFileFilterTimer);
      pendingCommitFileFilterSend = null;
      commitFileFilters = {};
      pendingCommitFileFilterFocus = null;
    }

    function rememberCommitFileFilterFocus() {
      const input = document.activeElement;
      if (input instanceof HTMLInputElement && input.matches('[data-commit-file-filter]')) {
        pendingCommitFileFilterFocus = { commitHash: input.getAttribute('data-commit-file-filter'),
          selectionStart: input.selectionStart || 0, selectionEnd: input.selectionEnd || 0 };
      }
    }

    function restorePendingCommitFileFilterFocus() {
      if (!pendingCommitFileFilterFocus) {
        return;
      }

      const focusRequest = pendingCommitFileFilterFocus;
      pendingCommitFileFilterFocus = null;
      const input = Array.from(content.querySelectorAll('[data-commit-file-filter]'))
        .find((candidate) => candidate.getAttribute('data-commit-file-filter') === focusRequest.commitHash);
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      input.focus();
      const selectionStart = Math.min(focusRequest.selectionStart, input.value.length);
      const selectionEnd = Math.min(focusRequest.selectionEnd, input.value.length);
      input.setSelectionRange(selectionStart, selectionEnd);
    }

    content.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-commit-file-filter]')) {
        return;
      }

      const commitHash = target.getAttribute('data-commit-file-filter') || '';
      if (!commitHash) {
        return;
      }

      pendingCommitFileFilterFocus = {
        commitHash,
        selectionStart: target.selectionStart ?? target.value.length,
        selectionEnd: target.selectionEnd ?? target.value.length
      };
      setCommitFileFilter(commitHash, target.value);
      render();
    });

    content.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-commit-file-filter-clear]');
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const commitHash = target.getAttribute('data-commit-file-filter-clear') || '';
      if (!commitHash) {
        return;
      }

      pendingCommitFileFilterFocus = {
        commitHash,
        selectionStart: 0,
        selectionEnd: 0
      };
      setCommitFileFilter(commitHash, '');
      render();
    });

`;
}

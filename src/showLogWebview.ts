import {
  createWebviewContentSecurityPolicy,
  createWebviewNonce
} from './webviewSecurity';
import { renderShowLogWebviewStyles } from './showLog/webviewStyles';
import { renderWebviewDisplayHelpers } from './webviewDisplayHelpers';

export function renderShowLogWebviewHtml(): string {
  const nonce = createWebviewNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${createWebviewContentSecurityPolicy(nonce)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Show Log</title>
  <style>${renderShowLogWebviewStyles()}</style>
</head>
<body>
  <div class="shell">
    <div class="toolbar">
      <div class="toolbar-main">
        <div class="summary" id="summary"></div>
        <div class="summary-count" id="summaryCount"></div>
        <div class="filter-control">
          <input class="filter-input" id="filterInput" type="search" placeholder="Filter commits" aria-label="Filter commits" spellcheck="false" />
          <button class="filter-clear" id="filterClear" type="button" title="Clear filter" aria-label="Clear filter" hidden>×</button>
        </div>
        <label class="toolbar-toggle" id="showAllBranchesControl" hidden>
          <input type="checkbox" id="showAllBranchesToggle" />
          <span>Show All Branches</span>
        </label>
      </div>
      <div class="loading-chip" id="loadingChip" data-visible="false">Loading</div>
    </div>
    <div class="content" id="content"></div>
  </div>
  <div class="context-menu" id="contextMenu" hidden></div>
  <div class="commit-tooltip" id="commitTooltip" role="tooltip" hidden></div>
  <script nonce="${nonce}">
    ${renderWebviewDisplayHelpers()}
    const vscode = acquireVsCodeApi();
    const COMMIT_FILE_FILTERS_KEY = 'showLogCommitFileFilters';
    let currentState = null;
    let contextMenuState = null;
    const summary = document.getElementById('summary');
    const summaryCount = document.getElementById('summaryCount');
    const content = document.getElementById('content');
    const loadingChip = document.getElementById('loadingChip');
    const contextMenu = document.getElementById('contextMenu');
    const commitTooltip = document.getElementById('commitTooltip');
    const showAllBranchesControl = document.getElementById('showAllBranchesControl');
    const showAllBranchesToggle = document.getElementById('showAllBranchesToggle');
    const filterInput = document.getElementById('filterInput');
    const filterClear = document.getElementById('filterClear');
    const LANE_COLORS = ['#5bbaf9', '#d87cff', '#ffd24d', '#52d273', '#ff7db8', '#ff9b5e', '#8fd6c9'];
    const GRAPH_WIDTH_KEY = 'showLogGraphWidth';
    const MIN_GRAPH_WIDTH = 42;
    const GRAPH_LANE_SPACING = 10;
    const GRAPH_LEFT_INSET = 8;
    const GRAPH_RIGHT_PADDING = 6;
    const GRAPH_MAIN_HEIGHT = 34;
    const GRAPH_MAIN_META_HEIGHT = 42;
    const persistedUiState = vscode.getState() || {};
    let graphWidth = normalizeGraphWidth(persistedUiState[GRAPH_WIDTH_KEY]);
    let commitFileFilters = normalizeCommitFileFilters(persistedUiState[COMMIT_FILE_FILTERS_KEY]);
    let pendingCommitFileFilterFocus = null;
    let resizeState = null;
    let selectedCommitHashes = normalizeSelectedCommitHashes(
      persistedUiState.selectedCommitHashes || persistedUiState.selectedCommitHash
    );
    let loadMoreObserver = null;
    let filterDebounceTimer = 0;
    let tooltipCommitHash = '';
    let pendingTooltipCommitHash = '';
    let tooltipShowTimer = 0;
    let tooltipShowClientX = 0;
    let tooltipShowClientY = 0;
    let tooltipHideTimer = 0;

    applyGraphColumnWidth(graphWidth);

    function render() {
      if (!summary || !summaryCount || !content || !loadingChip) {
        return;
      }
      const state = currentState || {
        kind: 'hidden',
        loading: false,
        loadingMore: false,
        summary: '',
        summaryCount: '',
        showAllBranches: false,
        canToggleAllBranches: false,
        sourceToken: '',
        filterText: '',
        emptyMessage: 'Use Show Log from the graph context menu to load a commit stack or range here.',
        errorMessage: undefined,
        commits: [],
        hasMore: false
      };

      syncShowLogChrome(state);
      syncSelectedCommitHashes(state.commits || []);

      const sections = [];
      if (state.errorMessage) {
        sections.push('<div class="status-card error">' + escapeHtml(state.errorMessage) + '</div>');
      }
      if (state.commits.length === 0 && state.emptyMessage) {
        sections.push('<div class="empty-state">' + escapeHtml(state.emptyMessage) + '</div>');
      } else {
        sections.push(renderTableHeader());
        sections.push(renderCommitList(state.commits));
      }
      sections.push(renderLoadMore(state));
      hideCommitTooltip();
      content.innerHTML = sections.join('');
      syncLoadMoreObserver();
      restorePendingCommitFileFilterFocus();
    }

    function applyAppendPatch(patch) {
      if (!patch || !currentState || currentState.kind !== 'visible') {
        return false;
      }

      if (patch.sourceToken !== currentState.sourceToken) {
        return false;
      }

      const currentCommits = currentState.commits || [];
      if (currentCommits.length !== patch.previousCommitCount) {
        return false;
      }

      currentState = {
        ...currentState,
        summaryCount: patch.summaryCount || currentState.summaryCount,
        loadingMore: !!patch.loadingMore,
        errorMessage: patch.errorMessage,
        commits: currentCommits.concat(patch.commits || []),
        hasMore: !!patch.hasMore
      };
      if (!content || !summaryCount || !loadingChip || currentState.errorMessage) {
        render();
        return true;
      }

      syncShowLogChrome(currentState);
      const commitList = content.querySelector('.commit-list');
      if (!commitList) {
        render();
        return true;
      }

      const appendedMarkup = (patch.commits || [])
        .map((commit, index) => renderCommitEntry(commit, patch.previousCommitCount + index))
        .join('');
      if (appendedMarkup) {
        commitList.insertAdjacentHTML('beforeend', appendedMarkup);
      }
      syncLoadMoreBlock(currentState);
      syncLoadMoreObserver();
      restorePendingCommitFileFilterFocus();
      return true;
    }

    function syncShowLogChrome(state) {
      if (!summary || !summaryCount || !loadingChip) {
        return;
      }

      summary.textContent = state.summary || 'Show Log';
      summaryCount.textContent = state.summaryCount || '';
      loadingChip.dataset.visible = state.loading ? 'true' : 'false';
      loadingChip.textContent = 'Loading';

      if (filterInput instanceof HTMLInputElement) {
        const nextFilterText = state.filterText || '';
        if (filterInput.value !== nextFilterText) {
          filterInput.value = nextFilterText;
        }
        filterInput.disabled = state.kind !== 'visible';
      }

      if (filterClear instanceof HTMLButtonElement) {
        filterClear.hidden = !(state.filterText || '').trim();
        filterClear.disabled = state.kind !== 'visible';
      }

      if (showAllBranchesControl && showAllBranchesToggle instanceof HTMLInputElement) {
        showAllBranchesControl.hidden = !state.canToggleAllBranches;
        showAllBranchesToggle.checked = !!state.showAllBranches;
        showAllBranchesToggle.disabled = !!state.loading || !!state.loadingMore;
      }
    }

    function renderTableHeader() {
      return ''
        + '<div class="table-header">'
        + '  <div class="header-cell graph">'
        + '    <span class="graph-header-label">Graph</span>'
        + '    <div class="graph-resizer" id="graphResizer" role="separator" tabindex="0" aria-label="Resize graph column" aria-orientation="vertical"></div>'
        + '  </div>'
        + '  <div class="header-cell">Message</div>'
        + '  <div class="header-cell">Author</div>'
        + '  <div class="header-cell">Date</div>'
        + '</div>';
    }

    function renderCommitList(commits) {
      return ''
        + '<div class="commit-list">'
        + commits.map((commit, index) => renderCommitEntry(commit, index)).join('')
        + '</div>';
    }

    function renderCommitEntry(commit, index) {
      const canCompareSelection = selectedCommitHashes.length === 2;
      return ''
        + '<div class="commit-entry" data-selected="' + (selectedCommitHashes.includes(commit.hash) ? 'true' : 'false') + '" data-compare-base="' + (canCompareSelection && selectedCommitHashes[0] === commit.hash ? 'true' : 'false') + '" data-compare-target="' + (canCompareSelection && selectedCommitHashes[1] === commit.hash ? 'true' : 'false') + '" data-merge="' + (commit.isMerge ? 'true' : 'false') + '">'
        + renderCommit(commit, index)
        + '</div>';
    }

    function renderLoadMore(state) {
      if (!state.hasMore) {
        return '';
      }

      return ''
        + '<div class="load-more" aria-live="polite">'
        + (state.loadingMore ? 'Loading more commits...' : '')
        + '<div class="load-more-sentinel" id="loadMoreSentinel" aria-hidden="true"></div>'
        + '</div>';
    }

    function syncLoadMoreBlock(state) {
      const loadMore = content.querySelector('.load-more');
      const nextMarkup = renderLoadMore(state);
      if (loadMore) {
        if (nextMarkup) {
          loadMore.outerHTML = nextMarkup;
        } else {
          loadMore.remove();
        }
        return;
      }

      if (nextMarkup) {
        content.insertAdjacentHTML('beforeend', nextMarkup);
      }
    }

    function renderCommit(commit, index) {
      const mainGraphHeight = getMainGraphHeight(commit);
      const mainGraphHeightStyle = mainGraphHeight === GRAPH_MAIN_HEIGHT
        ? ''
        : ' style="--show-log-main-graph-height: ' + mainGraphHeight + 'px;"';
      return ''
        + '<div class="commit-row" tabindex="0" data-commit-hash="' + escapeHtml(commit.hash) + '" data-expanded="' + (commit.expanded ? 'true' : 'false') + '">'
        + '  <div class="graph-cell">'
        + '    <div class="graph-stack">'
        + '      <div class="graph-main"' + mainGraphHeightStyle + '>' + renderTopology(commit.topology, commit.isMerge, index === 0, mainGraphHeight) + '</div>'
        + (commit.expanded
          ? '      <div class="graph-continuation">' + renderContinuationRows(commit) + '</div>'
          : '')
        + '    </div>'
        + '  </div>'
        + '  <div class="subject-cell">'
        + '    <div class="subject-stack">'
        + '      <div class="subject-line">'
        + '        <span class="commit-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + '        <span class="commit-subject">' + escapeHtml(commit.subject) + '</span>'
        + '      </div>'
        + ((commit.refs.length > 0 || commit.stats)
          ? '      <div class="subject-meta">'
            + (commit.refs.length > 0
              ? '        <div class="refs">' + commit.refs.map(renderRefBadge).join('') + '</div>'
              : '')
            + (commit.stats ? '        <span class="stats">' + escapeHtml(commit.stats) + '</span>' : '')
            + '      </div>'
          : '')
        + '    </div>'
        + '  </div>'
        + '  <div class="author-cell">' + escapeHtml(commit.author) + '</div>'
        + '  <div class="date-cell">' + escapeHtml(formatWebviewShortDate(commit.date)) + '</div>'
        + (commit.expanded ? renderCommitFiles(commit) : '')
        + '</div>';
    }

    function renderRefBadge(ref) {
      return renderShowLogRefBadge(ref, true);
    }

    function renderTooltipRefBadge(ref) {
      return renderShowLogRefBadge(ref, false);
    }

    function renderShowLogRefBadge(ref, includeTitle) {
      const title = includeTitle ? ' title="' + escapeHtml(ref.name) + '"' : '';
      return '<span class="ref-badge" data-ref-kind="' + escapeHtml(ref.kind) + '"' + title + '>' +
        renderShowLogRefBadgeIcon(ref.kind) +
        '<span class="ref-badge-label">' + escapeHtml(ref.label) + '</span>' +
      '</span>';
    }

    function renderShowLogRefBadgeIcon(kind) {
      switch (kind) {
        case 'head':
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<circle cx="8" cy="8" r="5.3"></circle>' +
            '<circle cx="8" cy="8" r="1.8"></circle>' +
          '</svg>';
        case 'branch':
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<circle cx="5" cy="4" r="1.7"></circle>' +
            '<circle cx="11" cy="12" r="1.7"></circle>' +
            '<path d="M5 5.7v2.1a4.2 4.2 0 0 0 4.2 4.2H9.3"></path>' +
          '</svg>';
        case 'remote':
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<path d="M5.3 12.5h6.2a2.8 2.8 0 0 0 .5-5.6 4.1 4.1 0 0 0-7.7-1.4A3.2 3.2 0 0 0 5.3 12.5Z"></path>' +
          '</svg>';
        case 'tag':
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<path d="M2.8 3.5v4.1l5.6 5.6 4.4-4.4-5.6-5.3H2.8Z"></path>' +
            '<circle cx="5.2" cy="5.8" r="0.8"></circle>' +
          '</svg>';
        case 'stash':
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<path d="M3 5.2h10l-1.1 7H4.1L3 5.2Z"></path>' +
            '<path d="M5.1 5.2 6.2 3h3.6l1.1 2.2"></path>' +
          '</svg>';
        default:
          return '<svg class="ref-badge-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
            '<circle cx="8" cy="8" r="4.5"></circle>' +
          '</svg>';
      }
    }

    function renderTopology(topology, isMerge, isFirstVisible, height) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const centerY = 15;
      const topY = -2;
      const bottomY = height - 2;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        if (topology.mergeStartLanes.includes(lane)) {
          continue;
        }
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        const laneTopY = isFirstVisible && lane === topology.nodeLane ? centerY : topY;
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + laneTopY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      for (const lane of topology.secondaryParentLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const startX = laneX(topology.nodeLane, laneSpacing);
        const endX = laneX(lane, laneSpacing);
        const controlY = centerY + 4;
        const controlX = startX + ((endX - startX) * 0.58);
        lineParts.push(
          '<path class="graph-line" d="M ' + startX + ' ' + centerY
          + ' C ' + startX + ' ' + controlY + ', ' + controlX + ' ' + controlY + ', ' + endX + ' ' + bottomY
          + '" stroke="' + color + '" />'
        );
      }

      const nodeColor = getLaneColor(topology.colorByLane[topology.nodeLane]);
      const nodeX = laneX(topology.nodeLane, laneSpacing);
      if (isMerge) {
        lineParts.push('<circle class="graph-node-merge-ring" cx="' + nodeX + '" cy="' + centerY + '" r="5.1" stroke="' + nodeColor + '" />');
        lineParts.push('<circle class="graph-node-ring" cx="' + nodeX + '" cy="' + centerY + '" r="3.05" stroke="' + nodeColor + '" />');
        lineParts.push('<circle class="graph-node-merge-core" cx="' + nodeX + '" cy="' + centerY + '" r="1.85" fill="' + nodeColor + '" />');
      } else {
        lineParts.push('<circle class="graph-node-solid" cx="' + nodeX + '" cy="' + centerY + '" r="3.85" fill="' + nodeColor + '" stroke="' + nodeColor + '" />');
      }

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>';
    }

    function getMainGraphHeight(commit) {
      return commit.expanded && hasCommitMeta(commit) ? GRAPH_MAIN_META_HEIGHT : GRAPH_MAIN_HEIGHT;
    }

    function hasCommitMeta(commit) {
      return (commit.refs && commit.refs.length > 0) || !!commit.stats;
    }

    function renderContinuationTopology(topology) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const height = 28;
      const topY = -2;
      const bottomY = 26;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + topY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>';
    }

    function renderContinuationRows(commit) {
      if (commit.loadingChanges || commit.changeError || !commit.changes.length) {
        return '<div class="graph-continuation-row status"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>';
      }

      const searchContinuation = '<div class="graph-continuation-row search"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>';
      const visibleChanges = getVisibleCommitFileChanges(commit);
      if (visibleChanges.length === 0) {
        return searchContinuation
          + '<div class="graph-continuation-row status"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>';
      }

      return searchContinuation + visibleChanges.map(() =>
        '<div class="graph-continuation-row"><div class="commit-files-graph">' + renderContinuationTopology(commit.topology) + '</div></div>'
      ).join('');
    }

    function laneX(lane, laneSpacing) {
      return GRAPH_LEFT_INSET + lane * laneSpacing;
    }

    function getGraphContentWidth(laneCount, laneSpacing) {
      return GRAPH_LEFT_INSET + GRAPH_RIGHT_PADDING + (Math.max(laneCount - 1, 0) * laneSpacing) + 8;
    }

    function getLaneColor(colorIndex) {
      return LANE_COLORS[Math.abs(colorIndex || 0) % LANE_COLORS.length];
    }

    function normalizeGraphWidth(value) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return 64;
      }
      return Math.max(MIN_GRAPH_WIDTH, Math.round(numericValue));
    }

    function applyGraphColumnWidth(width) {
      graphWidth = normalizeGraphWidth(width);
      document.documentElement.style.setProperty('--show-log-graph-width', graphWidth + 'px');
    }

    function persistGraphColumnWidth() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        [GRAPH_WIDTH_KEY]: graphWidth,
        [COMMIT_FILE_FILTERS_KEY]: commitFileFilters,
        selectedCommitHashes
      });
    }

    function persistUiState() {
      const existingState = vscode.getState() || {};
      vscode.setState({
        ...existingState,
        [GRAPH_WIDTH_KEY]: graphWidth,
        [COMMIT_FILE_FILTERS_KEY]: commitFileFilters,
        selectedCommitHashes
      });
    }

    function startGraphResize(clientX) {
      resizeState = {
        startX: clientX,
        startWidth: graphWidth
      };
      document.body.dataset.resizingGraph = 'true';
    }

    function updateGraphResize(clientX) {
      if (!resizeState) {
        return;
      }
      applyGraphColumnWidth(resizeState.startWidth + (clientX - resizeState.startX));
    }

    function stopGraphResize() {
      if (!resizeState) {
        return;
      }
      resizeState = null;
      delete document.body.dataset.resizingGraph;
      persistGraphColumnWidth();
    }

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
        + (visibleChanges.length > 0
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
        + '        <input class="commit-file-search-input" type="text" value="' + escapeHtml(filterText) + '" placeholder="Filter files..." aria-label="Filter changed files" autocomplete="off" autocapitalize="off" spellcheck="false" data-commit-file-filter="' + escapeHtml(commitHash) + '" />'
        + '        <button class="commit-file-search-clear" type="button" title="Clear filter" aria-label="Clear filter" data-commit-file-filter-clear="' + escapeHtml(commitHash) + '"' + (filterText ? '' : ' disabled') + '>×</button>'
        + '      </div>'
        + '    </div>';
    }

    function getVisibleCommitFileChanges(commit) {
      const filterText = normalizeCommitFileFilterText(getCommitFileFilter(commit.hash));
      if (!filterText) {
        return commit.changes;
      }

      return commit.changes.filter((change) => (
        String(change.path || '').toLowerCase().includes(filterText)
        || String(change.status || '').toLowerCase().includes(filterText)
      ));
    }

    function getCommitFileFilter(commitHash) {
      return commitFileFilters[commitHash] || '';
    }

    function setCommitFileFilter(commitHash, value) {
      const normalizedValue = String(value || '');
      if (normalizedValue.trim()) {
        commitFileFilters = {
          ...commitFileFilters,
          [commitHash]: normalizedValue
        };
      } else {
        const nextFilters = { ...commitFileFilters };
        delete nextFilters[commitHash];
        commitFileFilters = nextFilters;
      }
      persistUiState();
    }

    function normalizeCommitFileFilters(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
      }

      const entries = Object.entries(value)
        .filter(([commitHash, filterText]) => (
          typeof commitHash === 'string'
          && commitHash.length > 0
          && typeof filterText === 'string'
          && filterText.trim().length > 0
        ))
        .slice(-100);
      return Object.fromEntries(entries);
    }

    function normalizeCommitFileFilterText(value) {
      return String(value || '').trim().toLowerCase();
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

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderCommitTooltip(commit) {
      const coAuthors = parseCoAuthors(commit.message);
      const body = getTooltipBody(commit.message, commit.subject);
      const refs = commit.refs && commit.refs.length
        ? '<div class="commit-tooltip-refs">' + commit.refs.map(renderTooltipRefBadge).join('') + '</div>'
        : '';
      const stats = renderTooltipStats(commit.stats);
      return ''
        + '<div class="commit-tooltip-header">'
        + '  <span class="commit-tooltip-avatar">' + escapeHtml(getAuthorInitials(commit.author)) + '</span>'
        + '  <div class="commit-tooltip-author-line">'
        + '    <span class="commit-tooltip-author">' + escapeHtml(commit.author || 'Unknown author') + '</span>'
        + '    <span class="commit-tooltip-muted">committed on ' + escapeHtml(formatWebviewTooltipDate(commit.date, 'unknown date')) + '</span>'
        + '  </div>'
        + '</div>'
        + refs
        + '<p class="commit-tooltip-subject">' + escapeHtml(commit.subject) + '</p>'
        + (body ? '<p class="commit-tooltip-body">' + escapeHtml(body) + '</p>' : '')
        + coAuthors.map((coAuthor) => '<p class="commit-tooltip-coauthor">' + escapeHtml(coAuthor.name) + ' <span class="commit-tooltip-muted">(Co-author)</span><br><span class="commit-tooltip-muted">' + escapeHtml(coAuthor.email) + '</span></p>').join('')
        + stats
        + '<div class="commit-tooltip-footer">'
        + '  <span class="commit-tooltip-hash">' + escapeHtml(commit.shortHash) + '</span>'
        + renderCopyHashIconButton('commit-tooltip-action commit-tooltip-action-icon', 'data-tooltip-action', 'copyCommitHash', commit.hash)
        + '  <button class="commit-tooltip-action" type="button" data-tooltip-action="openCommitOnGitHub" data-commit-hash="' + escapeHtml(commit.hash) + '">Open on GitHub</button>'
        + '</div>';
    }

    function renderTooltipStats(stats) {
      const parsed = parseTooltipStats(stats);
      if (!parsed) {
        return '';
      }
      const fileLabel = parsed.files === 1 ? 'file' : 'files';
      const parts = [parsed.files + ' ' + fileLabel + ' changed'];
      if (parsed.insertions > 0) {
        parts.push('<span class="commit-tooltip-insertions">' + parsed.insertions + ' insertion(+)</span>');
      }
      if (parsed.deletions > 0) {
        parts.push('<span class="commit-tooltip-deletions">' + parsed.deletions + ' deletion(-)</span>');
      }
      return '<div class="commit-tooltip-stats">' + parts.join(', ') + '</div>';
    }

    function parseTooltipStats(stats) {
      if (!stats) {
        return null;
      }
      const files = Number(stats.match(/^(\\d+)\\s+files?/)?.[1] || 0);
      const insertions = Number(stats.match(/\\+(\\d+)/)?.[1] || 0);
      const deletions = Number(stats.match(/-(\\d+)/)?.[1] || 0);
      return files > 0 ? { files, insertions, deletions } : null;
    }

    function parseCoAuthors(message) {
      return String(message || '')
        .split('\\n')
        .map((line) => line.match(/^Co-authored-by:\\s*(.+?)\\s*<([^>]+)>\\s*$/i))
        .filter(Boolean)
        .map((match) => ({ name: match[1], email: match[2] }));
    }

    function getTooltipBody(message, subject) {
      const lines = String(message || '')
        .split('\\n')
        .filter((line) => !/^Co-authored-by:/i.test(line.trim()));
      if (lines[0] === subject) {
        lines.shift();
      }
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      return lines.join('\\n').trim();
    }

    function getAuthorInitials(author) {
      const parts = String(author || '')
        .trim()
        .split(/\\s+/)
        .filter(Boolean);
      if (parts.length === 0) {
        return '?';
      }
      return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    }

    function findCommitByHash(commitHash) {
      const commits = (currentState && currentState.commits) || [];
      return commits.find((commit) => commit.hash === commitHash) || null;
    }

    function showCommitTooltip(commitHash, event) {
      if (!commitTooltip) {
        return;
      }
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      const commit = findCommitByHash(commitHash);
      if (!commit) {
        hideCommitTooltip();
        return;
      }
      const shouldPosition = tooltipCommitHash !== commitHash || commitTooltip.hidden;
      if (tooltipCommitHash !== commitHash) {
        tooltipCommitHash = commitHash;
        commitTooltip.innerHTML = renderCommitTooltip(commit);
      }
      commitTooltip.hidden = false;
      if (shouldPosition) {
        positionCommitTooltip(event.clientX, event.clientY);
      }
    }

    function positionCommitTooltip(clientX, clientY) {
      if (!commitTooltip || commitTooltip.hidden) {
        return;
      }
      const margin = 12;
      const offset = 14;
      const rect = commitTooltip.getBoundingClientRect();
      const preferredLeft = clientX + offset;
      const preferredTop = clientY + offset;
      const left = preferredLeft + rect.width + margin <= window.innerWidth
        ? preferredLeft
        : Math.max(margin, clientX - rect.width - offset);
      const top = Math.min(
        Math.max(margin, preferredTop),
        Math.max(margin, window.innerHeight - rect.height - margin)
      );
      commitTooltip.style.left = left + 'px';
      commitTooltip.style.top = top + 'px';
    }

    function hideCommitTooltip() {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      tooltipCommitHash = '';
      if (commitTooltip) {
        commitTooltip.hidden = true;
        commitTooltip.innerHTML = '';
      }
    }

    function scheduleShowCommitTooltip(commitHash, event) {
      cancelCommitTooltipHide();
      tooltipShowClientX = event.clientX;
      tooltipShowClientY = event.clientY;
      if (tooltipCommitHash === commitHash && commitTooltip && !commitTooltip.hidden) {
        return;
      }
      if (tooltipShowTimer && pendingTooltipCommitHash === commitHash) {
        return;
      }

      cancelCommitTooltipShow();
      pendingTooltipCommitHash = commitHash;
      tooltipShowTimer = window.setTimeout(() => {
        const pendingCommitHash = pendingTooltipCommitHash;
        const clientX = tooltipShowClientX;
        const clientY = tooltipShowClientY;
        tooltipShowTimer = 0;
        pendingTooltipCommitHash = '';
        showCommitTooltip(pendingCommitHash, { clientX, clientY });
      }, 500);
    }

    function cancelCommitTooltipShow() {
      if (tooltipShowTimer) {
        window.clearTimeout(tooltipShowTimer);
        tooltipShowTimer = 0;
      }
      pendingTooltipCommitHash = '';
    }

    function scheduleHideCommitTooltip() {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
      tooltipHideTimer = window.setTimeout(() => {
        hideCommitTooltip();
      }, 160);
    }

    function cancelCommitTooltipHide() {
      if (tooltipHideTimer) {
        window.clearTimeout(tooltipHideTimer);
        tooltipHideTimer = 0;
      }
    }

    function handleContextMenu(commitHash, clientX, clientY) {
      const compareSelection = getCompareSelectionForCommit(commitHash);
      const commit = findCommitByHash(commitHash);
      const copyReferenceNameMenu = renderCopyReferenceNameMenu(commit);
      const cherryPickCommitHashes = getCherryPickCommitHashes(commitHash);
      contextMenuState = {
        kind: 'commit',
        commitHash,
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
          + copyReferenceNameMenu;
        showContextMenuAt(clientX, clientY);
        return;
      }
      if (isMultiSelectedContext(commitHash)) {
        contextMenu.innerHTML = '<button class="context-menu-item" type="button" data-menu-action="cherryPickCommits">Cherry Pick</button>';
        showContextMenuAt(clientX, clientY);
        return;
      }
      contextMenu.innerHTML = ''
        + '<button class="context-menu-item" type="button" data-menu-action="compareCommitWithWorktree">Compare with Worktree</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="openCommitDetails">Open Commit Details</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="cherryPickCommits">Cherry Pick</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="resetToCommit">Reset to this</button>'
        + '<button class="context-menu-item" type="button" data-menu-action="copyCommitHash">Copy Hash</button>'
        + copyReferenceNameMenu;
      showContextMenuAt(clientX, clientY);
    }

    function renderCopyReferenceNameMenu(commit) {
      const refs = (commit?.refs || []).filter((ref) => ref && ref.name);
      if (refs.length === 0) {
        return '';
      }
      if (refs.length === 1) {
        return '<button class="context-menu-item" type="button" data-menu-action="copyReferenceName" data-ref-name="' + escapeHtml(refs[0].name) + '">Copy Ref Name</button>';
      }

      return ''
        + '<div class="context-menu-group">'
        + '  <div class="context-menu-parent context-menu-item" tabindex="0" role="button" aria-haspopup="menu" aria-label="Copy Ref Name">'
        + '    <span>Copy Ref Name</span>'
        + '    <span class="context-menu-chevron">›</span>'
        + '  </div>'
        + '  <div class="context-submenu" role="menu" aria-label="Copy Ref Name">'
        + refs.map((ref) =>
          '    <button class="context-menu-item" type="button" data-menu-action="copyReferenceName" data-ref-name="' + escapeHtml(ref.name) + '">' + escapeHtml(ref.name) + '</button>'
        ).join('')
        + '  </div>'
        + '</div>';
    }

    function openFileContextMenu(commitHash, changeId, clientX, clientY) {
      contextMenuState = { kind: 'file', commitHash, changeId };
      if (!contextMenu) {
        return;
      }
      contextMenu.innerHTML = ''
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

    function openFileContextMenuForElement(commitHash, changeId, element) {
      const rect = element.getBoundingClientRect();
      openFileContextMenu(
        commitHash,
        changeId,
        rect.left + Math.min(24, rect.width / 2),
        rect.top + Math.min(16, rect.height / 2)
      );
    }

    function showContextMenuAt(clientX, clientY) {
      contextMenu.hidden = false;
      contextMenu.style.left = '0px';
      contextMenu.style.top = '0px';
      const rect = contextMenu.getBoundingClientRect();
      const margin = 8;
      const left = Math.min(clientX, window.innerWidth - rect.width - margin);
      const top = Math.min(clientY, window.innerHeight - rect.height - margin);
      contextMenu.style.left = Math.max(margin, left) + 'px';
      contextMenu.style.top = Math.max(margin, top) + 'px';
      contextMenu.querySelector('.context-menu-item')?.focus();
    }

    function closeContextMenu() {
      if (!contextMenu) {
        return;
      }
      contextMenuState = null;
      contextMenu.hidden = true;
      contextMenu.innerHTML = '';
    }

    function requestAutoLoadMore() {
      const state = currentState;
      if (!state || state.kind !== 'visible' || state.loading || state.loadingMore || !state.hasMore) {
        return;
      }
      vscode.postMessage({ type: 'loadMore' });
    }

    function scheduleFilterUpdate(value) {
      const sourceToken = getCurrentSourceToken();
      window.clearTimeout(filterDebounceTimer);
      filterDebounceTimer = window.setTimeout(() => {
        if (sourceToken !== getCurrentSourceToken()) {
          return;
        }
        vscode.postMessage({ type: 'setFilterText', value, sourceToken });
      }, 250);
    }

    function clearPendingFilterUpdate() {
      window.clearTimeout(filterDebounceTimer);
      filterDebounceTimer = 0;
    }

    function getCurrentSourceToken() {
      return (currentState && currentState.sourceToken) || '';
    }

    function normalizeSelectedCommitHashes(value) {
      const rawValues = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
      return rawValues
        .filter((hash, index, values) => typeof hash === 'string' && hash.length > 0 && values.indexOf(hash) === index)
        .slice(-1000);
    }

    function syncSelectedCommitHashes(commits) {
      const loadedCommitHashes = new Set(commits.map((commit) => commit.hash));
      const nextSelected = selectedCommitHashes.filter((hash) => loadedCommitHashes.has(hash));
      if (nextSelected.length !== selectedCommitHashes.length) {
        selectedCommitHashes = nextSelected;
        persistUiState();
      }
    }

    function selectCommit(commitHash, append) {
      if (!commitHash) {
        return;
      }

      if (!append) {
        selectedCommitHashes = [commitHash];
        persistUiState();
        return;
      }

      if (selectedCommitHashes.includes(commitHash)) {
        selectedCommitHashes = selectedCommitHashes.filter((hash) => hash !== commitHash);
        persistUiState();
        return;
      }

      selectedCommitHashes = selectedCommitHashes.filter((hash) => hash !== commitHash);
      selectedCommitHashes.push(commitHash);
      selectedCommitHashes = selectedCommitHashes.slice(-1000);
      persistUiState();
    }

    function clearSelectedCommitHashes() {
      if (selectedCommitHashes.length === 0) {
        return false;
      }

      selectedCommitHashes = [];
      persistUiState();
      return true;
    }

    function getCompareSelectionForCommit(commitHash) {
      if (selectedCommitHashes.length !== 2 || !selectedCommitHashes.includes(commitHash)) {
        return undefined;
      }

      return {
        baseCommitHash: selectedCommitHashes[0],
        compareCommitHash: selectedCommitHashes[1]
      };
    }

    function isMultiSelectedContext(commitHash) {
      return selectedCommitHashes.length > 1 && selectedCommitHashes.includes(commitHash);
    }

    function getCherryPickCommitHashes(commitHash) {
      if (selectedCommitHashes.includes(commitHash)) {
        return selectedCommitHashes.slice();
      }

      return [commitHash];
    }

    function syncLoadMoreObserver() {
      if (loadMoreObserver) {
        loadMoreObserver.disconnect();
      }

      const sentinel = document.getElementById('loadMoreSentinel');
      if (!sentinel) {
        loadMoreObserver = null;
        return;
      }

      if (typeof IntersectionObserver !== 'function') {
        loadMoreObserver = null;
        return;
      }

      loadMoreObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            requestAutoLoadMore();
            break;
          }
        }
      }, {
        root: null,
        rootMargin: '0px 0px 160px 0px',
        threshold: 0
      });

      loadMoreObserver.observe(sentinel);
    }

    function maybeLoadMoreFromScroll() {
      const state = currentState;
      if (!state || state.kind !== 'visible' || state.loading || state.loadingMore || !state.hasMore) {
        return;
      }

      const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (remaining <= 160) {
        requestAutoLoadMore();
      }
    }

    content.addEventListener('click', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest('#graphResizer')) {
        return;
      }
      if (target.closest('.commit-file-search-control')) {
        return;
      }
      const fileRow = target.closest('[data-change-id]');
      if (fileRow instanceof HTMLElement) {
        closeContextMenu();
        fileRow.focus();
        return;
      }
      const commitRow = target.closest('[data-commit-hash]');
      if (commitRow instanceof HTMLElement) {
        const commitHash = commitRow.getAttribute('data-commit-hash') || '';
        if (event.ctrlKey && event.button === 0) {
          selectCommit(commitHash, true);
          closeContextMenu();
          render();
          return;
        }
        closeContextMenu();
        if (event.button === 0 && clearSelectedCommitHashes()) {
          render();
        }
        vscode.postMessage({ type: 'toggleCommit', commitHash });
      }
    });

    content.addEventListener('dblclick', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest('.commit-file-search-control')) {
        return;
      }

      const fileRow = target.closest('[data-change-id]');
      if (!(fileRow instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      closeContextMenu();
      fileRow.focus();
      vscode.postMessage({
        type: 'openFile',
        commitHash: fileRow.getAttribute('data-commit-hash') || '',
        changeId: fileRow.getAttribute('data-change-id') || ''
      });
    });

    content.addEventListener('mousedown', (event) => {
      hideCommitTooltip();
      if (event.button !== 1) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-change-id]')) {
        event.preventDefault();
      }
    });

    content.addEventListener('auxclick', (event) => {
      hideCommitTooltip();
      if (event.button !== 1) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-change-id]')) {
        event.preventDefault();
      }
    });

    content.addEventListener('keydown', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.id === 'graphResizer') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          applyGraphColumnWidth(graphWidth - 8);
          persistGraphColumnWidth();
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          applyGraphColumnWidth(graphWidth + 8);
          persistGraphColumnWidth();
          return;
        }
      }
      if ((event.key === 'Enter' || event.key === ' ') && target.matches('[data-commit-hash]')) {
        event.preventDefault();
        const commitHash = target.getAttribute('data-commit-hash') || '';
        closeContextMenu();
        vscode.postMessage({ type: 'toggleCommit', commitHash });
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && target.matches('[data-change-id]')) {
        event.preventDefault();
        openFileContextMenuForElement(
          target.getAttribute('data-commit-hash') || '',
          target.getAttribute('data-change-id') || '',
          target
        );
        return;
      }
      if (target.matches('[data-change-id]') && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
        event.preventDefault();
        openFileContextMenuForElement(
          target.getAttribute('data-commit-hash') || '',
          target.getAttribute('data-change-id') || '',
          target
        );
        return;
      }
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        const commitRow = target.closest('[data-commit-hash]');
        if (commitRow instanceof HTMLElement) {
          event.preventDefault();
          const rect = commitRow.getBoundingClientRect();
          handleContextMenu(commitRow.getAttribute('data-commit-hash') || '', rect.left + 24, rect.top + 18);
        }
      }
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    });

    content.addEventListener('contextmenu', (event) => {
      hideCommitTooltip();
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest('#graphResizer')) {
        event.preventDefault();
        return;
      }
      if (target.closest('.commit-file-search-control')) {
        return;
      }
      const fileRow = target.closest('[data-change-id]');
      if (fileRow instanceof HTMLElement) {
        event.preventDefault();
        openFileContextMenu(
          fileRow.getAttribute('data-commit-hash') || '',
          fileRow.getAttribute('data-change-id') || '',
          event.clientX,
          event.clientY
        );
        return;
      }
      const commitRow = target.closest('[data-commit-hash]');
      if (!(commitRow instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      handleContextMenu(commitRow.getAttribute('data-commit-hash') || '', event.clientX, event.clientY);
    });

    content.addEventListener('mousemove', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        scheduleHideCommitTooltip();
        return;
      }
      if (target.closest('.commit-file-search-control')) {
        scheduleHideCommitTooltip();
        return;
      }
      const row = target.closest('.commit-row[data-commit-hash]');
      if (!(row instanceof HTMLElement) || target.closest('[data-change-id]')) {
        scheduleHideCommitTooltip();
        return;
      }
      const commitHash = row.dataset.commitHash || '';
      if (!commitHash) {
        scheduleHideCommitTooltip();
        return;
      }
      scheduleShowCommitTooltip(commitHash, event);
    });

    content.addEventListener('mouseleave', () => {
      scheduleHideCommitTooltip();
    });

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

    commitTooltip?.addEventListener('mouseenter', () => {
      cancelCommitTooltipShow();
      cancelCommitTooltipHide();
    });

    commitTooltip?.addEventListener('mouseleave', () => {
      scheduleHideCommitTooltip();
    });

    commitTooltip?.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-tooltip-action]')?.getAttribute('data-tooltip-action');
      const commitHash = event.target?.closest?.('[data-commit-hash]')?.getAttribute('data-commit-hash') || tooltipCommitHash;
      if (!action || !commitHash) {
        return;
      }
      event.preventDefault();
      if (action === 'copyCommitHash') {
        vscode.postMessage({ type: 'copyCommitHash', commitHash });
      }
      if (action === 'openCommitOnGitHub') {
        vscode.postMessage({ type: 'openCommitOnGitHub', commitHash });
      }
    });

    contextMenu.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-menu-action]')?.getAttribute('data-menu-action');
      if (!action || !contextMenuState) {
        return;
      }

      const state = contextMenuState;
      const refName = event.target?.closest?.('[data-ref-name]')?.getAttribute('data-ref-name') || '';
      closeContextMenu();

      if (state.kind === 'commit') {
        if (action === 'openCommitDetails') {
          vscode.postMessage({ type: 'openCommitDetails', commitHash: state.commitHash });
        }
        if (action === 'compareCommits' && state.baseCommitHash && state.compareCommitHash) {
          vscode.postMessage({
            type: 'compareCommits',
            baseCommitHash: state.baseCommitHash,
            compareCommitHash: state.compareCommitHash
          });
        }
        if (action === 'compareCommitWithWorktree') {
          vscode.postMessage({ type: 'compareCommitWithWorktree', commitHash: state.commitHash });
        }
        if (action === 'cherryPickCommits') {
          vscode.postMessage({ type: 'cherryPickCommits', commitHashes: state.commitHashes || [state.commitHash] });
        }
        if (action === 'resetToCommit') {
          vscode.postMessage({ type: 'resetToCommit', commitHash: state.commitHash });
        }
        if (action === 'copyCommitHash') {
          vscode.postMessage({ type: 'copyCommitHash', commitHash: state.commitHash });
        }
        if (action === 'copyReferenceName') {
          if (refName) {
            vscode.postMessage({ type: 'copyReferenceName', commitHash: state.commitHash, refName });
          }
        }
        return;
      }

      if (action === 'openFile' || action === 'compareWithWorktree' || action === 'revertFileToCommit' || action === 'copyFileName' || action === 'copyFullPath') {
        vscode.postMessage({
          type: action,
          commitHash: state.commitHash,
          changeId: state.changeId
        });
      }
    });

    document.addEventListener('click', (event) => {
      if (!contextMenu.hidden && !event.target?.closest?.('#contextMenu')) {
        closeContextMenu();
      }
    });

    showAllBranchesToggle?.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      vscode.postMessage({ type: 'toggleShowAllBranches', value: target.checked });
    });

    filterInput?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      scheduleFilterUpdate(target.value);
    });

    filterClear?.addEventListener('click', () => {
      if (!(filterInput instanceof HTMLInputElement)) {
        return;
      }
      filterInput.value = '';
      filterInput.focus();
      scheduleFilterUpdate('');
    });

    document.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest('#graphResizer')) {
        return;
      }
      event.preventDefault();
      target.setPointerCapture?.(event.pointerId);
      startGraphResize(event.clientX);
    });

    document.addEventListener('pointermove', (event) => {
      updateGraphResize(event.clientX);
    });

    document.addEventListener('pointerup', () => {
      stopGraphResize();
    });

    document.addEventListener('pointercancel', () => {
      stopGraphResize();
    });

    window.addEventListener('scroll', () => {
      maybeLoadMoreFromScroll();
    }, { passive: true });

    window.addEventListener('resize', () => {
      maybeLoadMoreFromScroll();
    });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'state') {
        const previousSourceToken = getCurrentSourceToken();
        currentState = event.data.state;
        if (previousSourceToken !== getCurrentSourceToken()) {
          clearPendingFilterUpdate();
        }
        render();
        return;
      }

      if (event.data && event.data.type === 'append') {
        if (!applyAppendPatch(event.data.patch)) {
          vscode.postMessage({ type: 'ready' });
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
    render();
  </script>
</body>
</html>`;
}

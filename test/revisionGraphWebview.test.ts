import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRevisionGraphShellHtml } from '../src/revisionGraphWebview';

test('renders a persistent shell for the revision graph webview', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<select id="scopeSelect">/);
  assert.match(html, /Show Branchings &amp; Merges/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /Find in graph\.\.\./);
  assert.match(html, /id="searchResultBadge"/);
  assert.match(html, /id="searchPrevButton"/);
  assert.match(html, /id="searchNextButton"/);
  assert.match(html, /id="searchClearButton"/);
  assert.match(html, /class="workspace-led clean"/);
  assert.match(html, /<div class="toolbar-actions" aria-label="Graph actions">\s*<button\s+class="workspace-led clean"/);
  assert.match(html, /id="workspaceLed"/);
  assert.match(html, /id="graphSvg"/);
  assert.match(html, /id="edgeLayer"/);
  assert.match(html, /id="nodeLayer"/);
  assert.match(html, /id="statusCard"/);
  assert.match(html, /window\.addEventListener\('message'/);
  assert.match(html, /vscode\.postMessage\(\{ type: 'webview-ready' \}\);/);
  assert.match(html, /case 'init-state'/);
  assert.match(html, /case 'update-state'/);
  assert.match(html, /case 'patch-metadata'/);
  assert.match(html, /case 'set-loading'/);
  assert.match(html, /case 'set-error'/);
  assert.match(html, /--node-branch: #19d60f;/);
  assert.match(html, /--node-stash: #8c8f97;/);
  assert.match(html, /--toolbar-safe-height: 108px/);
  assert.match(html, /calc\(var\(--toolbar-safe-height\) \+ 18px\)/);
});

test('rehydrates the webview after the shell is recreated', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /window\.addEventListener\('message', \(event\) => \{\s*handleHostMessage\(event\.data\);\s*\}\);\s*vscode\.postMessage\(\{ type: 'webview-ready' \}\);/s
  );
});

test('keeps loading and error primitives in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<body class="loading" aria-busy="true">/);
  assert.match(html, /id="loadingOverlay" aria-hidden="false"/);
  assert.match(html, /Opening revision graph\.\.\./);
  assert.match(html, /function setToolbarBusy\(isBusy, pendingControl = null\)/);
  assert.match(html, /function showLoading\(label, pendingControl = null\)/);
  assert.match(html, /function runWithLoading\(label, work, pendingControl = null\)/);
  assert.match(html, /function hideLoading\(\)/);
  assert.match(html, /function showError\(message\)/);
  assert.match(html, /if \(nextState\.loading\) \{\s*showLoading\(nextState\.loadingLabel \|\| 'Loading revision graph\.\.\.'\);\s*\} else \{\s*hideLoading\(\);\s*\}/s);
  assert.match(html, /data-pending="true"/);
  assert.match(html, /class="loading-overlay"/);
});

test('shows loading feedback while reorganizing the graph layout client-side', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /reorganizeButton\.addEventListener\('click', \(\) => \{\s*runWithLoading\('Reorganizing graph layout\.\.\.', \(\) => \{\s*autoArrangeTortoiseLayout\(\);\s*centerGraphInViewport\(\);\s*\}, reorganizeButton\);/s
  );
});

test('renders checkout menu actions with the destination branch name', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /if \(target\.kind !== 'tag' && target\.kind !== 'stash' && !isCurrentHead\) \{\s*appendMenuItem\('Checkout to: ' \+ target\.name, \(\) => \{/s);
});

test('renders straighter edges and compact structural node styling in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /stroke-width="1\.8"/);
  assert.match(html, /return 'M ' \+ sourceX \+ ' ' \+ sourceY \+ ' L ' \+ targetX \+ ' ' \+ targetY;/);
  assert.match(html, /min-width: 78px;/);
});

test('includes ref-aware reorganize helpers for Tortoise-like branch clustering', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function autoArrangeTortoiseLayout\(\)/);
  assert.match(html, /function buildNodeFamilyAssignments\(neighborMap\)/);
  assert.match(html, /function buildFamilyAnchorMap\(familyAssignments\)/);
  assert.match(html, /function getExplicitNodeFamily\(node\)/);
});

test('recenters after auto-arranging the initial graph state', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /if \(nextState\.autoArrangeOnInit\) \{\s*autoArrangeLayout\(\);\s*centerGraphInViewport\(\);/);
});

test('preserves viewport and selection during metadata patches', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /preserveSelection: !!patch\.preserveSelection/);
  assert.match(html, /preserveViewport: !!patch\.preserveViewport/);
  assert.match(html, /function captureSelectionSnapshot\(\)/);
  assert.match(html, /function restoreSelectionSnapshot\(snapshot\)/);
  assert.match(html, /function captureScenePlacementSnapshot\(\)/);
  assert.match(html, /function restoreScenePlacementSnapshot\(snapshot\)/);
  assert.match(html, /function captureViewportSnapshot\(\)/);
  assert.match(html, /function restoreViewportSnapshot\(snapshot\)/);
});

test('renders client-side graph search controls and runtime handlers', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /searchInput\.addEventListener\('input'/);
  assert.match(html, /searchPrevButton\.addEventListener\('click'/);
  assert.match(html, /searchNextButton\.addEventListener\('click'/);
  assert.match(html, /searchClearButton\.addEventListener\('click'/);
  assert.match(html, /function setSearchQuery\(nextQuery\)/);
  assert.match(html, /function syncSearchResults\(options = \{\}\)/);
  assert.match(html, /function syncSearchHighlights\(\)/);
  assert.match(html, /function focusNextSearchResult\(\)/);
  assert.match(html, /function focusPreviousSearchResult\(\)/);
  assert.match(html, /function focusSearchInput\(selectText = false\)/);
  assert.match(html, /event\.key\.toLowerCase\(\) === 'f'/);
  assert.match(html, /currentState\.scene\.nodes/);
  assert.match(html, /centerNodeInViewport\(activeHash\)/);
});

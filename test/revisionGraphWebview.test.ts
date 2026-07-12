import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';

import {
  renderRevisionGraphShellHtml as renderRevisionGraphShellDocument
} from '../src/revisionGraphWebview';

const testAssets = {
  runtimeUri: 'vscode-webview-resource://test/revisionGraph.js',
  scriptSource: 'vscode-webview-resource:'
};

function renderRevisionGraphShellHtml(): string {
  return `${renderRevisionGraphShellDocument(testAssets)}\n${readRevisionGraphRuntimeSourceForContractAssertions()}`;
}

function readRevisionGraphRuntimeSource(): string {
  return readFileSync('out/webview/revisionGraph.js', 'utf8');
}

function readRevisionGraphRuntimeSourceForContractAssertions(): string {
  return readRevisionGraphRuntimeSource()
    .replaceAll('NODE_MIN_WIDTH', '128')
    .replaceAll('REF_LINE_HEIGHT', '25')
    .replaceAll('EDGE_VERTICAL_INSET', '6')
    .replaceAll('VIEWPORT_PADDING_TOP', '18')
    .replaceAll('VIEWPORT_PADDING_RIGHT', '0')
    .replaceAll('VIEWPORT_PADDING_BOTTOM', '18')
    .replaceAll('VIEWPORT_PADDING_LEFT', '18');
}

test('renders the revision graph runtime as a nonce-protected external asset', () => {
  const html = renderRevisionGraphShellDocument(testAssets);

  assert.match(html, /script-src vscode-webview-resource: 'nonce-[A-Za-z0-9_-]+'/);
  assert.match(
    html,
    /<script nonce="[A-Za-z0-9_-]+" src="vscode-webview-resource:\/\/test\/revisionGraph\.js"><\/script>/
  );
  assert.doesNotMatch(html, /<script nonce="[A-Za-z0-9_-]+">[\s\S]+<\/script>/);
});

test('renders a persistent shell for the revision graph webview', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<select id="scopeSelect">/);
  assert.match(html, /<option value="remoteHead">origin\/HEAD<\/option>/);
  assert.match(html, /id="viewOptionsButton"/);
  assert.match(html, /id="viewOptionsMenu"/);
  assert.doesNotMatch(html, /Show Branchings &amp; Merges/);
  assert.doesNotMatch(html, /id="showBranchingsToggle"/);
  assert.match(html, /id="showRemoteBranchesToggle"/);
  assert.match(html, /Show Remote Branches/);
  assert.match(html, /id="showStashesToggle"/);
  assert.match(html, /Show Stash/);
  assert.match(html, /id="showMergeCommitsToggle"/);
  assert.match(html, /Show Merge Commits/);
  assert.match(html, /id="showMinimapToggle"/);
  assert.match(html, /Show Minimap/);
  assert.match(html, /id="flowGovernanceOptions"/);
  assert.match(html, /id="flowGovernanceEnabledToggle"/);
  assert.match(html, /Flow Governance/);
  assert.doesNotMatch(html, /id="flowGovernanceDetailOptions"/);
  assert.doesNotMatch(html, /id="hideSyncBranchesToggle"/);
  assert.doesNotMatch(html, /Hide Sync Branches/);
  assert.doesNotMatch(html, /id="highlightProductionTrunkToggle"/);
  assert.doesNotMatch(html, /Highlight Production Trunk/);
  assert.doesNotMatch(html, /id="showUnknownBranchesToggle"/);
  assert.doesNotMatch(html, /Show Unknown Branches/);
  assert.doesNotMatch(html, /id="flowKindOptions"/);
  assert.doesNotMatch(html, /showCurrentBranchDescendantsToggle/);
  assert.doesNotMatch(html, /Show Current Branch Descendants/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /<div class="search-controls toolbar-action-slot" aria-label="Search the loaded revision graph">/);
  assert.match(html, /Find in graph\.\.\./);
  assert.match(html, /id="searchResultBadge"/);
  assert.match(html, /id="searchPrevButton"/);
  assert.match(html, /id="searchNextButton"/);
  assert.match(html, /id="searchClearButton"/);
  assert.match(html, /id="searchPrevButton"[\s\S]*?data-icon="arrow-up"/);
  assert.match(html, /id="searchNextButton"[\s\S]*?data-icon="arrow-down"/);
  assert.match(html, /id="searchClearButton"[\s\S]*?data-icon="close"/);
  assert.match(html, /id="rangeFilter"/);
  assert.match(html, /id="rangeFilter"[\s\S]*?role="group"[\s\S]*?aria-label="Focus Range active"/);
  assert.match(html, /class="range-filter-icon"[\s\S]*?data-icon="focus-range"/);
  assert.match(html, /class="range-filter-caption">Focus<\/span>/);
  assert.match(html, /id="rangeFilterLabel"/);
  assert.match(html, /id="rangeFilterClearButton"[\s\S]*?title="Exit Focus Range"[\s\S]*?aria-label="Exit Focus Range and show all revisions"[\s\S]*?data-icon="close"/);
  assert.match(html, /id="descendantFilter"/);
  assert.match(html, /id="descendantFilter"[\s\S]*?role="group"[\s\S]*?aria-label="Focus Descendants active"/);
  assert.match(html, /class="range-filter-caption">Descendants<\/span>/);
  assert.match(html, /id="descendantFilterLabel"/);
  assert.match(html, /id="descendantFilterClearButton"[\s\S]*?title="Exit Focus Descendants"[\s\S]*?aria-label="Exit Focus Descendants and show all revisions"[\s\S]*?data-icon="close"/);
  assert.ok(
    html.indexOf('id="rangeFilter"') > html.indexOf('class="toolbar-actions"'),
    'expected the Focus Range indicator after the graph actions at the end of the toolbar'
  );
  assert.match(html, /id="fetchAllButton"/);
  assert.doesNotMatch(html, /id="fetchButton"/);
  assert.match(html, /id="reloadButton"/);
  assert.match(html, /id="reloadMenuButton"/);
  assert.doesNotMatch(html, />\s*<span>Reload<\/span>/);
  assert.match(html, /id="pullButton"/);
  assert.match(html, /id="pushButton"/);
  assert.match(html, /id="pushMenuButton"/);
  assert.match(html, /id="syncButton"/);
  assert.match(html, /id="centerHeadButton"[\s\S]*?data-icon="target"/);
  assert.match(html, /id="syncButton"[\s\S]*?data-icon="sync"/);
  assert.match(html, /id="pullButton"[\s\S]*?data-icon="repo-pull"/);
  assert.match(html, /id="pushButton"[\s\S]*?data-icon="repo-push"/);
  assert.match(html, /id="pushMenuButton"[\s\S]*?data-icon="chevron-down"/);
  assert.match(html, /id="fetchAllButton"[\s\S]*?data-icon="cloud-download"/);
  assert.match(html, /id="reloadButton"[\s\S]*?data-icon="refresh"/);
  assert.match(html, /id="reloadMenuButton"[\s\S]*?data-icon="chevron-down"/);
  assert.match(html, /class="toolbar-split-button" role="group" aria-label="Push actions"/);
  assert.match(html, /class="toolbar-split-button" role="group" aria-label="Reload actions"/);
  assert.match(html, /\.view-controls \.toolbar-icon \{\s*position: static;\s*inset: auto;/);
  assert.doesNotMatch(html, /workspace-led/);
  assert.doesNotMatch(html, /id="workspaceLed"/);
  assert.match(html, /<div class="toolbar-action-slot" aria-label="Repository actions">[\s\S]*?id="centerHeadButton"[\s\S]*?id="syncButton"[\s\S]*?id="pullButton"[\s\S]*?id="pushButton"[\s\S]*?id="pushMenuButton"[\s\S]*?id="fetchAllButton"[\s\S]*?id="reloadButton"[\s\S]*?id="reloadMenuButton"/);
  assert.doesNotMatch(html, /id="abortMergeButton"/);
  assert.match(html, /id="zoomOutButton"/);
  assert.match(html, /id="zoomResetButton"/);
  assert.match(html, /id="zoomInButton"/);
  assert.match(html, /<div class="toolbar-action-slot zoom-action-slot" aria-label="Zoom controls">[\s\S]*?id="zoomOutButton"[\s\S]*?id="zoomResetButton"[\s\S]*?id="zoomInButton"/);
  assert.match(html, /id="zoomOutButton"[\s\S]*?data-icon="minus"/);
  assert.match(html, /id="zoomResetButton"[\s\S]*?data-icon="reset"/);
  assert.match(html, /data-icon="reset"[\s\S]*?<path d="M3\.2 5\.4 4\.8 4v8"><\/path>[\s\S]*?<circle cx="7\.8" cy="6\.2" r="0\.45"><\/circle>[\s\S]*?<circle cx="7\.8" cy="9\.8" r="0\.45"><\/circle>[\s\S]*?<path d="M10\.2 5\.4 11\.8 4v8"><\/path>/);
  assert.doesNotMatch(html, /data-icon="reset"[\s\S]*?<circle cx="8" cy="8" r="4\.8"><\/circle>/);
  assert.match(html, /id="zoomInButton"[\s\S]*?data-icon="plus"/);
  assert.match(html, /id="graphSvg"/);
  assert.match(html, /id="edgeLayer"/);
  assert.match(html, /id="nodeLayer"/);
  assert.match(html, /id="statusCard"/);
  assert.match(html, /id="statusMessage"/);
  assert.match(html, /id="statusActionButton"/);
  assert.match(html, /id="referenceTooltip" role="dialog" aria-label="Reference details" hidden/);
  assert.match(html, /id="graphMinimap"/);
  assert.match(html, /id="minimapZoomOutButton"/);
  assert.match(html, /id="minimapZoomResetButton"/);
  assert.match(html, /id="minimapZoomInButton"/);
  assert.match(html, /id="minimapEdgeLayer"/);
  assert.match(html, /id="minimapNodeLayer"/);
  assert.match(html, /id="minimapViewport"/);
  assert.match(html, /window\.addEventListener\('message'/);
  assert.match(html, /isRevisionGraphWebviewHostState\(value\.state\)/);
  assert.match(html, /function createRevisionGraphWebviewReadyMessage\(\) \{\s*return \{ type: 'webview-ready' \};\s*\}/s);
  assert.match(html, /vscode\.postMessage\(createRevisionGraphWebviewReadyMessage\(\)\);/);
  assert.match(html, /case 'init-state'/);
  assert.match(html, /case 'update-state'/);
  assert.doesNotMatch(html, /case 'patch-metadata'/);
  assert.doesNotMatch(html, /case 'patch-workspace-state'/);
  assert.match(html, /function applyTracedHostMessage\(message, phase, apply\)/);
  assert.match(html, /function traceWebviewPhase\(phase, work, detail = ''\)/);
  assert.match(html, /webview\.canvas-layout\.sync-size/);
  assert.match(html, /webview\.canvas-layout\.scene-placement/);
  assert.match(html, /webview\.render-scene\.viewport-precenter/);
  assert.match(html, /webview\.viewport-frame\.scroll/);
  assert.match(html, /webview\.render-scene\.virtual-html/);
  assert.match(html, /webview\.render-scene\.virtual-frame/);
  assert.match(html, /webview\.apply\.viewport-frame/);
  assert.match(html, /function createRevisionGraphLoadTraceMessage\(phase, durationMs, detail, requestId\)/);
  assert.match(html, /function createRevisionGraphFlowGovernanceOptionsMessage\(options\) \{\s*return \{ type: 'set-flow-governance-options', options \};\s*\}/s);
  assert.match(html, /function createRevisionGraphPrepareFlowEqualizationMessage\(targetRefName, originRefName, description\)/);
  assert.match(html, /function createRevisionGraphCopyFlowPullRequestContextMessage\(sourceRefName, targetRefName\) \{\s*return \{ type: 'copy-flow-pr-context', sourceRefName, targetRefName \};\s*\}/s);
  assert.match(html, /function createRevisionGraphCopyFlowPullRequestContextFieldMessage\(sourceRefName, targetRefName, field\) \{\s*return \{ type: 'copy-flow-pr-context-field', sourceRefName, targetRefName, field \};\s*\}/s);
  assert.match(html, /function createRevisionGraphOpenFlowPullRequestUrlMessage\(sourceRefName, targetRefName\) \{\s*return \{ type: 'open-flow-pr-url', sourceRefName, targetRefName \};\s*\}/s);
  assert.match(html, /function createRevisionGraphStartFlowBranchMessage\(target, branchKind, name, description\)/);
  assert.match(html, /Start New Release/);
  assert.match(html, /Start New Feature/);
  assert.match(html, /Start New Task/);
  assert.match(html, /Start New Hot Fix/);
  assert.match(html, /Start New Bug/);
  assert.match(html, /id="referenceTooltip" role="dialog" aria-label="Reference details" hidden/);
  assert.doesNotMatch(html, /Validate Release Promotion/);
  assert.match(html, /Prepare Equalization/);
  assert.doesNotMatch(html, /Prepare Production Equalization/);
  assert.match(html, /Promotion PR Context/);
  assert.doesNotMatch(html, /Copy Promotion PR Context/);
  assert.doesNotMatch(html, /Open Promotion PR URL/);
  assert.match(html, /openButton\.textContent = 'Open Pull Request on GitHub';/);
  assert.match(html, /case 'show-flow-pr-context':\s*showFlowPullRequestContextForm\(message\);/s);
  assert.match(html, /heading\.textContent = 'Promotion Pull Request Context';/);
  assert.match(html, /introduction\.textContent = 'Review the generated context and copy each field into your Pull Request\.';/);
  assert.match(html, /flowLabel\.textContent = 'Flow';/);
  assert.match(html, /createFlowPullRequestContextField\('Title', 'flowPullRequestTitleInput', false\)/);
  assert.match(html, /createFlowPullRequestContextField\('Description', 'flowPullRequestDescriptionInput', true\)/);
  assert.match(html, /input\.readOnly = true;/);
  assert.match(html, /copyButton\.setAttribute\('aria-label', 'Copy ' \+ labelText\);/);
  assert.match(html, /copyButton\.innerHTML = renderCopyHashIcon\(\);/);
  assert.match(html, /\.flow-pr-context-copy \{[\s\S]*?padding: 0;[\s\S]*?\.flow-pr-context-copy svg \{\s*position: static;\s*width: 17px;\s*height: 17px;\s*fill: currentColor;/s);
  assert.match(html, /createRevisionGraphCopyFlowPullRequestContextFieldMessage\(\s*dialog\.sourceRefName,\s*dialog\.targetRefName,\s*field\s*\)/s);
  assert.match(html, /type: 'load-trace'/);
  assert.match(html, /case 'set-loading'/);
  assert.match(html, /case 'set-error'/);
  assert.match(html, /--node-branch: #19d60f;/);
  assert.match(html, /--node-stash: #8c8f97;/);
  assert.match(html, /--toolbar-top-offset: 0px/);
  assert.match(html, /--toolbar-safe-height: 56px/);
  assert.match(html, /--graph-top-offset: calc\(var\(--toolbar-safe-height\) \+ 1px\)/);
  assert.match(html, /\.view-controls \{\s*position: fixed;\s*top: var\(--toolbar-top-offset\);\s*left: 0;\s*right: 0;[\s\S]*?border-radius: 0;[\s\S]*?box-shadow: none;/);
  assert.match(html, /\.view-controls \.toolbar-actions \{\s*display: flex;[\s\S]*?justify-content: flex-start;/);
  assert.doesNotMatch(html, /\.view-controls \.toolbar-actions \{[\s\S]*?margin-left: auto;[\s\S]*?\}/);
  assert.match(html, /\.view-controls \.toolbar-button \{[\s\S]*?border-radius: 0;/);
  assert.match(html, /\.flow-badge \{/);
  assert.doesNotMatch(html, /\.flow-kind-options \{/);
  assert.doesNotMatch(html, /\.ref-line\.flow-production-trunk/);
  assert.match(html, /top: var\(--graph-top-offset\);/);
  assert.match(html, /right: 0;/);
  assert.match(html, /bottom: 0;/);
  assert.match(html, /left: 0;/);
});

test('rehydrates the webview after the shell is recreated', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /window\.addEventListener\('message', \(event\) => \{\s*if \(isRevisionGraphWebviewHostMessage\(event\.data\)\) \{\s*handleHostMessage\(event\.data\);\s*\}\s*\}\);\s*vscode\.postMessage\(createRevisionGraphWebviewReadyMessage\(\)\);/s
  );
});

test('keeps loading and error primitives in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<body class="loading" aria-busy="true">/);
  assert.match(html, /id="loadingOverlay" aria-hidden="false"/);
  assert.match(html, /Opening revision graph\.\.\./);
  assert.match(html, /function setToolbarBusy\(isBusy, pendingControl = null\)/);
  assert.match(html, /function showLoading\(label, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function runWithLoading\(label, work, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function hideLoading\(\)/);
  assert.match(html, /function showError\(message\)/);
  assert.match(
    html,
    /if \(nextState\.loading\) \{\s*hideStatus\(\);\s*showLoading\(nextState\.loadingLabel \|\| 'Loading revision graph\.\.\.', null, 'blocking'\);\s*\}\s*else \{\s*hideLoading\(\);\s*\}/s
  );
  assert.match(html, /data-pending="true"/);
  assert.match(html, /class="loading-overlay"/);
  assert.match(html, /showRevisionGraphWebviewLoading\(\s*\{\s*body: document\.body,\s*overlay: loadingOverlay,\s*message: loadingMessage\s*\},\s*label,\s*mode\s*\);/s);
  assert.match(html, /elements\.body\.classList\.remove\('loading', 'loading-subtle'\);/);
  assert.match(html, /elements\.overlay\.setAttribute\('data-mode', mode\);/);
  assert.match(html, /body\.loading-subtle \.loading-overlay/);
});

test('shows loading feedback while centering the graph on HEAD', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /centerHeadButton\.addEventListener\('click', async \(\) => \{\s*await runWithLoading\('Centering on HEAD\.\.\.', async \(\) => \{\s*centerGraphInViewport\(\);\s*\}, centerHeadButton, 'subtle'\);/s
  );
  assert.doesNotMatch(html, /autoArrangeLayout\(\)/);
  assert.doesNotMatch(html, /fetchButton\.addEventListener\('click'/);
});

test('reloads the graph from the webview toolbar', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /const reloadButton = requireRevisionGraphElement\('reloadButton'\);/);
  assert.match(html, /const reloadMenuButton = requireRevisionGraphElement\('reloadMenuButton'\);/);
  assert.match(html, /const fetchAllButton = requireRevisionGraphElement\('fetchAllButton'\);/);
  assert.match(html, /const pullButton = requireRevisionGraphElement\('pullButton'\);/);
  assert.match(html, /const pushButton = requireRevisionGraphElement\('pushButton'\);/);
  assert.match(html, /const pushMenuButton = requireRevisionGraphElement\('pushMenuButton'\);/);
  assert.match(html, /const syncButton = requireRevisionGraphElement\('syncButton'\);/);
  assert.match(
    html,
    /reloadButton\.addEventListener\('click', \(\) => \{\s*reloadRevisionGraph\(\);\s*\}\);/s
  );
  assert.match(
    html,
    /reloadMenuButton\.addEventListener\('click', \(event\) => \{\s*event\.stopPropagation\(\);\s*if \(reloadCacheMenu && !reloadCacheMenu\.hidden\) \{\s*closeReloadCacheMenu\(\);\s*\}\s*else \{\s*showReloadCacheMenu\(\);\s*\}\s*\}\);/s
  );
  assert.match(
    html,
    /function reloadRevisionGraph\(\) \{\s*closeReloadCacheMenu\(\);\s*postMessageWithLoading\(createRevisionGraphRefreshMessage\(\), 'Reloading revision graph\.\.\.', reloadButton\);/s
  );
  assert.match(
    html,
    /function reloadRevisionGraphWithEmptyCache\(\) \{\s*closeReloadCacheMenu\(\);\s*postMessageWithLoading\(\s*createRevisionGraphRefreshWithEmptyCacheMessage\(\),\s*'Reloading revision graph with empty cache\.\.\.',\s*reloadButton\s*\);/s
  );
  assert.match(html, /createRevisionGraphRefreshWithEmptyCacheMessage\(\)/);
  assert.match(html, /reloadCacheMenu\.id = 'reloadCacheMenu';/);
  assert.match(html, /emptyCacheButton\.textContent = 'With Empty Cache';/);
  assert.match(html, /reloadMenuButton\.setAttribute\('aria-expanded', 'true'\);/);
  assert.match(html, /reloadMenuButton\.setAttribute\('aria-expanded', 'false'\);/);
  assert.match(html, /const buttonRect = reloadMenuButton\.getBoundingClientRect\(\);/);
  assert.match(html, /\.reload-cache-menu/);
  assert.match(html, /fetchAllButton\.addEventListener\('click', \(\) => \{\s*vscode\.postMessage\(createRevisionGraphFetchCurrentRepositoryMessage\(\)\);/s);
  assert.doesNotMatch(html, /postMessageWithLoading\(\{ type: 'fetch-current-repository' \}/);
  assert.match(html, /postMessageWithLoading\(createRevisionGraphPullCurrentHeadMessage\(\), 'Pulling current branch\.\.\.', pullButton\);/);
  assert.match(
    html,
    /pushButton\.addEventListener\('click', \(\) => \{\s*pushCurrentHead\('normal'\);\s*\}\);/s
  );
  assert.match(
    html,
    /pushMenuButton\.addEventListener\('click', \(event\) => \{\s*event\.stopPropagation\(\);\s*if \(pushModeMenu && !pushModeMenu\.hidden\) \{\s*closePushModeMenu\(\);\s*\}\s*else \{\s*showPushModeMenu\(\);\s*\}\s*\}\);/s
  );
  assert.match(html, /pushModeMenu\.id = 'pushModeMenu';/);
  assert.match(html, /\{ label: 'Push with Force With Lease', mode: 'force-with-lease' \}/);
  assert.match(html, /\{ label: 'Push with Force', mode: 'force' \}/);
  assert.match(html, /pushMenuButton\.setAttribute\('aria-expanded', 'true'\);/);
  assert.match(html, /pushMenuButton\.setAttribute\('aria-expanded', 'false'\);/);
  assert.match(html, /const buttonRect = pushMenuButton\.getBoundingClientRect\(\);/);
  assert.match(html, /pushModeMenu\.style\.top = Math\.max\(8, buttonRect\.bottom \+ 6\) \+ 'px';/);
  assert.match(html, /function pushCurrentHead\(mode\) \{\s*closePushModeMenu\(\);\s*vscode\.postMessage\(createRevisionGraphPushCurrentHeadMessage\(mode\)\);/s);
  assert.match(html, /postMessageWithLoading\(createRevisionGraphSyncCurrentHeadMessage\(\), 'Synchronizing current branch\.\.\.', syncButton\);/);
  assert.match(html, /reloadButton\.disabled = toolbarBusy;/);
  assert.match(html, /reloadMenuButton\.disabled = toolbarBusy;/);
  assert.match(html, /function syncRevisionGraphWebviewRemoteToolbarUi\(/);
  assert.match(html, /searchClearButton,\s*rangeFilterClearButton,\s*descendantFilterClearButton,\s*reloadButton,\s*reloadMenuButton,\s*fetchAllButton,\s*pullButton,\s*pushButton,\s*pushMenuButton,\s*syncButton,\s*centerHeadButton,/s);
  assert.match(html, /zoomOutButton,\s*zoomResetButton,\s*zoomInButton,/s);
  assert.match(html, /minimapZoomOutButton,\s*minimapZoomResetButton,\s*minimapZoomInButton,/s);
  assert.doesNotMatch(html, /TOOLBAR_LONG_PRESS_DELAY_MS/);
  assert.doesNotMatch(html, /scheduleReloadLongPressMenu/);
  assert.doesNotMatch(html, /schedulePushLongPressMenu/);
});

test('preserves the current viewport when zooming or resetting from toolbar buttons', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /const zoomLevels = \[0\.1, 0\.2, 0\.3, 0\.4, 0\.5, 0\.6, 0\.8, 1, 1\.25, 1\.5\];/);
  assert.match(
    html,
    /function setZoom\(zoom, options = \{\}\) \{\s*const shouldPreserveViewport = options\.preserveViewport !== false;\s*const scenePlacementSnapshot = shouldPreserveViewport \? captureScenePlacementSnapshot\(\) : null;\s*const viewportSnapshot = shouldPreserveViewport \? captureViewportSnapshot\(\) : null;[\s\S]*?restoreViewportSnapshot\(viewportSnapshot\);/s
  );
  assert.match(html, /function calculateRevisionGraphWebviewViewportScrollPosition\(/);
  assert.match(html, /function captureRevisionGraphWebviewViewportSceneCenter\(/);
  assert.match(
    html,
    /zoomOutButton\.addEventListener\('click', \(\) => \{\s*zoomOut\(\);\s*\}\);/s
  );
  assert.match(
    html,
    /zoomInButton\.addEventListener\('click', \(\) => \{\s*zoomIn\(\);\s*\}\);/s
  );
  assert.match(
    html,
    /zoomResetButton\.addEventListener\('click', \(\) => \{\s*resetZoom\(\);\s*\}\);/s
  );
  assert.match(html, /function resetZoom\(\) \{\s*setZoom\(1\);\s*\}/s);
  assert.match(html, /setZoom\(1, \{ preserveViewport: false \}\);/);
});

test('does not recenter the graph when zooming from toolbar buttons', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(
    html,
    /zoomInButton\.addEventListener\('click', \(\) => \{\s*zoomIn\(\);\s*centerGraphInViewport\(\);/s
  );
  assert.doesNotMatch(
    html,
    /zoomOutButton\.addEventListener\('click', \(\) => \{\s*zoomOut\(\);\s*centerGraphInViewport\(\);/s
  );
});

test('center HEAD button does not crash when refs are grouped by families', async () => {
  const runtime = createWebviewRuntime();

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: {
      viewMode: 'ready',
      hasRepositories: true,
      repositoryPath: '/workspace/repo',
      currentHeadName: 'main',
      currentHeadUpstreamName: 'origin/main',
      publishedLocalBranchNames: ['main'],
      isWorkspaceDirty: false,
      hasMergeConflicts: false,
      hasConflictedMerge: false,
      projectionOptions: {
        refScope: 'all',
        showTags: true,
        showRemoteBranches: true,
        showStashes: true,
        showMergeCommits: false,
        showCurrentBranchDescendants: true,
        revisionRange: undefined,
        descendantFocus: undefined
      },
      mergeBlockedTargets: [],
      primaryAncestorNextByHash: {},
      scene: {
        nodes: [
          {
            hash: 'head1',
            row: 0,
            refs: [{ name: 'main', kind: 'head' }],
            author: 'Ada',
            date: '2026-04-08',
            subject: 'Bootstrap'
          },
          {
            hash: 'branch1',
            row: 1,
            refs: [{ name: 'feature/demo', kind: 'branch' }],
            author: 'Ada',
            date: '2026-04-09',
            subject: 'Feature work'
          },
          {
            hash: 'remote1',
            row: 2,
            refs: [{ name: 'origin/feature/demo', kind: 'remote' }],
            author: 'Ada',
            date: '2026-04-10',
            subject: 'Remote update'
          }
        ],
        edges: [
          { from: 'head1', to: 'branch1' },
          { from: 'branch1', to: 'remote1' }
        ],
        laneCount: 2,
        rowCount: 3
      },
      nodeLayouts: [
        { hash: 'head1', lane: 0, row: 0, x: 0, width: 120, height: 40, defaultLeft: 26, defaultTop: 88 },
        { hash: 'branch1', lane: 1, row: 1, x: 180, width: 120, height: 40, defaultLeft: 206, defaultTop: 176 },
        { hash: 'remote1', lane: 1, row: 2, x: 240, width: 120, height: 40, defaultLeft: 266, defaultTop: 264 }
      ],
      references: [
        { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head' },
        { id: 'branch1::branch::feature/demo', hash: 'branch1', name: 'feature/demo', kind: 'branch' },
        { id: 'remote1::remote::origin/feature/demo', hash: 'remote1', name: 'origin/feature/demo', kind: 'remote' }
      ],
      sceneLayoutKey: 'head1:0:0|branch1:1:180|remote1:2:240',
      baseCanvasWidth: 900,
      baseCanvasHeight: 500,
      emptyMessage: undefined,
      loading: false,
      loadingLabel: undefined,
      errorMessage: undefined
    }
  });

  const centerHead = runtime.elements.get('centerHeadButton')?.listeners.click?.[0];
  assert.ok(centerHead);
  await assert.doesNotReject(async () => {
    await centerHead();
  });
});

test('renders checkout menu actions with the destination branch name', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /const isCurrentHead = target\.kind === 'head' \|\| \(\s*target\.kind === 'branch'\s*&& !!currentHeadName\s*&& target\.name === currentHeadName\s*\);/s
  );
  assert.match(html, /if \(target\.kind !== 'commit' && target\.kind !== 'tag' && target\.kind !== 'stash' && !isCurrentHead\) \{\s*appendMenuSection\('Branch Operations'\);\s*appendMenuItem\('Checkout to: ' \+ targetLabel, \(\) => postCheckout\(target\)\);/s);
});

test('renders structural commit actions for compare and branch creation', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function createCommitSelectionId\(hash\) \{/);
  assert.match(html, /function formatShortCommitHash\(hash\) \{\s*return String\(hash \|\| ''\)\.slice\(0, 8\);\s*\}/s);
  assert.match(html, /function getStructuralNodeTarget\(hash\) \{/);
  assert.match(html, /label: formatShortCommitHash\(hash\)/);
  assert.match(html, /label: formatShortCommitHash\(node\.hash\)/);
  assert.match(html, /formatShortCommitHash\(node\.hash\),/);
  assert.doesNotMatch(html, /hash\.slice\(0, 8\)/);
  assert.doesNotMatch(html, /node\.hash\.slice\(0, 8\)/);
  assert.match(html, /function createRevisionGraphShowLogTargetMessage\(target\)/);
  assert.match(html, /function createRevisionGraphShowLogRangeMessage\(base, compare\)/);
  assert.match(html, /function postShowLogTarget\(target\) \{\s*vscode\.postMessage\(createRevisionGraphShowLogTargetMessage\(target\)\);/s);
  assert.match(html, /function postShowLogRange\(base, compare\) \{\s*vscode\.postMessage\(createRevisionGraphShowLogRangeMessage\(base, compare\)\);/s);
  assert.match(html, /base\.hash === target\.hash/);
  assert.match(html, /compare\.hash === target\.hash/);
  assert.match(html, /function postCompareWithWorktree\(target\) \{\s*vscode\.postMessage\(createRevisionGraphCompareWithWorktreeMessage\(target\)\);/s);
  assert.match(html, /function postCopyCommitHash\(commitHash\) \{\s*vscode\.postMessage\(createRevisionGraphCopyCommitHashMessage\(commitHash\)\);/s);
  assert.match(html, /appendMenuItem\('Copy Hash', \(\) => postCopyCommitHash\(target\.hash\)\);/);
  assert.doesNotMatch(html, /Copy Commit Hash/);
  assert.match(html, /function postCopyRefName\(target\) \{\s*vscode\.postMessage\(createRevisionGraphCopyRefNameMessage\(target\)\);/s);
  assert.match(html, /if \(target\.kind !== 'commit'\) \{\s*appendMenuItem\('Copy Ref Name', \(\) => postCopyRefName\(target\)\);/s);
  assert.doesNotMatch(html, /Copy ref name to clipboard/);
  assert.match(html, /function createRevisionGraphResetToCommitMessage\(target\)/);
  assert.match(html, /type: 'reset-to-commit',\s*commitHash: target\.hash,\s*label: target\.label,\s*targetKind: target\.kind/s);
  assert.match(html, /if \(target\.kind !== 'commit'\) \{\s*message\.targetName = target\.name;\s*\}/s);
  assert.match(html, /function createRevisionGraphCreateBranchMessage\(target\)/);
  assert.match(html, /function postCreateTag\(target\) \{\s*vscode\.postMessage\(createRevisionGraphCreateTagMessage\(target\)\);/s);
  assert.match(html, /let publishedLocalBranchNames = new Set\(\);/);
  assert.match(html, /const stateModel = createRevisionGraphWebviewRuntimeStateModel\(nextState, currentProjectionOptions\);/);
  assert.match(html, /publishedLocalBranchNames = new Set\(stateModel\.publishedLocalBranchNames\);/);
  assert.doesNotMatch(html, /appendMenuSubmenu\('Remote'/);
  assert.match(html, /function getCurrentHeadRemoteActionState\(\)/);
  assert.match(html, /function syncRevisionGraphWebviewRemoteToolbarButton\(/);
  assert.match(html, /`Pull from \$\{upstreamLabel\}`/);
  assert.match(html, /`More push options for \$\{upstreamLabel\}`/);
  assert.match(html, /function postPullCurrentHead\(\) \{\s*vscode\.postMessage\(createRevisionGraphPullCurrentHeadMessage\(\)\);/s);
  assert.match(html, /function createRevisionGraphPushCurrentHeadMessage\(mode\) \{\s*return \{ type: 'push-current-head', mode: mode \};/s);
  assert.match(html, /const canResetToTarget =\s*target\.kind !== 'head' &&\s*target\.kind !== 'stash' &&\s*!\(target\.kind === 'branch' && !!currentHeadName && target\.name === currentHeadName\);/s);
  assert.match(html, /appendMenuItem\('Reset to this', \(\) => postResetToCommit\(target\), \{ destructive: true \}\);/);
  assert.match(html, /function postResetToCommit\(target\) \{\s*vscode\.postMessage\(createRevisionGraphResetToCommitMessage\(target\)\);/s);
  assert.match(html, /function postResetCurrentWorkspace\(includeUntracked\) \{\s*vscode\.postMessage\(createRevisionGraphResetCurrentWorkspaceMessage\(includeUntracked\)\);/s);
  assert.doesNotMatch(html, /canResetCurrentWorkspace/);
  assert.doesNotMatch(html, /appendMenuItem\('Reset Workspace to HEAD'/);
  assert.doesNotMatch(html, /appendMenuItem\('Reset Workspace and Remove Untracked Files'/);
  assert.match(html, /let hasMergeConflicts = false;/);
  assert.match(html, /hasMergeConflicts = stateModel\.hasMergeConflicts;/);
  assert.match(html, /const canStashCurrentWorkspace =\s*target\.kind === 'head' &&\s*isWorkspaceDirty &&\s*!hasMergeConflicts;/s);
  assert.match(html, /if \(canStashCurrentWorkspace\) \{\s*appendMenuSection\('Stash'\);\s*appendMenuItem\('Stash Save', \(\) => postStashSave\(\)\);/s);
  assert.match(html, /if \(target\.kind === 'stash'\) \{\s*appendMenuSection\('Stash'\);\s*appendMenuItem\('Stash Apply', \(\) => postStashApply\(target\)\);\s*appendMenuItem\('Stash Pop', \(\) => postStashPop\(target\)\);\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Remove Stash', \(\) => postStashDrop\(target\), \{ destructive: true \}\);/s);
  assert.match(html, /function createRevisionGraphStashSaveMessage\(\) \{\s*return \{ type: 'stash-save' \};\s*\}/s);
  assert.match(html, /function createRevisionGraphStashApplyMessage\(target\) \{\s*return \{ type: 'stash-apply', refName: target\.name \};\s*\}/s);
  assert.match(html, /function createRevisionGraphStashPopMessage\(target\) \{\s*return \{ type: 'stash-pop', refName: target\.name \};\s*\}/s);
  assert.match(html, /function createRevisionGraphStashDropMessage\(target\) \{\s*return \{ type: 'stash-drop', refName: target\.name \};\s*\}/s);
  assert.match(html, /function postStashSave\(\) \{\s*postMessageWithLoading\(createRevisionGraphStashSaveMessage\(\), 'Saving workspace changes to stash\.\.\.'\);/s);
  assert.match(html, /function postStashApply\(target\) \{\s*vscode\.postMessage\(createRevisionGraphStashApplyMessage\(target\)\);/s);
  assert.match(html, /function postStashPop\(target\) \{\s*vscode\.postMessage\(createRevisionGraphStashPopMessage\(target\)\);/s);
  assert.match(html, /function postStashDrop\(target\) \{\s*vscode\.postMessage\(createRevisionGraphStashDropMessage\(target\)\);/s);
  assert.match(html, /const canPublishBranch =\s*\(target\.kind === 'head' \|\| target\.kind === 'branch'\) &&\s*!publishedLocalBranchNames\.has\(target\.name\);/s);
  assert.match(html, /\}\s*else \{\s*appendFlowGovernanceActions\(flowBranch, target\);\s*appendMenuSection\('Inspect'\);/s);
  assert.match(html, /if \(flowBranch\.kind === 'main'\) \{\s*entries\.push\(\s*\{ label: 'Start New Release', onClick: \(\) => showFlowBranchForm\(target, 'release'\) \},\s*\{ label: 'Start New Feature', onClick: \(\) => showFlowBranchForm\(target, 'feature'\) \},\s*\{ label: 'Start New Hot Fix', onClick: \(\) => showFlowBranchForm\(target, 'hotfix'\) \}\s*\);/s);
  assert.match(html, /flowBranch\.kind === 'feature'[\s\S]*?Start New Task[\s\S]*?showFlowBranchForm\(target, 'task'\)/);
  assert.match(html, /flowBranch\.kind === 'feature'[\s\S]*?Start New Bug[\s\S]*?showFlowBranchForm\(target, 'bug'\)/);
  assert.match(html, /flowBranch\.kind === 'feature'[\s\S]*?Prepare Equalization[\s\S]*?showFlowEqualizationForm\(target\)/);
  assert.match(html, /flowBranch\.kind === 'feature'[\s\S]*?Promotion PR Context[\s\S]*?openFlowPullRequestContextForm\(target\)/);
  assert.match(html, /flowBranch\.kind === 'release'[\s\S]*?Start New Bug[\s\S]*?showFlowBranchForm\(target, 'bug'\)/);
  assert.match(html, /flowBranch\.kind === 'release'[\s\S]*?Prepare Equalization[\s\S]*?showFlowEqualizationForm\(target\)/);
  assert.match(html, /flowBranch\.kind === 'hotfix'[\s\S]*?if \(productionBranchName\)[\s\S]*?Promotion PR Context[\s\S]*?postCopyFlowPullRequestContext\(target\.name, productionBranchName\)/);
  assert.match(html, /targetText\.textContent = 'Target release';/);
  assert.match(html, /candidate\.status === 'production-not-ancestor'[\s\S]*?Production promotion aborted:[\s\S]*?setFlowPullRequestContextActionsEnabled\(false\)/);
  assert.match(html, /candidate\.status === 'production-out-of-sync'[\s\S]*?local production branch is not synchronized[\s\S]*?setFlowPullRequestContextActionsEnabled\(false\)/);
  assert.match(html, /candidate\.status === 'not-ahead'[\s\S]*?has no commits ahead of[\s\S]*?setFlowPullRequestContextActionsEnabled\(false\)/);
  assert.match(html, /appendMenuSubmenu\('Flow Governance', entries\);/);
  assert.match(html, /if \(canPublishBranch\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Publish Branch to Remote', \(\) => postPublishBranch\(target\)\);/s);
  assert.match(html, /let remoteTagPublicationState = new Map\(\);/);
  assert.match(html, /let pendingRemoteTagStateRequests = new Set\(\);/);
  assert.match(html, /case 'set-remote-tag-state':\s*setRemoteTagState\(message\.tagName, message\.state\);/);
  assert.match(html, /remoteTagPublicationState\.set\(tagName, normalizedState\);/);
  assert.match(html, /case 'update-state':\s*applyTracedHostMessage\(message, 'webview\.apply\.update-state', \(\) => \{\s*applyState\(message\.state, false, \{ invalidateRemoteTagState: true \}\);/s);
  assert.match(html, /syncRemoteTagStateCache\(stateModel\.state, previousRepositoryPath, !!options\.invalidateRemoteTagState\);/);
  assert.match(html, /if \(previousRepositoryPath !== nextRepositoryPath \|\| invalidateRemoteTagState\) \{\s*remoteTagPublicationState\.clear\(\);\s*pendingRemoteTagStateRequests\.clear\(\);\s*return;/s);
  assert.match(html, /const currentTagNames = new Set\(\(\(nextState && nextState\.references\) \|\| \[\]\)\s*\.filter\(\(ref\) => ref\.kind === 'tag'\)\s*\.map\(\(ref\) => ref\.name\)\);/s);
  assert.match(html, /const remoteTagState = remoteTagPublicationState\.get\(target\.name\);/);
  assert.match(html, /if \(remoteTagState === 'published'\) \{\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Delete Remote Tag', \(\) => postDeleteRemoteTag\(target\), \{ destructive: true \}\);/s);
  assert.match(html, /}\s*else if \(remoteTagState === 'unpublished'\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Push Tag to Remote', \(\) => postPushTag\(target\)\);/s);
  assert.match(html, /}\s*else if \(remoteTagState === 'unknown'\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Retry Remote Tag Check', \(\) => retryRemoteTagState\(target\)\);/s);
  assert.match(html, /appendMenuItem\('Checking Remote Tag\.\.\.', \(\) =>\s*\{\s*\}, \{ disabled: true \}\);\s*requestRemoteTagState\(target\);/s);
  assert.match(html, /function retryRemoteTagState\(target\) \{\s*if \(!target \|\| target\.kind !== 'tag'\) \{\s*return;\s*\}\s*remoteTagPublicationState\.delete\(target\.name\);\s*requestRemoteTagState\(target\);/s);
  assert.match(html, /function requestRemoteTagState\(target\) \{\s*if \(\s*!target \|\|\s*target\.kind !== 'tag' \|\|\s*remoteTagPublicationState\.has\(target\.name\) \|\|\s*pendingRemoteTagStateRequests\.has\(target\.name\)/s);
  assert.match(html, /function createRevisionGraphResolveRemoteTagStateMessage\(target\)/);
  assert.match(html, /function postDeleteRemoteTag\(target\) \{\s*vscode\.postMessage\(createRevisionGraphDeleteRemoteTagMessage\(target\)\);/s);
  assert.match(html, /target\.kind !== 'commit' && !isCurrentHead && target\.kind !== 'stash'/);
  assert.match(html, /function syncRevisionGraphWebviewSelectionHighlightsUi\(/);
  assert.match(html, /element\.classList\.toggle\('base-target', baseHash === hash\);/);
  assert.match(html, /syncRevisionGraphWebviewSelectionHighlightsUi\(\s*document\.querySelectorAll\('\[data-ref-id\]'\),\s*nodeElements,/s);
  assert.match(html, /<span class="node-base-badge">\(Base\)<\/span>/);
  assert.match(html, /\.node\.base-target\.has-compare \.node-base-badge/);
  assert.match(html, /right: -10px;/);
  assert.match(html, /transform: translate\(100%, -50%\);/);
  assert.doesNotMatch(html, /base-suffix/);
});

test('renders grouped graph context menus', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function appendMenuSubmenu\(label, entries\)/);
  assert.match(html, /\.reference-tooltip \{[\s\S]*?position: fixed;[\s\S]*?width: min\(360px, calc\(100vw - 24px\)\);/s);
  assert.match(html, /function showReferenceTooltip\(refElement\)/);
  assert.equal(html.match(/function showReferenceTooltip\(refElement\)/g)?.length, 1);
  assert.match(html, /reference\.description[\s\S]*?reference-tooltip-description/);
  assert.match(html, /formatWebviewTooltipDate\(node\.date, 'Unknown date'\)/);
  assert.match(html, /function formatWebviewTooltipDate\(value, fallbackText\)/);
  assert.match(html, /new Intl\.DateTimeFormat\('en-US', options\)\.format\(date\)/);
  assert.match(html, /reference-tooltip-kind/);
  assert.match(html, /\.reference-tooltip-kind \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 19px;[\s\S]*?padding: 3px 5px 2px;/s);
  assert.match(html, /flowKindBadges/);
  assert.match(html, /reference-tooltip-kind' \+ kindClass/);
  assert.match(html, /pointer-events: auto;/);
  assert.match(html, /function bindReferenceTooltipEvents\(\)/);
  assert.match(html, /referenceTooltip\.addEventListener\('mouseenter', cancelHideReferenceTooltip\)/);
  assert.match(html, /referenceTooltip\.addEventListener\('mouseleave', scheduleHideReferenceTooltip\)/);
  assert.match(html, /referenceTooltip\.addEventListener\('focusin', cancelHideReferenceTooltip\)/);
  assert.match(html, /referenceTooltip\.addEventListener\('focusout', handleReferenceTooltipFocusOut\)/);
  assert.match(html, /nodeLayer\.addEventListener\('focusout', handleReferenceTooltipReferenceFocusOut\)/);
  assert.match(html, /isReferenceTooltipFocusTarget\(event && event\.relatedTarget\)/);
  assert.match(html, /function clearReferenceTooltipCommitStats\(\)/);
  assert.match(html, /clearReferenceTooltipCommitStats\(\);\s*hideReferenceTooltip\(\);/s);
  assert.match(html, /renderCopyHashIconButton\('reference-tooltip-action reference-tooltip-action-icon', 'data-reference-tooltip-action', 'copy-commit-hash', node\.hash\)/);
  assert.match(html, /\.reference-tooltip-hash \{[\s\S]*?color: var\(--vscode-textLink-foreground, var\(--accent\)\);/s);
  assert.match(html, /\.reference-tooltip-action-icon \{[\s\S]*?width: 22px;[\s\S]*?min-width: 22px;/s);
  assert.match(html, /data-reference-tooltip-action="open-commit-on-github"/);
  assert.match(html, /createRevisionGraphLoadCommitShortStatMessage\(commitHash\)/);
  assert.match(html, /case 'set-commit-short-stat':/);
  assert.match(html, /reference-tooltip-insertions/);
  assert.match(html, /reference-tooltip-deletions/);
  assert.match(html, /function placeReferenceTooltip\(refElement\)/);
  assert.match(html, /tabindex="0" aria-controls="referenceTooltip" aria-haspopup="dialog"/);
  assert.match(html, /const nodeTitle = visibleRefs\.length === 0/);
  assert.match(html, /\.context-menu \{\s*position: fixed;\s*z-index: 60;\s*width: 250px;/s);
  assert.match(html, /\.context-menu-item \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/s);
  assert.match(html, /\.context-menu-item:not\(:disabled\):hover,[\s\S]*?background: color-mix\(in srgb, var\(--accent\) 12%, transparent\);/);
  assert.match(html, /\.context-menu-submenu \{\s*position: relative;\s*\}/s);
  assert.match(html, /\.context-submenu-trigger \{[^}]*justify-content: space-between;/s);
  assert.match(html, /\.context-submenu \{\s*position: fixed;\s*z-index: 61;/s);
  assert.match(html, /\.context-menu-submenu\.open > \.context-submenu \{\s*display: block;\s*\}/s);
  assert.match(html, /\.flow-dialog-backdrop \{\s*position: fixed;\s*inset: 0;\s*z-index: 75;/s);
  assert.match(html, /\.flow-form-input \{[^}]*border: 1px solid var\(--border\);/s);
  assert.match(html, /\.flow-form-field\[hidden\] \{\s*display: none;\s*\}/s);
  assert.match(html, /\.reference-tooltip \{[\s\S]*?position: fixed;[\s\S]*?width: min\(360px, calc\(100vw - 24px\)\);/s);
  assert.match(html, /function showReferenceTooltip\(refElement\)/);
  assert.match(html, /reference\.description[\s\S]*?reference-tooltip-description/);
  assert.match(html, /function placeReferenceTooltip\(refElement\)/);
  assert.match(html, /tabindex="0" aria-controls="referenceTooltip" aria-haspopup="dialog"/);
  assert.match(html, /const nodeTitle = visibleRefs\.length === 0/);
  assert.match(html, /button\.className = 'context-menu-item';/);
  assert.match(html, /button\.className = 'context-menu-item context-submenu-trigger';/);
  assert.doesNotMatch(html, /context-menu-group/);
  assert.match(html, /context-submenu/);
  assert.match(html, /context-menu-chevron/);
  assert.match(html, /function appendMenuSection\(label\)/);
  assert.match(html, /appendMenuSection\('Flow Governance'\);\s*appendMenuSubmenu\('Flow Governance', entries\);/s);
  assert.match(html, /function openContextSubmenu\(group\)/);
  assert.match(html, /function placeContextSubmenu\(group, submenu\)/);
  assert.match(html, /function showFlowBranchForm\(target, branchKind\)/);
  assert.match(html, /taskDevText\.textContent = 'Dev Task \*';/);
  assert.match(html, /shortNameText\.textContent = 'Short name \*';/);
  assert.match(html, /branchKind === 'bug'[\s\S]*?'Bug ID \*'[\s\S]*?branchKind === 'hotfix' \? 'Hotfix ID \*' : 'Dev Task \*'/);
  assert.match(html, /const requiresDescription = branchKind === 'bug' \|\| branchKind === 'hotfix'/);
  assert.match(html, /\(branchKind === 'bug' \|\| branchKind === 'hotfix'\) && !description/);
  assert.match(html, /taskDev \+ '-' \+ shortName/);
  assert.match(html, /!\/\^\[0-9\]\+\$\/\.test\(taskDev\)/);
  assert.match(html, /function getFlowBranchDialogCopy\(branchKind\)/);
  assert.match(html, /nameText\.textContent = 'Name \*';/);
  assert.match(html, /nameInput\.setAttribute\('aria-required', 'true'\);/);
  assert.match(html, /descriptionText\.textContent = 'Description';/);
  assert.match(html, /vscode\.postMessage\(createRevisionGraphStartFlowBranchMessage\(target, branchKind, name, description\)\);/);
  assert.match(html, /function showFlowEqualizationForm\(target\)/);
  assert.match(html, /originText\.textContent = 'Origin branch \*';/);
  assert.match(html, /descriptionText\.textContent = 'Description \*';/);
  assert.match(html, /reference\.kind === 'main' \|\| reference\.kind === 'release'/);
  assert.match(html, /reference\.refName !== targetRefName/);
  assert.match(html, /function postPrepareFlowEqualization\(targetRefName, originRefName, description\)/);
  assert.match(html, /'Preparing equalization\.\.\.'/);
  assert.match(html, /context-separator/);
  assert.match(html, /function createRevisionGraphFocusRangeMessage\(base, compare\)/);
  assert.match(html, /function createRevisionGraphFocusDescendantsMessage\(target\)/);
  assert.match(html, /function createRevisionGraphFocusRangeMessage\(base, compare\) \{[\s\S]*?descendantFocus: null,[\s\S]*?revisionRange:/s);
  assert.match(html, /function createRevisionGraphFocusDescendantsMessage\(target\) \{[\s\S]*?revisionRange: null,[\s\S]*?descendantFocus:/s);
  assert.match(html, /const focusRangeActionLabel = hasComparisonSelection[\s\S]*?getFocusRangeActionLabel\(base, compare\)/);
  assert.match(html, /if \(focusRangeActionLabel\) \{\s*appendMenuItem\(focusRangeActionLabel, \(\) => postFocusRange\(base, compare\)\);\s*\}/);
  assert.match(html, /function getFocusRangeActionLabel\(base, compare, activeRange = currentProjectionOptions\.revisionRange\)/);
  assert.match(html, /function postFocusRange\(base, compare\)/);
  assert.match(html, /function getFocusDescendantsActionLabel\(target, activeFocus = currentProjectionOptions\.descendantFocus\)/);
  assert.match(html, /appendMenuItem\(focusDescendantsActionLabel, \(\) => postFocusDescendants\(target\)\);/);
  assert.match(html, /function postFocusDescendants\(target\)/);
  assert.match(html, /appendMenuSection\('Destructive'\);/);
  assert.match(html, /appendMenuItem\(deleteLabel, \(\) => postDelete\(target\), \{ destructive: true \}\);/);
  assert.match(html, /placeContextMenu\(clientX, clientY\);/);
  assert.doesNotMatch(html, /contextMenu\.querySelector\('\\.context-menu-item'\)\?\.focus\(\);/);
  assert.doesNotMatch(html, /selectionActionBar/);
  assert.doesNotMatch(html, /appendSelectionAction/);
});

test('renders a graph minimap overview with viewport navigation handlers', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /class="graph-minimap"/);
  assert.match(html, /viewBox="0 0 180 240"/);
  assert.match(html, /class="minimap-controls"/);
  assert.match(html, /const minimapZoomLevels = \[0\.75, 1, 1\.35, 1\.75, 2\.25, 3, 4, 5, 6\.5, 8, 10, 12\.5, 15, 18, 22, 26, 30\];/);
  assert.match(html, /let minimapEnabled = initialWebviewState\.showMinimap === true;/);
  assert.match(html, /function syncMinimapPreference\(\)/);
  assert.match(html, /function syncRevisionGraphWebviewMinimapPreferenceUi\(/);
  assert.match(html, /function setMinimapEnabled\(enabled\)/);
  assert.match(html, /showMinimapToggle\.addEventListener\('change'/);
  assert.match(html, /minimapToggle\.checked = enabled;/);
  assert.match(html, /persistRevisionGraphMinimapPreference\(vscode, minimapEnabled\);/);
  assert.match(html, /!minimapEnabled/);
  assert.match(html, /persistRevisionGraphNodeOffsets\(vscode, sceneLayoutKey, normalizedOffsets\);/);
  assert.match(html, /function zoomInMinimap\(\)/);
  assert.match(html, /function zoomOutMinimap\(\)/);
  assert.match(html, /function resetMinimapZoom\(\) \{\s*setMinimapZoom\(1\);\s*\}/s);
  assert.match(
    html,
    /minimapZoomResetButton\.addEventListener\('click', \(event\) => \{\s*event\.stopPropagation\(\);\s*resetMinimapZoom\(\);\s*\}\);/s
  );
  assert.match(html, /graphMinimap\.addEventListener\('mousedown'/);
  assert.match(html, /function syncMinimap\(mode = 'full'\)/);
  assert.match(html, /pendingMinimapSyncFrame = requestAnimationFrame/);
  assert.match(html, /function renderMinimap\(mode = 'full'\)/);
  assert.match(html, /const shouldRenderContent = mode === 'full' \|\| minimapNodeLayer\.innerHTML\.length === 0;/);
  assert.match(html, /viewport\.addEventListener\('scroll', \(\) => \{\s*scheduleVirtualSceneRender\('scroll'\);\s*syncMinimap\('viewport'\);\s*\}\);/);
  assert.match(html, /function renderRevisionGraphWebviewMinimapContent\(/);
  assert.match(html, /renderRevisionGraphWebviewMinimapContent\(\s*graphEdges,/s);
  assert.match(html, /function syncMinimapViewport\(transform\)/);
  assert.match(html, /function syncRevisionGraphWebviewMinimapViewportUi\(/);
  assert.match(html, /function ensureRevisionGraphWebviewMinimapViewportVisibleUi\(/);
  assert.match(html, /function centerViewportFromMinimapEvent\(event\)/);
  assert.match(html, /function getMinimapTransform\(\)/);
  assert.match(html, /const height = 240;/);
  assert.match(html, /const baseScale = Math\.min\(/);
  assert.match(html, /const scale = baseScale \* minimapZoom;/);
  assert.match(html, /graphMinimap\.scrollTop/);
  assert.match(html, /getNodeWidth\(hash\) \* transform\.scale/);
  assert.doesNotMatch(html, /transform\.scaleX/);
  assert.doesNotMatch(html, /const baseScale = Math\.max\(/);
  assert.match(html, /class="minimap-edge"/);
  assert.match(html, /const nodeClass = hash === headNodeHash \? 'minimap-node head' : 'minimap-node';/);
});

test('uses a default cursor on the empty graph viewport', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /\.viewport \{[\s\S]*?cursor: default;/);
  assert.match(html, /\.viewport\.dragging \{[\s\S]*?cursor: grabbing;/);
  assert.match(html, /\.node-grip \{[\s\S]*?cursor: grab;/);
});

test('clears graph drag state when mouse release is missed', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function endPointerDrivenInteractions\(\) \{\s*endMinimapDrag\(\);\s*endNodeDrag\(true\);\s*endViewportDrag\(\);\s*\}/s);
  assert.match(html, /window\.addEventListener\('mouseup', \(\) => \{\s*endPointerDrivenInteractions\(\);\s*\}\);/s);
  assert.match(html, /window\.addEventListener\('blur', endPointerDrivenInteractions\);/);
  assert.match(html, /window\.addEventListener\('dragstart', endPointerDrivenInteractions\);/);
  assert.match(html, /if \(typeof document\.addEventListener === 'function'\) \{\s*document\.addEventListener\('mouseleave', endPointerDrivenInteractions\);\s*\}/s);
  assert.match(html, /if \(event\.buttons !== undefined && \(event\.buttons & 1\) === 0\) \{\s*endViewportDrag\(\);\s*return;\s*\}/s);
  assert.match(html, /function createRevisionGraphWebviewViewportDragState\(/);
  assert.match(html, /function calculateRevisionGraphWebviewViewportDrag\(/);
  assert.match(html, /function calculateRevisionGraphWebviewNodeDragOffset\(/);
  assert.match(html, /function endViewportDrag\(\) \{[\s\S]*?viewport\.classList\.remove\('dragging'\);[\s\S]*?dragState = null;[\s\S]*?return true;\s*\}/s);
});

test('uses principal path highlight for single selection and compare-only highlight for two selections', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /createRevisionGraphWebviewRelationshipHighlights\(/);
  assert.match(html, /if \(highlights\.isComparison\) \{/);
  assert.match(html, /element\.classList\.toggle\('selected', highlights\.selectedHashes\.has\(hash\)\);/);
  assert.match(html, /element\.classList\.remove\('related', 'ancestor-related', 'descendant-related'\);/);
  assert.match(html, /element\.classList\.remove\('related', 'ancestor-path', 'descendant-path', 'muted'\);/);
  assert.match(html, /const ancestorPath = baseHash && !compareHash \? getPrimaryAncestorPath\(baseHash\) : \[\];/);
  assert.match(html, /function getRevisionGraphWebviewPrimaryAncestorPath\(startHash, context\)/);
  assert.match(html, /function buildRevisionGraphWebviewPrimaryAncestorPath\(startHash, primaryAncestorNextByHash\)/);
  assert.match(html, /const nextHash = primaryAncestorNextByHash\[currentHash\];/);
  assert.match(html, /let queueIndex = 0;\s*while \(queueIndex < queue\.length\) \{\s*const hash = queue\[queueIndex\];\s*queueIndex \+= 1;/s);
  assert.match(html, /element\.classList\.toggle\('selected', highlights\.anchorHash === hash\);/);
  assert.match(html, /element\.classList\.toggle\(\s*'related',\s*highlights\.anchorHash !== null\s*&& highlights\.anchorHash !== hash\s*&& highlights\.relatedHashes\.has\(hash\)\s*\);/s);
  assert.match(html, /element\.classList\.toggle\('muted', highlights\.anchorHash !== null && !isRelated\);/);
});

test('renders single-bend edges and compact structural node styling in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /stroke-width="1\.8"/);
  assert.match(html, /function describeRoutedEdgePath\(edge, sourceNode, targetNode\)/);
  assert.match(html, /const bendY = targetY - direction \* approachLength;/);
  assert.match(html, /return routedPath;/);
  assert.match(html, /min-width: 78px;/);
});

test('uses estimated node dimensions before layout reads in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /return Number\(element\.dataset\.nodeWidth \|\| 0\) \|\| element\.offsetWidth \|\| 128;/);
  assert.match(html, /return Number\(element\.dataset\.nodeHeight \|\| 0\) \|\| element\.offsetHeight \|\| 25;/);
});

test('uses cached viewport dimensions for render-time canvas sizing', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /let viewportClientWidth = 0;/);
  assert.match(html, /let viewportClientHeight = 0;/);
  assert.match(html, /function readViewportLayoutSize\(\)/);
  assert.match(html, /function getVisibleViewportSize\(\)/);
  assert.match(
    html,
    /window\.addEventListener\('resize', \(\) => \{\s*readViewportLayoutSize\(\);\s*syncCanvasSize\(\);/s
  );
  assert.match(
    html,
    /function syncCanvasSize\(\) \{[\s\S]*?const visibleSize = getVisibleViewportSize\(\);[\s\S]*?const availableWidth = Math\.max\(baseCanvasWidth, visibleSize\.width \/ currentZoom\);/s
  );
  assert.doesNotMatch(
    html,
    /function syncCanvasSize\(\) \{[\s\S]*?viewport\.clientWidth[\s\S]*?\n    \}/s
  );
});

test('does not keep the legacy client-side auto-arrange routine in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(html, /function autoArrangeLayout\(\)/);
  assert.doesNotMatch(html, /function canAutoArrangeGraph\(\)/);
  assert.doesNotMatch(html, /function autoArrangeTortoiseLayout\(\)/);
  assert.doesNotMatch(html, /function buildNodeFamilyAssignments\(neighborMap\)/);
  assert.doesNotMatch(html, /function buildFamilyAnchorMap\(familyAssignments\)/);
});

test('recenters on initial graph state and exposes a center HEAD action', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /id="centerHeadButton"/);
  assert.match(html, /Center on HEAD/);
  assert.match(html, /const shouldPrecenterViewport = shouldRecenter && !hasRestoredNodeOffsets;/);
  assert.match(html, /renderScene\(nextState, \{ precenterViewport: shouldPrecenterViewport \}\)/);
  assert.match(html, /updateScenePlacement\(\{ source: 'layout' \}\);/);
  assert.match(html, /centerGraphInViewport\(\{ source: 'layout', syncMinimap: false \}\);/);
  assert.match(html, /shouldPrecenterViewport \? 'action=precentered'/);
  assert.match(html, /centerHeadButton\.disabled = toolbarBusy;/);
});

test('omits incremental revision graph patch handlers', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(html, /function applyMetadataPatch\(patch\)/);
  assert.doesNotMatch(html, /function applyReferenceMetadataPatch\(patch\)/);
  assert.doesNotMatch(html, /function applyWorkspaceStatePatch\(patch\)/);
  assert.doesNotMatch(html, /renderVirtualScene\(\{ force: true, reason: 'metadata-patch' \}\);/);
  assert.match(html, /function renderVirtualScene\(options = \{\}\)/);
  assert.match(html, /function rebuildVirtualSceneIndexes\(\)/);
  assert.match(html, /const VIRTUAL_RENDER_BUCKET_SIZE_PX = 1200;/);
  assert.match(html, /visibleLayouts = collectVirtualNodeCandidates\(viewportBounds\)\.filter/);
  assert.match(html, /visibleEdges = collectVirtualEdgeCandidates\(viewportBounds\)\.filter/);
  assert.doesNotMatch(html, /visibleLayouts = graphNodes\.filter/);
  assert.doesNotMatch(html, /visibleEdges = graphEdges\.filter/);
  assert.match(html, /data-node-render-key="/);
  assert.match(html, /nodeLayer\.addEventListener\('click',/);
  assert.match(html, /nodeLayer\.addEventListener\('contextmenu',/);
  assert.match(html, /nodeLayer\.addEventListener\('mousedown',/);
  assert.match(html, /if \(sceneEventHandlersBound \|\| !nodeLayer\) \{/);
  assert.doesNotMatch(html, /for \(const element of document\.querySelectorAll\('\\[data-ref-id\\]'\)\) \{\s*element\.addEventListener\('click'/);
  assert.doesNotMatch(html, /function applyReferenceMetadataPatch\(patch\)[\s\S]*?renderScene[\s\S]*?function applyWorkspaceStatePatch/);
  assert.doesNotMatch(html, /function applyReferenceMetadataPatch\(patch\)[\s\S]*?edgeLayer\.innerHTML[\s\S]*?function applyWorkspaceStatePatch/);
});

test('renders client-side graph search controls and runtime handlers', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /searchInput\.addEventListener\('input'/);
  assert.match(html, /showRemoteBranchesToggle\.addEventListener\('change'/);
  assert.match(html, /showStashesToggle\.addEventListener\('change'/);
  assert.match(html, /showMergeCommitsToggle\.addEventListener\('change'/);
  assert.doesNotMatch(html, /fetchButton\.addEventListener\('click'/);
  assert.match(html, /searchPrevButton\.addEventListener\('click'/);
  assert.match(html, /searchNextButton\.addEventListener\('click'/);
  assert.match(html, /searchClearButton\.addEventListener\('click'/);
  assert.match(html, /rangeFilterClearButton\.addEventListener\('click'/);
  assert.match(html, /createRevisionGraphProjectionOptionsMessage\(\{ revisionRange: null \}\)/);
  assert.match(html, /'Exiting Focus Range\.\.\.'/);
  assert.match(html, /descendantFilterClearButton\.addEventListener\('click'/);
  assert.match(html, /createRevisionGraphProjectionOptionsMessage\(\{ descendantFocus: null \}\)/);
  assert.match(html, /'Exiting Focus Descendants\.\.\.'/);
  assert.match(html, /const options = \{ refScope: nextRefScope, revisionRange: null, descendantFocus: null \};/);
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

test('presents the active Focus Range as a descriptive toolbar state', () => {
  const runtime = createWebviewRuntime();
  const rangeFilter = runtime.elements.get('rangeFilter');
  const rangeFilterLabel = runtime.elements.get('rangeFilterLabel');
  assert.ok(rangeFilter);
  assert.ok(rangeFilterLabel);

  runtime.context.syncRangeFilter({
    baseLabel: 'main',
    compareLabel: 'feature/focus-range'
  });

  assert.equal(rangeFilter.hidden, false);
  assert.equal(rangeFilterLabel.textContent, 'main → feature/focus-range');
  assert.equal(rangeFilterLabel.title, 'Focused range: main → feature/focus-range');
  assert.equal(
    rangeFilter.getAttribute('aria-label'),
    'Focus Range active from main to feature/focus-range'
  );

  runtime.context.syncRangeFilter(null);

  assert.equal(rangeFilter.hidden, true);
  assert.equal(rangeFilterLabel.textContent, '');
  assert.equal(rangeFilterLabel.title, '');
  assert.equal(rangeFilter.getAttribute('aria-label'), 'Focus Range inactive');
});

test('adapts the Focus Range context action to the active interval', () => {
  const runtime = createWebviewRuntime();
  const base = { revision: 'main' };
  const compare = { revision: 'feature/focus-range' };

  assert.equal(runtime.context.getFocusRangeActionLabel(base, compare, undefined), 'Focus Range');
  assert.equal(
    runtime.context.getFocusRangeActionLabel(base, compare, {
      baseRevision: 'release/1.5',
      compareRevision: 'feature/other'
    }),
    'Update Focus Range'
  );
  assert.equal(
    runtime.context.getFocusRangeActionLabel(base, compare, {
      baseRevision: 'main',
      compareRevision: 'feature/focus-range'
    }),
    null
  );
  assert.equal(
    runtime.context.getFocusRangeActionLabel(base, compare, {
      baseRevision: 'feature/focus-range',
      compareRevision: 'main'
    }),
    'Update Focus Range'
  );
});

test('presents active Focus Descendants as a descriptive toolbar state', () => {
  const runtime = createWebviewRuntime();
  const descendantFilter = runtime.elements.get('descendantFilter');
  const descendantFilterLabel = runtime.elements.get('descendantFilterLabel');
  assert.ok(descendantFilter);
  assert.ok(descendantFilterLabel);

  runtime.context.syncDescendantFilter({
    anchorLabel: 'feature/focus-descendants'
  });

  assert.equal(descendantFilter.hidden, false);
  assert.equal(descendantFilterLabel.textContent, 'feature/focus-descendants');
  assert.equal(
    descendantFilterLabel.title,
    'Focused descendants from: feature/focus-descendants'
  );
  assert.equal(
    descendantFilter.getAttribute('aria-label'),
    'Focus Descendants active from feature/focus-descendants'
  );

  runtime.context.syncDescendantFilter(null);

  assert.equal(descendantFilter.hidden, true);
  assert.equal(descendantFilterLabel.textContent, '');
  assert.equal(descendantFilterLabel.title, '');
  assert.equal(descendantFilter.getAttribute('aria-label'), 'Focus Descendants inactive');
});

test('adapts the Focus Descendants context action to the active anchor', () => {
  const runtime = createWebviewRuntime();
  const target = { revision: 'feature/focus-descendants', hash: 'focus1234' };

  assert.equal(
    runtime.context.getFocusDescendantsActionLabel(target, undefined),
    'Focus Descendants'
  );
  assert.equal(
    runtime.context.getFocusDescendantsActionLabel(target, {
      anchorRevision: 'release/other'
    }),
    'Update Focus Descendants'
  );
  assert.equal(
    runtime.context.getFocusDescendantsActionLabel(target, {
      anchorRevision: 'focus1234'
    }),
    null
  );
});

test('builds mutually exclusive range and descendant focus messages', () => {
  const runtime = createWebviewRuntime();
  const descendantMessage = runtime.context.createRevisionGraphFocusDescendantsMessage({
    hash: 'focus1234',
    revision: 'feature/focus-descendants',
    label: 'feature/focus-descendants'
  });
  const rangeMessage = runtime.context.createRevisionGraphFocusRangeMessage(
    { revision: 'main', label: 'main' },
    { revision: 'feature/demo', label: 'feature/demo' }
  );

  assert.equal(descendantMessage.type, 'set-projection-options');
  assert.equal(descendantMessage.options.revisionRange, null);
  assert.equal(descendantMessage.options.descendantFocus.anchorRevision, 'focus1234');
  assert.equal(descendantMessage.options.descendantFocus.anchorLabel, 'feature/focus-descendants');
  assert.equal(rangeMessage.options.descendantFocus, null);
  assert.equal(rangeMessage.options.revisionRange.baseRevision, 'main');
  assert.equal(rangeMessage.options.revisionRange.compareRevision, 'feature/demo');
});

test('renders merge abort as a HEAD context menu action only for conflicted merge state', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(html, /abortMergeButton/);
  assert.match(html, /const canAbortConflictedMerge =\s*target\.kind === 'head' &&\s*hasConflictedMerge;/s);
  assert.match(html, /if \(canAbortConflictedMerge\) \{\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Abort Merge', \(\) => postAbortMerge\(\), \{ destructive: true \}\);/s);
  assert.match(html, /function postAbortMerge\(\) \{\s*postMessageWithLoading\(createRevisionGraphAbortMergeMessage\(\), 'Aborting merge\.\.\.'\);/s);
  assert.doesNotMatch(html, /\.view-controls \.toolbar-button\.destructive/);
  assert.doesNotMatch(html, /open-source-control/);
});

test('does not render a current branch descendants view option', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(html, /showCurrentBranchDescendantsOption/);
  assert.doesNotMatch(html, /current branch descendants/);
});

test('renders Flow Governance badges without hiding branch refs in the webview', () => {
  const runtime = createWebviewRuntime();

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: {
        enabled: true,
        configSource: 'repository',
        diagnostics: [],
        branchKinds: ['main', 'release', 'sync', 'feature', 'unknown'],
        references: [
          {
            refName: 'main',
            kind: 'main',
            isEphemeral: false,
            diagnostics: []
          },
          {
            refName: 'sync/generated',
            kind: 'sync',
            isEphemeral: true,
            diagnostics: []
          },
          {
            refName: 'feature/demo',
            kind: 'feature',
            isEphemeral: false,
            diagnostics: []
          }
        ]
      }
    })
  });

  const flowOptions = runtime.elements.get('flowGovernanceOptions');
  const nodeLayer = runtime.elements.get('nodeLayer');
  assert.ok(flowOptions);
  assert.ok(nodeLayer);

  assert.equal(flowOptions.hidden, false);
  assert.match(nodeLayer.innerHTML, /flow-badge flow-kind-main/);
  assert.match(nodeLayer.innerHTML, /feature\/demo/);
  assert.match(nodeLayer.innerHTML, /sync\/generated/);
});

test('hides Flow Governance controls when repository config is invalid', () => {
  const runtime = createWebviewRuntime();

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: {
        enabled: false,
        configSource: 'invalid',
        diagnostics: [
          {
            code: 'invalid-config',
            severity: 'error',
            message: 'Flow Governance config is invalid.'
          }
        ],
        branchKinds: ['main', 'release', 'sync', 'feature', 'unknown'],
        references: []
      }
    })
  });

  const flowOptions = runtime.elements.get('flowGovernanceOptions');
  assert.ok(flowOptions);

  assert.equal(flowOptions.hidden, true);
});

test('keeps Flow Governance toggle visible when disabled from the webview', () => {
  const runtime = createWebviewRuntime();

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: {
        enabled: false,
        configSource: 'repository',
        diagnostics: [],
        branchKinds: ['main', 'release', 'sync', 'feature', 'unknown'],
        references: []
      }
    })
  });

  const flowOptions = runtime.elements.get('flowGovernanceOptions');
  const flowGovernanceEnabledToggle = runtime.elements.get('flowGovernanceEnabledToggle');
  assert.ok(flowOptions);
  assert.ok(flowGovernanceEnabledToggle);

  assert.equal(flowOptions.hidden, false);
  assert.equal(flowGovernanceEnabledToggle.checked, false);
});

test('renders Flow Governance badges immediately after re-enabling without reopening the graph', () => {
  const runtime = createWebviewRuntime();

  const disabledFlowGovernance = {
    enabled: false,
    configSource: 'repository',
    diagnostics: [],
    branchKinds: ['main', 'feature'],
    references: [
      {
        refName: 'main',
        kind: 'main',
        isEphemeral: false,
        diagnostics: []
      },
      {
        refName: 'feature/demo',
        kind: 'feature',
        isEphemeral: false,
        diagnostics: []
      }
    ]
  };

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: disabledFlowGovernance
    })
  });

  let nodeLayer = runtime.elements.get('nodeLayer');
  assert.ok(nodeLayer);
  assert.doesNotMatch(nodeLayer.innerHTML, /flow-badge flow-kind-main/);

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: {
        ...disabledFlowGovernance,
        enabled: true
      }
    })
  });

  nodeLayer = runtime.elements.get('nodeLayer');
  assert.ok(nodeLayer);
  assert.match(nodeLayer.innerHTML, /flow-badge flow-kind-main/);
});

test('posts Flow Governance option updates from the webview runtime', () => {
  const runtime = createWebviewRuntime();

  runtime.context.handleHostMessage({
    type: 'update-state',
    state: createReadyGraphState({
      flowGovernance: {
        enabled: true,
        configSource: 'repository',
        diagnostics: [],
        branchKinds: ['main', 'sync'],
        references: []
      }
    })
  });
  runtime.context.updateFlowGovernanceOptions({ enabled: false });

  const lastMessage = runtime.postedMessages.at(-1);
  assert.equal(lastMessage.type, 'set-flow-governance-options');
  assert.deepEqual(lastMessage.options, { enabled: false });
});

test('lists main and other active releases as equalization origins', () => {
  const runtime = createWebviewRuntime();
  vm.runInContext(`
    currentFlowGovernance = {
      enabled: true,
      branchKinds: ['main', 'release', 'feature'],
      references: [
        { refName: 'release/2.0.0', kind: 'release' },
        { refName: 'release/1.9.0', kind: 'release' },
        { refName: 'main', kind: 'main' },
        { refName: 'release/1.9.0', kind: 'release' },
        { refName: 'feature/payment', kind: 'feature' }
      ]
    };
  `, runtime.context);

  assert.deepEqual(
    Array.from(runtime.context.getFlowEqualizationOrigins('release/2.0.0')),
    ['main', 'release/1.9.0']
  );
  assert.deepEqual(
    Array.from(runtime.context.getFlowEqualizationOrigins('feature/payment')),
    ['main', 'release/1.9.0', 'release/2.0.0']
  );
});

test('rejects malformed host state before applying it to the webview runtime', () => {
  const runtime = createWebviewRuntime();
  const validMessage = {
    type: 'update-state',
    state: createReadyGraphState()
  };

  assert.equal(runtime.context.isRevisionGraphWebviewHostMessage(validMessage), true);
  assert.equal(
    runtime.context.isRevisionGraphWebviewHostMessage({
      ...validMessage,
      state: createReadyGraphState({ baseCanvasWidth: '900' })
    }),
    false
  );
});

test('normalizes validated host state into the runtime model', () => {
  const runtime = createWebviewRuntime();
  const state = createReadyGraphState({
    currentHeadName: undefined,
    currentHeadUpstreamName: undefined,
    baseCanvasWidth: 0,
    baseCanvasHeight: 0
  });
  const model = runtime.context.createRevisionGraphWebviewRuntimeStateModel(
    state,
    state.projectionOptions
  );

  assert.equal(model.state, state);
  assert.equal(model.currentHeadName, null);
  assert.equal(model.currentHeadUpstreamName, null);
  assert.equal(model.baseCanvasWidth, 880);
  assert.equal(model.baseCanvasHeight, 480);
  assert.deepEqual(Array.from(model.graphEdges), state.scene.edges);
  assert.deepEqual(Array.from(model.references), state.references);
});

test('updates and clears the webview status surface through the typed adapter', () => {
  const runtime = createWebviewRuntime();
  const card = runtime.elements.get('statusCard');
  const message = runtime.elements.get('statusMessage');
  const actionButton = runtime.elements.get('statusActionButton');
  assert.ok(card && message && actionButton);

  runtime.context.showRevisionGraphWebviewStatus(
    { card, message, actionButton },
    'No repository selected.',
    false,
    { action: 'choose-repository', label: 'Choose Repository' }
  );

  assert.equal(card.hidden, false);
  assert.equal(message.textContent, 'No repository selected.');
  assert.equal(actionButton.hidden, false);
  assert.equal(actionButton.textContent, 'Choose Repository');
  assert.equal(actionButton.dataset.action, 'choose-repository');

  runtime.context.hideRevisionGraphWebviewStatus({ card, message, actionButton });
  assert.equal(card.hidden, true);
  assert.equal(message.textContent, '');
  assert.equal(actionButton.hidden, true);
  assert.equal(actionButton.textContent, '');
  assert.equal(actionButton.dataset.action, undefined);
});

test('updates loading accessibility through the typed loading adapter', () => {
  const runtime = createWebviewRuntime();
  const overlay = runtime.elements.get('loadingOverlay');
  const message = runtime.elements.get('loadingMessage');
  assert.ok(overlay && message);
  const bodyAttributes = new Map<string, string>();
  const body = {
    classList: {
      add: () => {},
      remove: () => {}
    },
    setAttribute(name: string, value: string) {
      bodyAttributes.set(name, value);
    },
    removeAttribute(name: string) {
      bodyAttributes.delete(name);
    }
  };
  const elements = { body, overlay, message };

  runtime.context.showRevisionGraphWebviewLoading(elements, 'Reloading revision graph...', 'blocking');
  assert.equal(message.textContent, 'Reloading revision graph...');
  assert.equal(overlay.getAttribute('aria-hidden'), 'false');
  assert.equal(overlay.getAttribute('data-mode'), 'blocking');
  assert.equal(bodyAttributes.get('aria-busy'), 'true');

  runtime.context.showRevisionGraphWebviewLoading(elements, undefined, 'subtle');
  assert.equal(overlay.getAttribute('data-mode'), 'subtle');
  assert.equal(bodyAttributes.get('aria-busy'), undefined);

  runtime.context.hideRevisionGraphWebviewLoading(elements);
  assert.equal(overlay.getAttribute('aria-hidden'), 'true');
  assert.equal(overlay.getAttribute('data-mode'), null);
});

test('marks only the pending toolbar control through the typed adapter', () => {
  const runtime = createWebviewRuntime();
  const pendingControl = runtime.elements.get('reloadButton');
  const otherControl = runtime.elements.get('pushButton');
  assert.ok(pendingControl && otherControl);

  runtime.context.applyRevisionGraphWebviewToolbarBusyState(
    [pendingControl, otherControl],
    true,
    pendingControl
  );
  assert.equal(pendingControl.getAttribute('data-pending'), 'true');
  assert.equal(pendingControl.getAttribute('aria-busy'), 'true');
  assert.equal(otherControl.getAttribute('data-pending'), null);
  assert.equal(otherControl.getAttribute('aria-busy'), null);

  runtime.context.applyRevisionGraphWebviewToolbarBusyState(
    [pendingControl, otherControl],
    false,
    null
  );
  assert.equal(pendingControl.getAttribute('data-pending'), null);
  assert.equal(pendingControl.getAttribute('aria-busy'), null);
});

test('finds visible revision graph search results through the typed query module', () => {
  const runtime = createWebviewRuntime();
  const nodes = [
    {
      hash: 'ff00112233445566',
      row: 2,
      subject: 'Release candidate',
      author: 'Ada Lovelace',
      refs: [{ name: 'release/2.0', kind: 'branch' }]
    },
    {
      hash: 'aa00112233445566',
      row: 1,
      subject: 'Prepare migration',
      author: 'Grace Hopper',
      refs: [{ name: 'hidden/legacy', kind: 'branch' }]
    }
  ];

  assert.equal(runtime.context.normalizeRevisionGraphWebviewSearchQuery('  RELEASE  '), 'release');
  assert.deepEqual(Array.from(runtime.context.getRevisionGraphWebviewSearchResultHashes(
    nodes,
    'release',
    (_hash: string, reference: { name: string }) => reference.name !== 'hidden/legacy'
  )),
    ['ff00112233445566']
  );
  assert.deepEqual(
    Array.from(runtime.context.getRevisionGraphWebviewSearchResultHashes(nodes, 'grace', () => true)),
    ['aa00112233445566']
  );
  assert.deepEqual(
    Array.from(runtime.context.getRevisionGraphWebviewSearchResultHashes(nodes, '', () => true)),
    []
  );
  assert.equal(
    runtime.context.getRevisionGraphWebviewSearchActiveResultIndex(
      ['first', 'second', 'third'],
      'second'
    ),
    1
  );
  assert.equal(
    runtime.context.getRevisionGraphWebviewSearchActiveResultIndex(['first'], 'missing'),
    0
  );
  assert.equal(runtime.context.getRevisionGraphWebviewSearchActiveResultIndex([], 'first'), -1);
  assert.equal(
    runtime.context.normalizeRevisionGraphWebviewSearchResultIndex(['first', 'second', 'third'], -1),
    2
  );
  assert.equal(runtime.context.normalizeRevisionGraphWebviewSearchResultIndex([], 4), -1);
  assert.equal(
    runtime.context.getRevisionGraphWebviewActiveSearchResultHash(['first', 'second'], 1),
    'second'
  );
  assert.equal(runtime.context.getRevisionGraphWebviewActiveSearchResultHash(['first'], 2), null);
});

test('synchronizes revision graph search controls through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const input = runtime.elements.get('searchInput');
  const resultBadge = runtime.elements.get('searchResultBadge');
  const previousButton = runtime.elements.get('searchPrevButton');
  const nextButton = runtime.elements.get('searchNextButton');
  const clearButton = runtime.elements.get('searchClearButton');
  assert.ok(input && resultBadge && previousButton && nextButton && clearButton);

  runtime.context.syncRevisionGraphWebviewSearchUi(
    { input, resultBadge, previousButton, nextButton, clearButton },
    {
      query: 'release',
      isQueryActive: true,
      resultCount: 2,
      activeResultIndex: 1,
      isToolbarBusy: false
    }
  );
  assert.equal(input.value, 'release');
  assert.equal(resultBadge.textContent, '2/2');
  assert.equal(previousButton.disabled, false);
  assert.equal(nextButton.disabled, false);
  assert.equal(clearButton.disabled, false);
  assert.equal(input.disabled, false);

  runtime.context.syncRevisionGraphWebviewSearchUi(
    { input, resultBadge, previousButton, nextButton, clearButton },
    {
      query: '',
      isQueryActive: false,
      resultCount: 0,
      activeResultIndex: -1,
      isToolbarBusy: true
    }
  );
  assert.equal(resultBadge.textContent, '0 results');
  assert.equal(previousButton.disabled, true);
  assert.equal(nextButton.disabled, true);
  assert.equal(clearButton.disabled, true);
  assert.equal(input.disabled, true);
});

test('synchronizes revision graph search highlights through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const firstClasses = new Set<string>();
  const secondClasses = new Set<string>();
  const nodeElements = new Map([
    ['first', { classList: createClassList(firstClasses) }],
    ['second', { classList: createClassList(secondClasses) }]
  ]);

  runtime.context.syncRevisionGraphWebviewSearchHighlights(nodeElements, ['first'], 'first');
  assert.equal(firstClasses.has('search-match'), true);
  assert.equal(firstClasses.has('search-active'), true);
  assert.equal(secondClasses.has('search-match'), false);
  assert.equal(secondClasses.has('search-active'), false);

  runtime.context.syncRevisionGraphWebviewSearchHighlights(nodeElements, ['second'], null);
  assert.equal(firstClasses.has('search-match'), false);
  assert.equal(firstClasses.has('search-active'), false);
  assert.equal(secondClasses.has('search-match'), true);
  assert.equal(secondClasses.has('search-active'), false);
});

test('calculates revision graph relationship highlights through the typed module', () => {
  const runtime = createWebviewRuntime();
  const singleSelection = runtime.context.createRevisionGraphWebviewRelationshipHighlights(
    'selected',
    null,
    ['selected', 'parent'],
    ['selected', 'child']
  );
  assert.equal(singleSelection.isComparison, false);
  assert.equal(singleSelection.anchorHash, 'selected');
  assert.equal(singleSelection.selectedHashes.has('selected'), true);
  assert.equal(singleSelection.relatedHashes.has('parent'), true);
  assert.equal(singleSelection.relatedHashes.has('child'), true);
  assert.equal(singleSelection.ancestorEdgeKeys.has('selected->parent'), true);
  assert.equal(singleSelection.descendantEdgeKeys.has('child->selected'), true);

  const comparisonSelection = runtime.context.createRevisionGraphWebviewRelationshipHighlights(
    'base',
    'compare',
    [],
    []
  );
  assert.equal(comparisonSelection.isComparison, true);
  assert.equal(comparisonSelection.anchorHash, null);
  assert.equal(comparisonSelection.selectedHashes.has('base'), true);
  assert.equal(comparisonSelection.selectedHashes.has('compare'), true);
  assert.equal(comparisonSelection.relatedHashes.size, 0);
});

test('synchronizes revision graph relationship classes through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const selectedClasses = new Set<string>();
  const parentClasses = new Set<string>();
  const childClasses = new Set<string>();
  const ancestorEdgeClasses = new Set<string>();
  const descendantEdgeClasses = new Set<string>();
  const nodeElements = new Map([
    ['selected', { classList: createClassList(selectedClasses) }],
    ['parent', { classList: createClassList(parentClasses) }],
    ['child', { classList: createClassList(childClasses) }]
  ]);
  const edgeElements = [
    createRelationshipEdge('selected', 'parent', ancestorEdgeClasses),
    createRelationshipEdge('child', 'selected', descendantEdgeClasses)
  ];
  const singleSelection = runtime.context.createRevisionGraphWebviewRelationshipHighlights(
    'selected',
    null,
    ['selected', 'parent'],
    ['selected', 'child']
  );

  runtime.context.syncRevisionGraphWebviewRelationshipHighlightsUi(
    nodeElements,
    edgeElements,
    singleSelection
  );
  assert.equal(selectedClasses.has('selected'), true);
  assert.equal(parentClasses.has('related'), true);
  assert.equal(parentClasses.has('ancestor-related'), true);
  assert.equal(childClasses.has('related'), true);
  assert.equal(childClasses.has('descendant-related'), true);
  assert.equal(ancestorEdgeClasses.has('ancestor-path'), true);
  assert.equal(descendantEdgeClasses.has('descendant-path'), true);

  const comparisonSelection = runtime.context.createRevisionGraphWebviewRelationshipHighlights(
    'selected',
    'parent',
    [],
    []
  );
  runtime.context.syncRevisionGraphWebviewRelationshipHighlightsUi(
    nodeElements,
    edgeElements,
    comparisonSelection
  );
  assert.equal(selectedClasses.has('selected'), true);
  assert.equal(parentClasses.has('selected'), true);
  assert.equal(parentClasses.has('related'), false);
  assert.equal(childClasses.has('related'), false);
  assert.equal(ancestorEdgeClasses.has('related'), false);
  assert.equal(descendantEdgeClasses.has('related'), false);
});

test('synchronizes primary revision graph selection classes through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const baseReferenceClasses = new Set<string>();
  const compareReferenceClasses = new Set<string>();
  const otherReferenceClasses = new Set<string>();
  const baseNodeClasses = new Set<string>();
  const compareNodeClasses = new Set<string>();
  const otherNodeClasses = new Set<string>();
  const referenceElements = [
    createSelectionElement('base-ref', baseReferenceClasses),
    createSelectionElement('compare-ref', compareReferenceClasses),
    createSelectionElement('other-ref', otherReferenceClasses)
  ];
  const nodeElements = new Map([
    ['base-hash', { classList: createClassList(baseNodeClasses) }],
    ['compare-hash', { classList: createClassList(compareNodeClasses) }],
    ['other-hash', { classList: createClassList(otherNodeClasses) }]
  ]);

  runtime.context.syncRevisionGraphWebviewSelectionHighlightsUi(
    referenceElements,
    nodeElements,
    'base-ref',
    'compare-ref',
    'base-hash',
    'compare-hash',
    true
  );

  assert.equal(baseReferenceClasses.has('base'), true);
  assert.equal(baseReferenceClasses.has('has-compare'), true);
  assert.equal(compareReferenceClasses.has('compare'), true);
  assert.equal(otherReferenceClasses.has('base'), false);
  assert.equal(baseNodeClasses.has('base-target'), true);
  assert.equal(baseNodeClasses.has('has-compare'), true);
  assert.equal(compareNodeClasses.has('compare-target'), true);
  assert.equal(otherNodeClasses.has('base-target'), false);

  runtime.context.syncRevisionGraphWebviewSelectionHighlightsUi(
    referenceElements,
    nodeElements,
    'base-ref',
    null,
    'base-hash',
    null,
    false
  );

  assert.equal(baseReferenceClasses.has('has-compare'), false);
  assert.equal(compareReferenceClasses.has('compare'), false);
  assert.equal(baseNodeClasses.has('has-compare'), false);
  assert.equal(compareNodeClasses.has('compare-target'), false);
});

test('synchronizes revision graph minimap viewport through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const attributes = new Map<string, string>();
  const minimapViewport = {
    setAttribute(name: string, value: string): void {
      attributes.set(name, value);
    },
    getAttribute(name: string): string | null {
      return attributes.get(name) ?? null;
    }
  };
  const transform = {
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    scale: 2,
    mapX: (value: number) => value * 2,
    mapY: (value: number) => value * 2
  };

  runtime.context.syncRevisionGraphWebviewMinimapViewportUi(minimapViewport, transform, {
    visibleWidth: 80,
    visibleHeight: 60,
    visibleLeft: 40,
    visibleTop: 50
  });

  assert.equal(attributes.get('x'), '80');
  assert.equal(attributes.get('y'), '100');
  assert.equal(attributes.get('width'), '120');
  assert.equal(attributes.get('height'), '100');

  attributes.set('x', '200');
  attributes.set('y', '300');
  attributes.set('width', '20');
  attributes.set('height', '20');
  const graphMinimap = {
    scrollLeft: 0,
    scrollTop: 0,
    clientWidth: 100,
    clientHeight: 100
  };

  runtime.context.ensureRevisionGraphWebviewMinimapViewportVisibleUi(graphMinimap, minimapViewport);

  assert.equal(graphMinimap.scrollLeft, 130);
  assert.equal(graphMinimap.scrollTop, 230);
});

test('synchronizes revision graph minimap preference through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const minimapToggle = { checked: false };
  const graphMinimap = { hidden: false };

  assert.equal(
    runtime.context.syncRevisionGraphWebviewMinimapPreferenceUi(minimapToggle, graphMinimap, true),
    false
  );
  assert.equal(minimapToggle.checked, true);
  assert.equal(graphMinimap.hidden, false);

  assert.equal(
    runtime.context.syncRevisionGraphWebviewMinimapPreferenceUi(minimapToggle, graphMinimap, false),
    true
  );
  assert.equal(minimapToggle.checked, false);
  assert.equal(graphMinimap.hidden, true);
});

test('calculates revision graph viewport dragging through the typed module', () => {
  const runtime = createWebviewRuntime();
  const initialState = runtime.context.createRevisionGraphWebviewViewportDragState(10, 20, 100, 200);

  assert.deepEqual(
    { ...runtime.context.calculateRevisionGraphWebviewViewportDrag(initialState, 12, 23) },
    { scrollLeft: 98, scrollTop: 197, moved: false, shouldSuppressNodeClick: false }
  );
  assert.deepEqual(
    { ...runtime.context.calculateRevisionGraphWebviewViewportDrag(initialState, 15, 18) },
    { scrollLeft: 95, scrollTop: 202, moved: true, shouldSuppressNodeClick: true }
  );
  assert.deepEqual(
    { ...runtime.context.calculateRevisionGraphWebviewViewportDrag(
      { ...initialState, moved: true },
      16,
      18
    ) },
    { scrollLeft: 94, scrollTop: 202, moved: true, shouldSuppressNodeClick: false }
  );
});

test('calculates revision graph viewport positions through the typed module', () => {
  const runtime = createWebviewRuntime();
  const position = runtime.context.calculateRevisionGraphWebviewViewportScrollPosition({
    centerX: 50,
    centerY: 60,
    zoom: 2,
    visibleWidth: 100,
    visibleHeight: 80,
    paddingLeft: 18,
    paddingTop: 18
  });
  assert.deepEqual({ ...position }, { scrollLeft: 68, scrollTop: 98 });

  const sceneCenter = runtime.context.captureRevisionGraphWebviewViewportSceneCenter({
    scrollLeft: position.scrollLeft,
    scrollTop: position.scrollTop,
    zoom: 2,
    visibleWidth: 100,
    visibleHeight: 80,
    paddingLeft: 18,
    paddingTop: 18,
    layoutOffsetX: 5,
    layoutOffsetY: 7
  });
  assert.deepEqual({ ...sceneCenter }, { sceneCenterX: 45, sceneCenterY: 53 });
});

test('calculates revision graph virtual viewport visibility through the typed module', () => {
  const runtime = createWebviewRuntime();
  const bounds = runtime.context.createRevisionGraphWebviewVirtualViewportBounds({
    scrollLeft: 118,
    scrollTop: 18,
    zoom: 1,
    visibleWidth: 100,
    visibleHeight: 80,
    paddingLeft: 18,
    paddingTop: 18,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
    overscanPx: 20
  });
  assert.deepEqual({ ...bounds }, { left: 80, top: 0, right: 220, bottom: 100 });

  const visibleLayout = { hash: 'visible', defaultLeft: 205, defaultTop: 50, width: 20, height: 10 };
  assert.equal(
    runtime.context.isRevisionGraphWebviewVirtualLayoutVisible(visibleLayout, -10, bounds),
    true
  );
  assert.equal(
    runtime.context.isRevisionGraphWebviewVirtualLayoutVisible(
      { hash: 'hidden', defaultLeft: 230, defaultTop: 50, width: 20, height: 10 },
      0,
      bounds
    ),
    false
  );

  const layouts = new Map([
    ['from', { hash: 'from', defaultLeft: 0, defaultTop: 50, width: 10, height: 10 }],
    ['to', { hash: 'to', defaultLeft: 300, defaultTop: 50, width: 10, height: 10 }]
  ]);
  assert.equal(
    runtime.context.isRevisionGraphWebviewVirtualEdgeVisible(
      { from: 'from', to: 'to' },
      bounds,
      new Set(),
      layouts,
      {}
    ),
    true
  );
  assert.equal(
    runtime.context.isRevisionGraphWebviewVirtualEdgeVisible(
      { from: 'missing', to: 'to' },
      bounds,
      new Set(),
      layouts,
      {}
    ),
    false
  );
});

test('builds and queries the revision graph virtual candidate index through the typed module', () => {
  const runtime = createWebviewRuntime();
  const entries = [
    { id: 'spanning', top: 0, bottom: 1_200 },
    { id: 'second-bucket', top: 1_800, bottom: 1_810 },
    { id: 'invalid', top: Number.NaN, bottom: 10 }
  ];
  const index = runtime.context.buildRevisionGraphWebviewVirtualIndex(
    entries,
    1_200,
    (entry: { top: number; bottom: number }) => ({ top: entry.top, bottom: entry.bottom })
  );
  assert.deepEqual([...index.keys()], [0, 1]);
  assert.deepEqual(
    runtime.context.collectRevisionGraphWebviewVirtualIndexCandidates(
      index,
      { top: 1_000, bottom: 1_900 },
      1_200,
      (entry: { id: string }) => entry.id
    ).map((entry: { id: string }) => entry.id),
    ['spanning', 'second-bucket']
  );
  assert.equal(
    runtime.context.getRevisionGraphWebviewVirtualBucketRange(Number.NaN, 10, 1_200),
    null
  );
});

test('calculates revision graph virtual scene bounds and keys through the typed module', () => {
  const runtime = createWebviewRuntime();
  const layouts = new Map([
    ['from', { defaultTop: 100, height: 30 }],
    ['to', { defaultTop: 40, height: 20 }]
  ]);
  assert.deepEqual(
    { ...runtime.context.getRevisionGraphWebviewVirtualEdgeVerticalBounds({ from: 'from', to: 'to' }, layouts) },
    { top: 40, bottom: 130 }
  );
  assert.equal(
    runtime.context.getRevisionGraphWebviewVirtualEdgeVerticalBounds({ from: 'missing', to: 'to' }, layouts),
    null
  );
  assert.equal(
    runtime.context.createRevisionGraphWebviewVirtualEdgeKey({ from: 'from', to: 'to' }),
    'from->to'
  );
  assert.equal(
    runtime.context.createRevisionGraphWebviewVirtualSceneKey(
      new Set(['second', 'first']),
      [{ from: 'second', to: 'first' }, { from: 'first', to: 'third' }]
    ),
    'first,second|first->third,second->first'
  );
});

test('selects the revision graph virtual scene through the typed module', () => {
  const runtime = createWebviewRuntime();
  const selection = runtime.context.selectRevisionGraphWebviewVirtualScene({
    nodeCandidates: [
      { hash: 'visible' },
      { hash: 'hidden' },
      { hash: 'missing-from-scene' }
    ],
    containsSceneNode: (hash: string) => hash !== 'missing-from-scene',
    isLayoutVisible: (layout: { hash: string }) => layout.hash !== 'hidden',
    edgeCandidates: [
      { id: 'visible-edge', from: 'visible' },
      { id: 'hidden-edge', from: 'hidden' }
    ],
    isEdgeVisible: (edge: { id: string; from: string }, visibleHashes: ReadonlySet<string>) =>
      edge.id === 'visible-edge' && visibleHashes.has(edge.from)
  });
  assert.deepEqual(selection.visibleLayouts.map((layout: { hash: string }) => layout.hash), ['visible']);
  assert.deepEqual([...selection.visibleHashes], ['visible']);
  assert.deepEqual(selection.visibleEdges.map((edge: { id: string }) => edge.id), ['visible-edge']);
});

test('renders revision graph edge markup through the typed module', () => {
  const runtime = createWebviewRuntime();
  const layouts = new Map([
    ['parent', { defaultLeft: 0, defaultTop: 0, width: 20, height: 20 }],
    ['child', { defaultLeft: 0, defaultTop: 100, width: 20, height: 20 }]
  ]);
  assert.equal(
    runtime.context.renderRevisionGraphWebviewEdgeMarkup({ from: 'child', to: 'parent' }, layouts, 6),
    '<path class="graph-edge" data-edge-from="child" data-edge-to="parent" d="M 10 14 L 10 106" fill="none" stroke="var(--edge)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"></path>'
  );
  assert.equal(
    runtime.context.renderRevisionGraphWebviewEdgeMarkup({ from: 'missing', to: 'parent' }, layouts, 6),
    ''
  );
  assert.equal(
    runtime.context.describeRevisionGraphWebviewFallbackEdgePath(0, 0, 100, 100),
    'M 0 0 L 100 62 L 100 100'
  );
});

test('builds revision graph node presentation through the typed module', () => {
  const runtime = createWebviewRuntime();
  const node = {
    hash: 'abcdef0123456789',
    refs: [
      { kind: 'branch', name: 'main' },
      { kind: 'remote', name: 'origin/main' }
    ],
    author: 'Ada',
    date: '2026-07-12',
    subject: 'Typed webview runtime'
  };
  const visibleReferences = runtime.context.getRevisionGraphWebviewVisibleNodeReferences(
    node,
    (reference: { id: string }) => reference.id === 'abcdef0123456789::branch::main'
  );
  assert.deepEqual(visibleReferences, [{ kind: 'branch', name: 'main' }]);
  assert.equal(runtime.context.getRevisionGraphWebviewNodePresentationClass(visibleReferences), 'node-branch');
  assert.equal(runtime.context.formatRevisionGraphWebviewNodeSummary(node), 'abcdef01');
  assert.equal(
    runtime.context.formatRevisionGraphWebviewNodeTitle(node, visibleReferences),
    'Refs:\nmain\n\nabcdef0123456789\nTyped webview runtime\nAda on 2026-07-12'
  );
  assert.deepEqual(
    JSON.parse(runtime.context.createRevisionGraphWebviewNodeRenderKey(
      node,
      { width: 100, height: 40, defaultLeft: 10, defaultTop: 20 },
      visibleReferences,
      { enabled: true }
    )),
    {
      hash: 'abcdef0123456789',
      className: 'node-branch',
      width: 100,
      height: 40,
      defaultLeft: 10,
      defaultTop: 20,
      refs: [['branch', 'main']],
      flowGovernance: { enabled: true },
      title: 'Refs:\nmain\n\nabcdef0123456789\nTyped webview runtime\nAda on 2026-07-12',
      summary: ''
    }
  );
});

test('renders revision graph node markup through the typed module', () => {
  const runtime = createWebviewRuntime();
  const branchNode = {
    hash: 'abcdef0123456789',
    refs: [{ kind: 'branch', name: 'release/<next>' }],
    author: 'Ada',
    date: '2026-07-12',
    subject: 'Typed webview runtime'
  };
  const branchMarkup = runtime.context.renderRevisionGraphWebviewNodeMarkup({
    node: branchNode,
    layout: { width: 100, height: 40, defaultLeft: 10, defaultTop: 20 },
    nodeRenderKey: 'key<one>',
    visibleReferences: branchNode.refs,
    getFlowKind: () => 'release',
    flowKindBadges: { release: 'rel' }
  });
  assert.match(branchMarkup, /data-node-render-key="key&lt;one&gt;"/);
  assert.match(branchMarkup, /flow-badge flow-kind-release">rel<\/span>/);
  assert.match(branchMarkup, /data-ref-name="release\/&lt;next&gt;"/);

  const structuralMarkup = runtime.context.renderRevisionGraphWebviewNodeMarkup({
    node: { hash: 'abcdef0123456789', refs: [], subject: 'A < B & "C"' },
    layout: { width: 60, height: 24, defaultLeft: 0, defaultTop: 0 },
    nodeRenderKey: 'structural',
    visibleReferences: [],
    getFlowKind: () => null,
    flowKindBadges: {}
  });
  assert.match(structuralMarkup, /class="node node-structural"/);
  assert.match(structuralMarkup, /node-summary">abcdef01<\/div>/);
  assert.match(structuralMarkup, /title="abcdef0123456789\nA &lt; B &amp; &quot;C&quot;/);
});

test('commits revision graph virtual scene markup through the typed module', () => {
  const runtime = createWebviewRuntime();
  const markup = runtime.context.createRevisionGraphWebviewVirtualSceneMarkup({
    visibleLayouts: ['first', 'second'],
    visibleEdges: ['edge'],
    renderNodeMarkup: (layout: string) => `<node>${layout}</node>`,
    renderEdgeMarkup: (edge: string) => `<edge>${edge}</edge>`
  });
  assert.deepEqual({ ...markup }, {
    nodeMarkup: '<node>first</node><node>second</node>',
    edgeMarkup: '<edge>edge</edge>'
  });

  const nodeLayer = { innerHTML: 'stale nodes' };
  const edgeLayer = { innerHTML: 'stale edges' };
  runtime.context.commitRevisionGraphWebviewVirtualSceneDom({ nodeLayer, edgeLayer }, markup);
  assert.equal(nodeLayer.innerHTML, '<node>first</node><node>second</node>');
  assert.equal(edgeLayer.innerHTML, '<edge>edge</edge>');
  runtime.context.clearRevisionGraphWebviewVirtualSceneDom({ nodeLayer, edgeLayer });
  assert.equal(nodeLayer.innerHTML, '');
  assert.equal(edgeLayer.innerHTML, '');
});

test('coordinates revision graph virtual scene lifecycle through the typed module', () => {
  const runtime = createWebviewRuntime();
  assert.deepEqual(
    { ...runtime.context.createRevisionGraphWebviewVirtualSceneRenderDecision(false, 'same', 'same') },
    { shouldCommit: false, nextSceneKey: 'same' }
  );
  assert.deepEqual(
    { ...runtime.context.createRevisionGraphWebviewVirtualSceneRenderDecision(true, 'same', 'same') },
    { shouldCommit: true, nextSceneKey: 'same' }
  );

  const effects: string[] = [];
  runtime.context.completeRevisionGraphWebviewVirtualSceneCommit({
    sceneKey: 'next',
    setSceneKey: (sceneKey: string) => effects.push(`key:${sceneKey}`),
    refreshGraphCaches: () => effects.push('caches'),
    applyNodeLayout: () => effects.push('layout'),
    syncSelection: () => effects.push('selection'),
    syncSearchHighlights: () => effects.push('search')
  });
  assert.deepEqual(effects, ['key:next', 'caches', 'layout', 'selection', 'search']);
  runtime.context.resetRevisionGraphWebviewVirtualSceneKey(
    (sceneKey: string) => effects.push(`reset:${sceneKey}`)
  );
  assert.equal(effects.at(-1), 'reset:');
});

test('schedules revision graph virtual scene renders through the typed module', () => {
  const runtime = createWebviewRuntime();
  const events: string[] = [];
  let frameCallback: (() => void) | undefined;
  const scheduled = runtime.context.scheduleRevisionGraphWebviewVirtualSceneRender({
    force: true,
    pendingFrame: 0,
    setSceneKey: (sceneKey: string) => events.push(`key:${sceneKey}`),
    setPendingFrame: (frame: number) => events.push(`pending:${frame}`),
    requestFrame: (callback: () => void) => {
      frameCallback = callback;
      return 42;
    },
    render: () => events.push('render')
  });
  assert.equal(scheduled, true);
  assert.deepEqual(events, ['key:', 'pending:42']);
  assert.ok(frameCallback);
  frameCallback();
  assert.deepEqual(events, ['key:', 'pending:42', 'pending:0', 'render']);

  assert.equal(
    runtime.context.scheduleRevisionGraphWebviewVirtualSceneRender({
      force: true,
      pendingFrame: 42,
      setSceneKey: (sceneKey: string) => events.push(`blocked-key:${sceneKey}`),
      setPendingFrame: (frame: number) => events.push(`blocked-pending:${frame}`),
      requestFrame: () => 99,
      render: () => events.push('blocked-render')
    }),
    false
  );
  assert.deepEqual(events.slice(-1), ['blocked-key:']);
});

test('coordinates revision graph scene rendering through the typed lifecycle', () => {
  const runtime = createWebviewRuntime();
  const readyEvents: string[] = [];
  runtime.context.runRevisionGraphWebviewSceneRenderLifecycle({
    isReady: true,
    shouldPrecenterViewport: true,
    prepareGeometry: () => readyEvents.push('geometry'),
    clearScene: () => readyEvents.push('clear'),
    refreshGraphCaches: () => readyEvents.push('caches'),
    syncCanvasAndPlacement: () => readyEvents.push('canvas'),
    prepareIndexes: () => readyEvents.push('indexes'),
    precenterViewport: () => readyEvents.push('precenter'),
    renderVirtualScene: () => readyEvents.push('render'),
    bindSceneEventHandlers: () => readyEvents.push('bind')
  });
  assert.deepEqual(readyEvents, [
    'geometry', 'indexes', 'precenter', 'render', 'caches', 'bind', 'canvas'
  ]);

  const emptyEvents: string[] = [];
  runtime.context.runRevisionGraphWebviewSceneRenderLifecycle({
    isReady: false,
    shouldPrecenterViewport: true,
    prepareGeometry: () => emptyEvents.push('geometry'),
    clearScene: () => emptyEvents.push('clear'),
    refreshGraphCaches: () => emptyEvents.push('caches'),
    syncCanvasAndPlacement: () => emptyEvents.push('canvas'),
    prepareIndexes: () => emptyEvents.push('indexes'),
    precenterViewport: () => emptyEvents.push('precenter'),
    renderVirtualScene: () => emptyEvents.push('render'),
    bindSceneEventHandlers: () => emptyEvents.push('bind')
  });
  assert.deepEqual(emptyEvents, ['geometry', 'clear', 'caches', 'canvas']);
});

test('applies revision graph scene geometry through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const canvas = runtime.elements.get('canvas');
  const sceneLayer = runtime.elements.get('sceneLayer');
  const graphSvg = runtime.elements.get('graphSvg');
  assert.ok(canvas && sceneLayer && graphSvg);
  runtime.context.applyRevisionGraphWebviewSceneGeometry(
    { canvas, sceneLayer, graphSvg },
    900,
    500
  );
  assert.equal(canvas.style.width, '900px');
  assert.equal(canvas.style.height, '500px');
  assert.equal(sceneLayer.style.width, '900px');
  assert.equal(sceneLayer.style.height, '500px');
  assert.equal(graphSvg.getAttribute('viewBox'), '0 0 900 500');
});

test('calculates revision graph node drag bounds through the typed module', () => {
  const runtime = createWebviewRuntime();

  assert.equal(
    runtime.context.calculateRevisionGraphWebviewNodeLeft(100, 50, 80, 300),
    150
  );
  assert.equal(
    runtime.context.calculateRevisionGraphWebviewNodeOffset(100, -200, 80, 300),
    -100
  );
  assert.equal(
    runtime.context.calculateRevisionGraphWebviewNodeDragOffset(10, 10, 30, 2, 100, 80, 300),
    20
  );
  assert.equal(
    runtime.context.calculateRevisionGraphWebviewNodeDragOffset(10, 10, 800, 1, 100, 80, 300),
    120
  );
});

test('synchronizes revision graph remote toolbar through the typed DOM adapter', () => {
  const runtime = createWebviewRuntime();
  const pullButton = runtime.elements.get('pullButton');
  const pushButton = runtime.elements.get('pushButton');
  const pushMenuButton = runtime.elements.get('pushMenuButton');
  const syncButton = runtime.elements.get('syncButton');
  assert.ok(pullButton && pushButton && pushMenuButton && syncButton);

  runtime.context.syncRevisionGraphWebviewRemoteToolbarUi(
    { pullButton, pushButton, pushMenuButton, syncButton },
    false,
    true,
    'origin/main'
  );
  assert.equal(pullButton.disabled, false);
  assert.equal(pushButton.title, 'Push to origin/main');
  assert.equal(pushMenuButton.getAttribute('aria-label'), 'More push options for origin/main');
  assert.equal(syncButton.title, 'Sync with origin/main');

  runtime.context.syncRevisionGraphWebviewRemoteToolbarUi(
    { pullButton, pushButton, pushMenuButton, syncButton },
    true,
    true,
    'origin/main'
  );
  assert.equal(pullButton.disabled, true);
  assert.equal(pushButton.disabled, true);
  assert.equal(pushMenuButton.disabled, true);
  assert.equal(syncButton.disabled, true);
});

test('renders revision graph minimap SVG content through the typed module', () => {
  const runtime = createWebviewRuntime();
  const geometry = {
    getNodeCenterX(hash: string): number {
      return hash === 'head' ? 10 : 30;
    },
    getNodeTop(hash: string): number {
      return hash === 'head' ? 20 : 40;
    },
    getNodeLeft(hash: string): number {
      return hash === 'head' ? 5 : 25;
    },
    getNodeWidth(): number {
      return 12;
    },
    getNodeHeight(hash: string): number {
      return hash === 'head' ? 8 : 10;
    },
    offsetX: 1,
    offsetY: 2
  };
  const content = runtime.context.renderRevisionGraphWebviewMinimapContent(
    [
      { from: 'head', to: 'child' },
      { from: 'head', to: 'missing' }
    ],
    ['head', 'child'],
    new Set(['head', 'child']),
    'head',
    {
      scale: 0.1,
      mapX: (value: number) => value * 2,
      mapY: (value: number) => value * 2
    },
    geometry
  );

  assert.equal(
    content.edgeMarkup,
    '<line class="minimap-edge" x1="22" y1="52" x2="62" y2="94"></line>'
  );
  assert.match(content.nodeMarkup, /<rect class="minimap-node head" x="12" y="44" width="2" height="2" rx="1\.5"><\/rect>/);
  assert.match(content.nodeMarkup, /<rect class="minimap-node" x="52" y="84" width="2" height="2" rx="1\.5"><\/rect>/);
});

test('traces revision graph primary paths through the typed graph module', () => {
  const runtime = createWebviewRuntime();
  const nodes = [
    { hash: 'head', lane: 0, row: 0, defaultLeft: 0 },
    { hash: 'parent', lane: 0, row: 1, defaultLeft: 0 },
    { hash: 'grandparent', lane: 0, row: 2, defaultLeft: 0 },
    { hash: 'alternate', lane: 2, row: 1, defaultLeft: 100 }
  ];
  const edges = [
    { from: 'head', to: 'parent' },
    { from: 'parent', to: 'grandparent' },
    { from: 'head', to: 'alternate' }
  ];
  const parentMap = runtime.context.buildRevisionGraphWebviewDirectionalMap(nodes, edges, 'from', 'to');
  const childMap = runtime.context.buildRevisionGraphWebviewDirectionalMap(nodes, edges, 'to', 'from');
  const headDistanceByHash = runtime.context.buildRevisionGraphWebviewDistanceMap('head', parentMap);
  const context = {
    primaryAncestorNextByHash: {},
    parentMap,
    childMap,
    headDistanceByHash,
    nodesByHash: new Map(nodes.map((node) => [node.hash, node]))
  };

  assert.deepEqual(
    Array.from(runtime.context.getRevisionGraphWebviewPrimaryAncestorPath('head', context)),
    ['head', 'parent', 'grandparent']
  );
  assert.deepEqual(
    Array.from(runtime.context.traceRevisionGraphWebviewPrimaryPath('grandparent', 'descendant', context)),
    ['grandparent', 'parent', 'head']
  );
  assert.deepEqual(
    Array.from(runtime.context.getRevisionGraphWebviewPrimaryAncestorPath('head', {
      ...context,
      primaryAncestorNextByHash: { head: 'alternate' }
    })),
    ['head', 'alternate']
  );
});

function createClassList(classes: Set<string>) {
  return {
    toggle(name: string, enabled: boolean): void {
      if (enabled) {
        classes.add(name);
        return;
      }
      classes.delete(name);
    },
    remove(...names: string[]): void {
      for (const name of names) {
        classes.delete(name);
      }
    }
  };
}

function createRelationshipEdge(fromHash: string, toHash: string, classes: Set<string>) {
  return {
    classList: createClassList(classes),
    getAttribute(name: string): string | null {
      if (name === 'data-edge-from') {
        return fromHash;
      }
      if (name === 'data-edge-to') {
        return toHash;
      }
      return null;
    }
  };
}

function createSelectionElement(referenceId: string, classes: Set<string>) {
  return {
    classList: createClassList(classes),
    getAttribute(name: string): string | null {
      return name === 'data-ref-id' ? referenceId : null;
    }
  };
}

function createReadyGraphState(overrides: Record<string, unknown> = {}) {
  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: '/workspace/repo',
    currentHeadName: 'main',
    currentHeadUpstreamName: 'origin/main',
    publishedLocalBranchNames: ['main'],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
    projectionOptions: {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showMergeCommits: false,
      showCurrentBranchDescendants: false,
      revisionRange: undefined,
      descendantFocus: undefined
    },
    mergeBlockedTargets: [],
    primaryAncestorNextByHash: {},
    scene: {
      nodes: [
        {
          hash: 'head1',
          row: 0,
          refs: [{ name: 'main', kind: 'head' }],
          author: 'Ada',
          date: '2026-04-08',
          subject: 'Bootstrap'
        },
        {
          hash: 'sync1',
          row: 1,
          refs: [{ name: 'sync/generated', kind: 'branch' }],
          author: 'Ada',
          date: '2026-04-09',
          subject: 'Generated sync'
        },
        {
          hash: 'feature1',
          row: 2,
          refs: [{ name: 'feature/demo', kind: 'branch' }],
          author: 'Ada',
          date: '2026-04-10',
          subject: 'Feature work'
        }
      ],
      edges: [
        { from: 'head1', to: 'sync1' },
        { from: 'sync1', to: 'feature1' }
      ],
      laneCount: 2,
      rowCount: 3
    },
    nodeLayouts: [
      { hash: 'head1', lane: 0, row: 0, x: 0, width: 140, height: 40, defaultLeft: 26, defaultTop: 88 },
      { hash: 'sync1', lane: 1, row: 1, x: 180, width: 160, height: 40, defaultLeft: 206, defaultTop: 176 },
      { hash: 'feature1', lane: 1, row: 2, x: 240, width: 160, height: 40, defaultLeft: 266, defaultTop: 264 }
    ],
    references: [
      { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head' },
      { id: 'sync1::branch::sync/generated', hash: 'sync1', name: 'sync/generated', kind: 'branch' },
      { id: 'feature1::branch::feature/demo', hash: 'feature1', name: 'feature/demo', kind: 'branch' }
    ],
    sceneLayoutKey: 'head1:0:0|sync1:1:180|feature1:2:240',
    baseCanvasWidth: 900,
    baseCanvasHeight: 500,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined,
    ...overrides
  };
}

function createWebviewRuntime() {
  const script = readRevisionGraphRuntimeSource();

  class MockElement {
    readonly listeners: Record<string, Array<(...args: any[]) => unknown>> = {};
    readonly style = { width: '', height: '', left: '', top: '', transform: '' };
    readonly dataset: Record<string, string> = {};
    readonly classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    };
    readonly attributes = new Map<string, string>();
    innerHTML = '';
    hidden = false;
    disabled = false;
    checked = false;
    value = '';
    textContent = '';
    title = '';
    offsetWidth = 120;
    offsetHeight = 40;
    clientWidth = 1200;
    clientHeight = 800;
    scrollLeft = 0;
    scrollTop = 0;

    constructor(readonly id: string) {}

    addEventListener(type: string, listener: (...args: any[]) => unknown): void {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
    }

    setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }

    removeAttribute(name: string): void {
      this.attributes.delete(name);
    }

    getAttribute(name: string): string | null {
      return this.attributes.get(name) ?? null;
    }

    contains(): boolean {
      return false;
    }

    focus(): void {}

    blur(): void {}

    select(): void {}

    closest(): null {
      return null;
    }

    querySelectorAll(): MockElement[] {
      return [];
    }

    getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
      return {
        left: 0,
        top: 0,
        width: this.clientWidth,
        height: this.clientHeight
      };
    }
  }

  const ids = [
    'viewport',
    'canvas',
    'sceneLayer',
    'graphSvg',
    'edgeLayer',
    'nodeLayer',
    'statusCard',
    'statusMessage',
    'statusActionButton',
    'contextMenu',
    'referenceTooltip',
    'graphMinimap',
    'minimapSvg',
    'minimapEdgeLayer',
    'minimapNodeLayer',
    'minimapViewport',
    'minimapZoomOutButton',
    'minimapZoomResetButton',
    'minimapZoomInButton',
    'loadingOverlay',
    'loadingMessage',
    'reloadButton',
    'reloadMenuButton',
    'fetchAllButton',
    'pullButton',
    'pushButton',
    'pushMenuButton',
    'syncButton',
    'scopeSelect',
    'viewOptions',
    'viewOptionsButton',
    'viewOptionsMenu',
    'showTagsToggle',
    'showRemoteBranchesToggle',
    'showStashesToggle',
    'showMergeCommitsToggle',
    'showMinimapToggle',
    'flowGovernanceOptions',
    'flowGovernanceEnabledToggle',
    'searchInput',
    'searchResultBadge',
    'searchPrevButton',
    'searchNextButton',
    'searchClearButton',
    'rangeFilter',
    'rangeFilterLabel',
    'rangeFilterClearButton',
    'descendantFilter',
    'descendantFilterLabel',
    'descendantFilterClearButton',
    'centerHeadButton',
    'zoomOutButton',
    'zoomResetButton',
    'zoomInButton'
  ] as const;
  const elements = new Map<string, MockElement>(ids.map((id) => [id, new MockElement(id)]));
  const document = {
    body: {
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      setAttribute: () => {},
      removeAttribute: () => {}
    },
    activeElement: null,
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName: string) {
      return new MockElement(tagName);
    }
  };
  const windowObject = {
    addEventListener: () => {}
  };
  const vscodeState: Record<string, unknown> = {};
  const postedMessages: any[] = [];
  const context = {
    console,
    window: windowObject,
    document,
    requestAnimationFrame: (callback: (timestamp: number) => void) => {
      callback(0);
      return 1;
    },
    acquireVsCodeApi: () => ({
      postMessage: (message: any) => {
        postedMessages.push(message);
      },
      setState: (value: Record<string, unknown>) => {
        Object.assign(vscodeState, value);
      },
      getState: () => vscodeState
    }),
    setTimeout,
    clearTimeout,
    Map,
    Set
  } as Record<string, unknown>;

  vm.createContext(context);
  vm.runInContext(script, context);

  return {
    context: context as Record<string, any>,
    elements,
    postedMessages
  };
}

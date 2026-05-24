import test from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';

import { renderRevisionGraphShellHtml } from '../src/revisionGraphWebview';

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
  assert.match(html, /id="showMinimapToggle"/);
  assert.match(html, /Show Minimap/);
  assert.doesNotMatch(html, /showCurrentBranchDescendantsToggle/);
  assert.doesNotMatch(html, /Show Current Branch Descendants/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /Find in graph\.\.\./);
  assert.match(html, /id="searchResultBadge"/);
  assert.match(html, /id="searchPrevButton"/);
  assert.match(html, /id="searchNextButton"/);
  assert.match(html, /id="searchClearButton"/);
  assert.doesNotMatch(html, /id="fetchButton"/);
  assert.doesNotMatch(html, />\s*<span class="button-icon">↓<\/span>\s*<span>Fetch<\/span>/);
  assert.match(html, /id="reloadButton"/);
  assert.match(html, />\s*<span class="button-icon">&#8635;<\/span>\s*<span>Reload<\/span>/);
  assert.match(html, /class="workspace-led clean"/);
  assert.match(html, /<div class="toolbar-actions" aria-label="Graph actions">\s*<button\s+id="reloadButton"/);
  assert.match(html, /id="workspaceLed"/);
  assert.match(html, /id="abortMergeButton"/);
  assert.match(html, /Abort Merge/);
  assert.match(html, /id="zoomOutButton"/);
  assert.match(html, /id="zoomResetButton"/);
  assert.match(html, /id="zoomInButton"/);
  assert.match(html, /id="graphSvg"/);
  assert.match(html, /id="edgeLayer"/);
  assert.match(html, /id="nodeLayer"/);
  assert.match(html, /id="statusCard"/);
  assert.match(html, /id="statusMessage"/);
  assert.match(html, /id="statusActionButton"/);
  assert.match(html, /id="graphMinimap"/);
  assert.match(html, /id="minimapZoomOutButton"/);
  assert.match(html, /id="minimapZoomResetButton"/);
  assert.match(html, /id="minimapZoomInButton"/);
  assert.match(html, /id="minimapEdgeLayer"/);
  assert.match(html, /id="minimapNodeLayer"/);
  assert.match(html, /id="minimapViewport"/);
  assert.match(html, /window\.addEventListener\('message'/);
  assert.match(html, /vscode\.postMessage\(\{ type: 'webview-ready' \}\);/);
  assert.match(html, /case 'init-state'/);
  assert.match(html, /case 'update-state'/);
  assert.match(html, /case 'patch-metadata'/);
  assert.match(html, /case 'patch-workspace-state'/);
  assert.match(html, /function applyTracedHostMessage\(message, phase, apply\)/);
  assert.match(html, /function traceWebviewPhase\(phase, work, detail = ''\)/);
  assert.match(html, /webview\.canvas-layout\.sync-size/);
  assert.match(html, /webview\.canvas-layout\.scene-placement/);
  assert.match(html, /webview\.render-scene\.nodes-html/);
  assert.match(html, /webview\.apply\.viewport-frame/);
  assert.match(html, /type: 'load-trace'/);
  assert.match(html, /case 'set-loading'/);
  assert.match(html, /case 'set-error'/);
  assert.match(html, /--node-branch: #19d60f;/);
  assert.match(html, /--node-stash: #8c8f97;/);
  assert.match(html, /--toolbar-safe-height: 68px/);
  assert.match(html, /--graph-top-offset: calc\(var\(--toolbar-safe-height\) \+ 1px\)/);
  assert.match(html, /top: var\(--graph-top-offset\);/);
  assert.match(html, /right: 0;/);
  assert.match(html, /bottom: 0;/);
  assert.match(html, /left: 0;/);
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
  assert.match(html, /function showLoading\(label, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function runWithLoading\(label, work, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function hideLoading\(\)/);
  assert.match(html, /function showError\(message\)/);
  assert.match(
    html,
    /if \(nextState\.loading\) \{\s*hideStatus\(\);\s*showLoading\(nextState\.loadingLabel \|\| 'Loading revision graph\.\.\.', null, 'blocking'\);\s*\} else \{\s*hideLoading\(\);\s*\}/s
  );
  assert.match(html, /data-pending="true"/);
  assert.match(html, /class="loading-overlay"/);
  assert.match(html, /body\.classList\.remove\('loading', 'loading-subtle'\);/);
  assert.match(html, /loadingOverlay\.setAttribute\('data-mode', mode\);/);
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

  assert.match(html, /const reloadButton = document\.getElementById\('reloadButton'\);/);
  assert.match(
    html,
    /reloadButton\.addEventListener\('click', \(\) => \{\s*postMessageWithLoading\(\{ type: 'refresh' \}, 'Reloading revision graph\.\.\.', reloadButton\);/s
  );
  assert.match(html, /reloadButton\.disabled = toolbarBusy;/);
  assert.match(html, /searchClearButton,\s*reloadButton,\s*centerHeadButton,/s);
  assert.match(html, /zoomOutButton,\s*zoomResetButton,\s*zoomInButton,/s);
  assert.match(html, /minimapZoomOutButton,\s*minimapZoomResetButton,\s*minimapZoomInButton,/s);
});

test('preserves the current viewport when zooming or resetting from toolbar buttons', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /const zoomLevels = \[0\.1, 0\.2, 0\.3, 0\.4, 0\.5, 0\.6, 0\.8, 1, 1\.25, 1\.5\];/);
  assert.match(
    html,
    /function setZoom\(zoom, options = \{\}\) \{\s*const shouldPreserveViewport = options\.preserveViewport !== false;\s*const scenePlacementSnapshot = shouldPreserveViewport \? captureScenePlacementSnapshot\(\) : null;\s*const viewportSnapshot = shouldPreserveViewport \? captureViewportSnapshot\(\) : null;[\s\S]*?restoreViewportSnapshot\(viewportSnapshot\);/s
  );
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
        showCurrentBranchDescendants: true
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
  assert.match(html, /function getStructuralNodeTarget\(hash\) \{/);
  assert.match(html, /function postShowLogTarget\(target\) \{\s*vscode\.postMessage\(\{\s*type: 'show-log',\s*source: \{\s*kind: 'target',\s*revision: target\.revision,\s*label: target\.label/s);
  assert.match(html, /function postShowLogRange\(base, compare\) \{\s*vscode\.postMessage\(\{\s*type: 'show-log',\s*source: \{\s*kind: 'range',\s*baseRevision: base\.revision,\s*baseLabel: base\.label,\s*compareRevision: compare\.revision,\s*compareLabel: compare\.label/s);
  assert.match(html, /base\.hash === target\.hash/);
  assert.match(html, /compare\.hash === target\.hash/);
  assert.match(html, /function postCompareWithWorktree\(target\) \{\s*vscode\.postMessage\(\{ type: 'compare-with-worktree', revision: target\.revision, label: target\.label \}\);/s);
  assert.match(html, /function postCopyCommitHash\(commitHash\) \{\s*vscode\.postMessage\(\{ type: 'copy-commit-hash', commitHash \}\);/s);
  assert.match(html, /function postCopyRefName\(target\) \{\s*vscode\.postMessage\(\{ type: 'copy-ref-name', refName: target\.name, refKind: target\.kind \}\);/s);
  assert.match(html, /if \(target\.kind !== 'commit'\) \{\s*appendMenuItem\('Copy ref name to clipboard', \(\) => postCopyRefName\(target\)\);/s);
  assert.match(html, /type: 'create-branch',\s*revision: target\.revision,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /function postCreateTag\(target\) \{\s*vscode\.postMessage\(\{\s*type: 'create-tag',\s*revision: target\.revision,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /let publishedLocalBranchNames = new Set\(\);/);
  assert.match(html, /publishedLocalBranchNames = new Set\(nextState\.publishedLocalBranchNames \|\| \[\]\);/);
  assert.match(html, /const canSyncCurrentHead =\s*target\.kind === 'head' &&\s*!!currentHeadUpstreamName &&\s*publishedLocalBranchNames\.has\(target\.name\);/s);
  assert.match(html, /appendMenuSubmenu\('Remote', \[/);
  assert.match(html, /\{ label: 'Pull from ' \+ currentHeadUpstreamName, onClick: \(\) => postPullCurrentHead\(\) \}/);
  assert.match(html, /\{ label: 'Push to ' \+ currentHeadUpstreamName, onClick: \(\) => postPushCurrentHead\(\) \}/);
  assert.match(html, /\{ label: 'Sync with ' \+ currentHeadUpstreamName, onClick: \(\) => postSyncCurrentHead\(\) \}/);
  assert.match(html, /function postPullCurrentHead\(\) \{\s*vscode\.postMessage\(\{ type: 'pull-current-head' \}\);/s);
  assert.match(html, /function postPushCurrentHead\(\) \{\s*vscode\.postMessage\(\{ type: 'push-current-head' \}\);/s);
  assert.match(html, /function postResetCurrentWorkspace\(includeUntracked\) \{\s*vscode\.postMessage\(\{ type: 'reset-current-workspace', includeUntracked: !!includeUntracked \}\);/s);
  assert.match(html, /const canResetCurrentWorkspace =\s*target\.kind === 'head' &&\s*isWorkspaceDirty &&\s*!hasConflictedMerge;/s);
  assert.match(html, /if \(canResetCurrentWorkspace\) \{\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Reset Workspace to HEAD', \(\) => postResetCurrentWorkspace\(false\), \{ destructive: true \}\);\s*appendMenuItem\('Reset Workspace and Remove Untracked Files', \(\) => postResetCurrentWorkspace\(true\), \{ destructive: true \}\);/s);
  assert.match(html, /const canPublishBranch =\s*\(target\.kind === 'head' \|\| target\.kind === 'branch'\) &&\s*!publishedLocalBranchNames\.has\(target\.name\);/s);
  assert.match(html, /if \(canPublishBranch\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Publish Branch to Remote', \(\) => postPublishBranch\(target\)\);/s);
  assert.match(html, /let remoteTagPublicationState = new Map\(\);/);
  assert.match(html, /let pendingRemoteTagStateRequests = new Set\(\);/);
  assert.match(html, /case 'set-remote-tag-state':\s*setRemoteTagState\(message\.tagName, message\.state\);/);
  assert.match(html, /remoteTagPublicationState\.set\(tagName, normalizedState\);/);
  assert.match(html, /case 'update-state':\s*applyTracedHostMessage\(message, 'webview\.apply\.update-state', \(\) => \{\s*applyState\(message\.state, false, \{ invalidateRemoteTagState: true \}\);/s);
  assert.match(html, /syncRemoteTagStateCache\(nextState, previousRepositoryPath, !!options\.invalidateRemoteTagState\);/);
  assert.match(html, /if \(previousRepositoryPath !== nextRepositoryPath \|\| invalidateRemoteTagState\) \{\s*remoteTagPublicationState\.clear\(\);\s*pendingRemoteTagStateRequests\.clear\(\);\s*return;/s);
  assert.match(html, /const currentTagNames = new Set\(\(\(nextState && nextState\.references\) \|\| \[\]\)\s*\.filter\(\(ref\) => ref\.kind === 'tag'\)\s*\.map\(\(ref\) => ref\.name\)\);/s);
  assert.match(html, /const remoteTagState = remoteTagPublicationState\.get\(target\.name\);/);
  assert.match(html, /if \(remoteTagState === 'published'\) \{\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Delete Remote Tag', \(\) => postDeleteRemoteTag\(target\), \{ destructive: true \}\);/s);
  assert.match(html, /} else if \(remoteTagState === 'unpublished'\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Push Tag to Remote', \(\) => postPushTag\(target\)\);/s);
  assert.match(html, /} else if \(remoteTagState === 'unknown'\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Retry Remote Tag Check', \(\) => retryRemoteTagState\(target\)\);/s);
  assert.match(html, /appendMenuItem\('Checking Remote Tag\.\.\.', \(\) => \{\}, \{ disabled: true \}\);\s*requestRemoteTagState\(target\);/s);
  assert.match(html, /function retryRemoteTagState\(target\) \{\s*if \(!target \|\| target\.kind !== 'tag'\) \{\s*return;\s*\}\s*remoteTagPublicationState\.delete\(target\.name\);\s*requestRemoteTagState\(target\);/s);
  assert.match(html, /function requestRemoteTagState\(target\) \{\s*if \(\s*!target \|\|\s*target\.kind !== 'tag' \|\|\s*remoteTagPublicationState\.has\(target\.name\) \|\|\s*pendingRemoteTagStateRequests\.has\(target\.name\)/s);
  assert.match(html, /type: 'resolve-remote-tag-state',\s*refName: target\.name/s);
  assert.match(html, /function postDeleteRemoteTag\(target\) \{\s*vscode\.postMessage\(\{\s*type: 'delete-remote-tag',\s*refName: target\.name,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /target\.kind !== 'commit' && !isCurrentHead && target\.kind !== 'stash'/);
  assert.match(html, /element\.classList\.toggle\('base-target', !!baseTarget && baseTarget\.hash === hash\);/);
  assert.match(html, /<span class="node-base-badge">\(Base\)<\/span>/);
  assert.match(html, /\.node\.base-target\.has-compare \.node-base-badge/);
  assert.match(html, /right: -10px;/);
  assert.match(html, /transform: translate\(100%, -50%\);/);
  assert.doesNotMatch(html, /base-suffix/);
});

test('renders grouped graph context menus', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function appendMenuSubmenu\(label, entries\)/);
  assert.match(html, /\.context-menu \{\s*position: fixed;\s*z-index: 60;\s*width: 250px;/s);
  assert.match(html, /\.context-item \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/s);
  assert.match(html, /context-menu-group/);
  assert.match(html, /context-submenu/);
  assert.match(html, /\.context-submenu \{[^}]*width: 230px;/s);
  assert.match(html, /context-menu-chevron/);
  assert.match(html, /function appendMenuSection\(label\)/);
  assert.doesNotMatch(html, /context-section-label/);
  assert.match(html, /context-separator/);
  assert.match(html, /appendMenuSection\('Destructive'\);/);
  assert.match(html, /appendMenuItem\(deleteLabel, \(\) => postDelete\(target\), \{ destructive: true \}\);/);
  assert.match(html, /placeContextMenu\(clientX, clientY\);/);
  assert.doesNotMatch(html, /contextMenu\.querySelector\('\\.context-item'\)\?\.focus\(\);/);
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
  assert.match(html, /function setMinimapEnabled\(enabled\)/);
  assert.match(html, /showMinimapToggle\.addEventListener\('change'/);
  assert.match(html, /showMinimapToggle\.checked = minimapEnabled;/);
  assert.match(html, /showMinimap: minimapEnabled/);
  assert.match(html, /!minimapEnabled/);
  assert.match(html, /vscode\.setState\(\{ \.\.\.existingState, sceneLayoutKey, nodeOffsets: normalizedOffsets \}\);/);
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
  assert.match(html, /viewport\.addEventListener\('scroll', \(\) => syncMinimap\('viewport'\)\);/);
  assert.match(html, /function renderMinimapEdge\(edge, transform\)/);
  assert.match(html, /function renderMinimapNode\(hash, transform\)/);
  assert.match(html, /function syncMinimapViewport\(transform\)/);
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
  assert.match(html, /class="' \+ nodeClass \+ '"/);
});

test('uses a default cursor on the empty graph viewport', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /\.viewport \{[\s\S]*?cursor: default;/);
  assert.match(html, /\.viewport\.dragging \{[\s\S]*?cursor: grabbing;/);
  assert.match(html, /\.node-grip \{[\s\S]*?cursor: grab;/);
});

test('uses principal path highlight for single selection and compare-only highlight for two selections', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /if \(baseTarget && compareTarget\) \{/);
  assert.match(html, /const selectedHashes = new Set\(/);
  assert.match(html, /element\.classList\.toggle\('selected', selectedHashes\.has\(hash\)\);/);
  assert.match(html, /element\.classList\.remove\('related', 'ancestor-related', 'descendant-related'\);/);
  assert.match(html, /element\.classList\.remove\('related', 'ancestor-path', 'descendant-path', 'muted'\);/);
  assert.match(html, /const ancestorPath = anchorHash \? getPrimaryAncestorPath\(anchorHash\) : \[\];/);
  assert.match(html, /function buildPrimaryAncestorPathFromNextMap\(startHash\)/);
  assert.match(html, /const nextHash = primaryAncestorNextByHash\[currentHash\];/);
  assert.match(html, /let queueIndex = 0;\s*while \(queueIndex < queue\.length\) \{\s*const hash = queue\[queueIndex\];\s*queueIndex \+= 1;/s);
  assert.match(html, /element\.classList\.toggle\('selected', anchorHash === hash\);/);
  assert.match(html, /element\.classList\.toggle\('related', !!anchorHash && anchorHash !== hash && relatedHashes\.has\(hash\)\);/);
  assert.match(html, /element\.classList\.toggle\('muted', !!anchorHash && !isRelated\);/);
});

test('renders single-bend edges and compact structural node styling in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /stroke-width="1\.8"/);
  assert.match(html, /const bendY = targetY - direction \* approachLength;/);
  assert.match(html, /return describeEdgePath\(sourceX, sourceY, targetX, targetY\);/);
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
  assert.match(html, /Center HEAD/);
  assert.match(html, /else if \(shouldRecenter\) \{\s*centerGraphInViewport\(\);/);
  assert.match(html, /centerHeadButton\.disabled = toolbarBusy;/);
});

test('preserves viewport and selection during metadata patches', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function applyMetadataPatch\(patch\)/);
  assert.match(html, /if \(applyReferenceMetadataPatch\(patch\)\) \{\s*return;\s*\}/);
  assert.match(html, /preserveSelection: !!patch\.preserveSelection/);
  assert.match(html, /preserveViewport: !!patch\.preserveViewport/);
  assert.match(html, /function captureSelectionSnapshot\(\)/);
  assert.match(html, /function restoreSelectionSnapshot\(snapshot\)/);
  assert.match(html, /function captureScenePlacementSnapshot\(\)/);
  assert.match(html, /function restoreScenePlacementSnapshot\(snapshot\)/);
  assert.match(html, /function captureViewportSnapshot\(\)/);
  assert.match(html, /function restoreViewportSnapshot\(snapshot\)/);
});

test('patches reference metadata without rerendering graph edges', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function applyReferenceMetadataPatch\(patch\)/);
  assert.match(html, /if \(patch\.sceneLayoutKey && patch\.sceneLayoutKey !== sceneLayoutKey\) \{\s*return false;\s*\}/);
  assert.match(html, /if \(!haveSameNodeHashes\(\(currentState\.scene && currentState\.scene\.nodes\) \|\| \[\], sceneNodes\)\) \{\s*return false;\s*\}/);
  assert.match(html, /const nextRenderKey = getNodeRenderKey\(node, layout\);/);
  assert.match(html, /if \(element\.getAttribute\('data-node-render-key'\) === nextRenderKey\) \{\s*continue;\s*\}/s);
  assert.match(html, /container\.innerHTML = renderNodeMarkup\(node, layout, nextRenderKey\);/);
  assert.match(html, /nextElement\.style\.left = previousLeft;/);
  assert.match(html, /element\.replaceWith\(nextElement\);/);
  assert.match(html, /data-node-render-key="/);
  assert.match(html, /refreshGraphCaches\(\);\s*if \(replacedNodeCount > 0\) \{\s*bindSceneEventHandlers\(\);/s);
  assert.match(html, /nodeLayer\.addEventListener\('click',/);
  assert.match(html, /nodeLayer\.addEventListener\('contextmenu',/);
  assert.match(html, /nodeLayer\.addEventListener\('mousedown',/);
  assert.match(html, /if \(sceneEventHandlersBound \|\| !nodeLayer\) \{/);
  assert.doesNotMatch(html, /for \(const element of document\.querySelectorAll\('\\[data-ref-id\\]'\)\) \{\s*element\.addEventListener\('click'/);
  assert.match(html, /syncMinimap\(replacedNodeCount > 0 \? 'full' : 'viewport'\);/);
  assert.doesNotMatch(html, /function applyReferenceMetadataPatch\(patch\)[\s\S]*?renderScene[\s\S]*?function applyWorkspaceStatePatch/);
  assert.doesNotMatch(html, /function applyReferenceMetadataPatch\(patch\)[\s\S]*?edgeLayer\.innerHTML[\s\S]*?function applyWorkspaceStatePatch/);
});

test('falls back to full state apply when metadata patches change the visible node set', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function haveSameNodeHashes\(currentNodes, nextNodes\)/);
  assert.match(html, /currentNodes\.length !== nextNodes\.length/);
  assert.match(html, /nextNodes\.every\(\(node\) => currentHashes\.has\(node\.hash\)\)/);
  assert.match(html, /if \(applyReferenceMetadataPatch\(patch\)\) \{\s*return;\s*\}\s*applyState\(Object\.assign/);
});

test('falls back to full state apply when metadata patches change graph layout', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /patch\.sceneLayoutKey && patch\.sceneLayoutKey !== sceneLayoutKey/);
  assert.match(html, /if \(applyReferenceMetadataPatch\(patch\)\) \{\s*return;\s*\}\s*applyState\(Object\.assign\(\{\}, currentState, patch/);
});

test('patches workspace state without rerendering the graph scene', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function applyWorkspaceStatePatch\(patch\)/);
  assert.match(html, /currentState = Object\.assign\(\{\}, currentState, patch,/);
  assert.match(html, /updateChrome\(currentState\);\s*syncToolbarActions\(\);\s*hideLoading\(\);\s*hideStatus\(\);/s);
  assert.doesNotMatch(html, /function applyWorkspaceStatePatch\(patch\)[\s\S]*?renderScene[\s\S]*?function setRemoteTagState/);
});

test('renders client-side graph search controls and runtime handlers', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /searchInput\.addEventListener\('input'/);
  assert.match(html, /showRemoteBranchesToggle\.addEventListener\('change'/);
  assert.match(html, /showStashesToggle\.addEventListener\('change'/);
  assert.doesNotMatch(html, /fetchButton\.addEventListener\('click'/);
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

test('renders merge abort controls only for conflicted merge state', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /const abortMergeButton = document\.getElementById\('abortMergeButton'\);/);
  assert.match(html, /postMessageWithLoading\(\{ type: 'abort-merge' \}, 'Aborting merge\.\.\.', abortMergeButton\);/);
  assert.match(html, /abortMergeButton\.hidden = !state\.hasConflictedMerge;/);
  assert.match(html, /abortMergeButton\.disabled = toolbarBusy \|\| !currentState\?\.hasConflictedMerge;/);
  assert.match(html, /\.view-controls \.toolbar-button\[hidden\]\s*\{\s*display: none;/);
  assert.match(html, /--merge-conflict-border: color-mix\(in srgb, var\(--workspace-dirty\) 72%, var\(--border\)\);/);
  assert.match(html, /\.workspace-led\.dirty\s*\{[^}]*border-color: var\(--merge-conflict-border\);[^}]*background: var\(--merge-conflict-border\);/s);
  assert.match(html, /\.workspace-led\.dirty:hover\s*\{[^}]*border-color: var\(--workspace-dirty\);[^}]*background: var\(--workspace-dirty\);/s);
  assert.match(html, /\.view-controls \.toolbar-button\.destructive:not\(\[hidden\]\)\s*\{[^}]*border-color: var\(--merge-conflict-border\);/s);
  assert.match(html, /Merge conflicts detected: click to open Source Control\./);
});

test('does not render a current branch descendants view option', () => {
  const html = renderRevisionGraphShellHtml();

  assert.doesNotMatch(html, /showCurrentBranchDescendantsOption/);
  assert.doesNotMatch(html, /current branch descendants/);
});

function createWebviewRuntime() {
  const html = renderRevisionGraphShellHtml();
  const match = html.match(/<script nonce="[^"]+">([\s\S]*)<\/script>/);
  assert.ok(match, 'expected webview script in rendered HTML');
  const script = match[1];

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
    'workspaceLed',
    'abortMergeButton',
    'scopeSelect',
    'viewOptions',
    'viewOptionsButton',
    'viewOptionsMenu',
    'showTagsToggle',
    'showRemoteBranchesToggle',
    'showStashesToggle',
    'showMinimapToggle',
    'searchInput',
    'searchResultBadge',
    'searchPrevButton',
    'searchNextButton',
    'searchClearButton',
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
  const context = {
    console,
    window: windowObject,
    document,
    requestAnimationFrame: (callback: (timestamp: number) => void) => {
      callback(0);
      return 1;
    },
    acquireVsCodeApi: () => ({
      postMessage: () => {},
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
    elements
  };
}

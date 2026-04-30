import test from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';

import { renderRevisionGraphShellHtml } from '../src/revisionGraphWebview';

test('renders a persistent shell for the revision graph webview', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<select id="scopeSelect">/);
  assert.match(html, /id="viewOptionsButton"/);
  assert.match(html, /id="viewOptionsMenu"/);
  assert.match(html, /Show Branchings &amp; Merges/);
  assert.match(html, /id="showRemoteBranchesToggle"/);
  assert.match(html, /Show Remote Branches/);
  assert.match(html, /id="showStashesToggle"/);
  assert.match(html, /Show Stash/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /Find in graph\.\.\./);
  assert.match(html, /id="searchResultBadge"/);
  assert.match(html, /id="searchPrevButton"/);
  assert.match(html, /id="searchNextButton"/);
  assert.match(html, /id="searchClearButton"/);
  assert.doesNotMatch(html, /id="fetchButton"/);
  assert.doesNotMatch(html, />\s*<span class="button-icon">↓<\/span>\s*<span>Fetch<\/span>/);
  assert.match(html, /class="workspace-led clean"/);
  assert.match(html, /<div class="toolbar-actions" aria-label="Graph actions">\s*<button\s+class="workspace-led clean"/);
  assert.match(html, /id="workspaceLed"/);
  assert.match(html, /id="graphSvg"/);
  assert.match(html, /id="edgeLayer"/);
  assert.match(html, /id="nodeLayer"/);
  assert.match(html, /id="statusCard"/);
  assert.match(html, /id="statusMessage"/);
  assert.match(html, /id="statusActionButton"/);
  assert.match(html, /id="graphMinimap"/);
  assert.match(html, /id="minimapZoomOutButton"/);
  assert.match(html, /id="minimapZoomInButton"/);
  assert.match(html, /id="minimapEdgeLayer"/);
  assert.match(html, /id="minimapNodeLayer"/);
  assert.match(html, /id="minimapViewport"/);
  assert.match(html, /window\.addEventListener\('message'/);
  assert.match(html, /vscode\.postMessage\(\{ type: 'webview-ready' \}\);/);
  assert.match(html, /case 'init-state'/);
  assert.match(html, /case 'update-state'/);
  assert.match(html, /case 'patch-metadata'/);
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

test('shows loading feedback while reorganizing the graph layout client-side', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(
    html,
    /reorganizeButton\.addEventListener\('click', async \(\) => \{\s*await runWithLoading\('Reorganizing graph layout\.\.\.', async \(\) => \{\s*autoArrangeLayout\(\);\s*centerGraphInViewport\(\);\s*\}, reorganizeButton\);/s
  );
  assert.doesNotMatch(html, /fetchButton\.addEventListener\('click'/);
});

test('reorganize button does not crash when clustering by ref families', async () => {
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
      projectionOptions: {
        refScope: 'all',
        showTags: true,
        showRemoteBranches: true,
        showStashes: true,
        showBranchingsAndMerges: true
      },
      mergeBlockedTargets: [],
      primaryAncestorPathsByHash: {},
      autoArrangeOnInit: false,
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

  const reorganize = runtime.elements.get('reorganizeButton')?.listeners.click?.[0];
  assert.ok(reorganize);
  await assert.doesNotReject(async () => {
    await reorganize();
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
  assert.match(html, /type: 'create-branch',\s*revision: target\.revision,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /function postCreateTag\(target\) \{\s*vscode\.postMessage\(\{\s*type: 'create-tag',\s*revision: target\.revision,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /let publishedLocalBranchNames = new Set\(\);/);
  assert.match(html, /publishedLocalBranchNames = new Set\(nextState\.publishedLocalBranchNames \|\| \[\]\);/);
  assert.match(html, /const canSyncCurrentHead =\s*target\.kind === 'head' &&\s*!!currentHeadUpstreamName &&\s*publishedLocalBranchNames\.has\(target\.name\);/s);
  assert.match(html, /const canPublishBranch =\s*\(target\.kind === 'head' \|\| target\.kind === 'branch'\) &&\s*!publishedLocalBranchNames\.has\(target\.name\);/s);
  assert.match(html, /if \(canPublishBranch\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Publish Branch to Remote', \(\) => postPublishBranch\(target\)\);/s);
  assert.match(html, /let knownRemoteTagNames = new Set\(\);/);
  assert.match(html, /let remoteTagPublicationState = new Map\(\);/);
  assert.match(html, /let pendingRemoteTagStateRequests = new Set\(\);/);
  assert.match(html, /case 'set-remote-tag-state':\s*setRemoteTagState\(message\.tagName, !!message\.isPublished\);/);
  assert.match(html, /remoteTagPublicationState\.set\(tagName, !!isPublished\);/);
  assert.match(html, /const hasResolvedRemoteTagState = remoteTagPublicationState\.has\(target\.name\);/);
  assert.match(html, /if \(hasResolvedRemoteTagState && knownRemoteTagNames\.has\(target\.name\)\) \{\s*appendMenuSection\('Destructive'\);\s*appendMenuItem\('Delete Remote Tag', \(\) => postDeleteRemoteTag\(target\), \{ destructive: true \}\);/s);
  assert.match(html, /} else if \(hasResolvedRemoteTagState\) \{\s*appendMenuSection\('Create And Publish'\);\s*appendMenuItem\('Push Tag to Remote', \(\) => postPushTag\(target\)\);/s);
  assert.match(html, /appendMenuItem\('Checking Remote Tag\.\.\.', \(\) => \{\}, \{ disabled: true \}\);\s*requestRemoteTagState\(target\);/s);
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
  assert.match(html, /function zoomInMinimap\(\)/);
  assert.match(html, /function zoomOutMinimap\(\)/);
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

test('keeps a single auto-arrange layout routine in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function autoArrangeLayout\(\)/);
  assert.match(html, /return getNodeWidth\(leftHash\) \+ 28;/);
  assert.match(html, /const leftEdgeShift = -Math\.min\(\.\.\.resolved\);/);
  assert.doesNotMatch(html, /function autoArrangeTortoiseLayout\(\)/);
  assert.doesNotMatch(html, /function buildNodeFamilyAssignments\(neighborMap\)/);
  assert.doesNotMatch(html, /function buildFamilyAnchorMap\(familyAssignments\)/);
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
    'minimapZoomInButton',
    'loadingOverlay',
    'loadingMessage',
    'workspaceLed',
    'scopeSelect',
    'viewOptions',
    'viewOptionsButton',
    'viewOptionsMenu',
    'showTagsToggle',
    'showRemoteBranchesToggle',
    'showStashesToggle',
    'showBranchingsToggle',
    'searchInput',
    'searchResultBadge',
    'searchPrevButton',
    'searchNextButton',
    'searchClearButton',
    'reorganizeButton',
    'zoomOutButton',
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

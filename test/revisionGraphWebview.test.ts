import test from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';

import { renderRevisionGraphShellHtml } from '../src/revisionGraphWebview';

test('renders a persistent shell for the revision graph webview', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<select id="scopeSelect">/);
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
  assert.match(html, /id="fetchButton"/);
  assert.match(html, />\s*<span class="button-icon">↓<\/span>\s*<span>Fetch<\/span>/);
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
  assert.match(html, /function showLoading\(label, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function runWithLoading\(label, work, pendingControl = null, mode = 'blocking'\)/);
  assert.match(html, /function hideLoading\(\)/);
  assert.match(html, /function showError\(message\)/);
  assert.match(html, /if \(nextState\.loading\) \{\s*showLoading\(nextState\.loadingLabel \|\| 'Loading revision graph\.\.\.', null, 'blocking'\);\s*\} else \{\s*hideLoading\(\);\s*\}/s);
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
  assert.match(
    html,
    /fetchButton\.addEventListener\('click', \(\) => \{\s*vscode\.postMessage\(\{ type: 'fetch-current-repository' \}\);/s
  );
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
  assert.match(html, /if \(target\.kind !== 'commit' && target\.kind !== 'tag' && target\.kind !== 'stash' && !isCurrentHead\) \{\s*appendMenuItem\('Checkout to: ' \+ targetLabel, \(\) => \{/s);
});

test('renders structural commit actions for compare and branch creation', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function createCommitSelectionId\(hash\) \{/);
  assert.match(html, /function getStructuralNodeTarget\(hash\) \{/);
  assert.match(html, /type: 'show-log',\s*source: \{\s*kind: 'target',\s*revision: target\.revision,\s*label: target\.label/s);
  assert.match(html, /type: 'show-log',\s*source: \{\s*kind: 'range',\s*baseRevision: base\.revision,\s*baseLabel: base\.label,\s*compareRevision: compare\.revision,\s*compareLabel: compare\.label/s);
  assert.match(html, /type: 'compare-with-worktree', revision: target\.revision, label: target\.label/);
  assert.match(html, /appendMenuItem\('Copy Commit Hash', \(\) => \{\s*vscode\.postMessage\(\{ type: 'copy-commit-hash', commitHash: target\.hash \}\);/s);
  assert.match(html, /type: 'create-branch',\s*revision: target\.revision,\s*label: target\.label,\s*refKind: target\.kind/s);
  assert.match(html, /target\.kind !== 'commit' && !isCurrentHead && target\.kind !== 'stash'/);
  assert.match(html, /element\.classList\.toggle\('base-target', !!baseTarget && baseTarget\.hash === hash\);/);
  assert.match(html, /<span class="node-base-badge">\(Base\)<\/span>/);
  assert.match(html, /\.node-structural\.base-target\.has-compare \.node-base-badge/);
  assert.match(html, /right: -8px;/);
  assert.match(html, /transform: translate\(100%, -50%\);/);
  assert.match(html, /overflow: visible;/);
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

test('renders straighter edges and compact structural node styling in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /stroke-width="1\.8"/);
  assert.match(html, /return 'M ' \+ sourceX \+ ' ' \+ sourceY \+ ' L ' \+ targetX \+ ' ' \+ targetY;/);
  assert.match(html, /min-width: 78px;/);
});

test('keeps a single auto-arrange layout routine in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function autoArrangeLayout\(\)/);
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
  assert.match(html, /fetchButton\.addEventListener\('click'/);
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
  }

  const ids = [
    'viewport',
    'canvas',
    'sceneLayer',
    'graphSvg',
    'edgeLayer',
    'nodeLayer',
    'statusCard',
    'contextMenu',
    'loadingOverlay',
    'loadingMessage',
    'workspaceLed',
    'scopeSelect',
    'showTagsToggle',
    'showRemoteBranchesToggle',
    'showStashesToggle',
    'showBranchingsToggle',
    'searchInput',
    'searchResultBadge',
    'searchPrevButton',
    'searchNextButton',
    'searchClearButton',
    'fetchButton',
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

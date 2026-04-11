import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRevisionGraphHtml } from '../src/revisionGraphWebview';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';

test('renders the auto-arrange bootstrap flag for the webview', () => {
  const scene = {
    nodes: [
      {
        hash: 'a1',
        refs: [{ name: 'main', kind: 'head' as const }],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        x: 0,
        row: 0,
        lane: 0
      }
    ],
    edges: [],
    laneCount: 1,
    rowCount: 1
  };

  const autoArrangeHtml = renderRevisionGraphHtml(
    scene,
    'main',
    'origin/main',
    false,
    createDefaultRevisionGraphProjectionOptions(),
    [],
    { a1: ['a1'] },
    true
  );
  const passiveHtml = renderRevisionGraphHtml(
    scene,
    'main',
    undefined,
    true,
    createDefaultRevisionGraphProjectionOptions(),
    [],
    { a1: ['a1'] },
    false
  );

  assert.match(autoArrangeHtml, /const autoArrangeOnInit = true;/);
  assert.match(passiveHtml, /const autoArrangeOnInit = false;/);
  assert.match(autoArrangeHtml, /const currentHeadUpstreamName = "origin\/main";/);
  assert.match(autoArrangeHtml, /const primaryAncestorPathsByHash = {"a1":\["a1"\]};/);
  assert.match(autoArrangeHtml, /const sceneLayoutKey = "a1:0:0";/);
  assert.match(autoArrangeHtml, /class="workspace-led clean"/);
  assert.match(passiveHtml, /class="workspace-led dirty"/);
  assert.match(autoArrangeHtml, /title="Workspace clean: no pending changes\."?/);
  assert.match(passiveHtml, /title="Workspace dirty: click to open Source Control Changes\."?/);
  assert.match(passiveHtml, /const isWorkspaceDirty = true;/);
  assert.match(autoArrangeHtml, /<select id="scopeSelect">/);
  assert.match(autoArrangeHtml, /Show Branchings &amp; Merges/);
  assert.match(autoArrangeHtml, /id="reorganizeButton"/);
  assert.match(autoArrangeHtml, /id="zoomOutButton"[\s\S]*title="Zoom Out \(Alt -\)"/);
  assert.match(autoArrangeHtml, /id="zoomInButton"[\s\S]*title="Zoom In \(Alt \+\)"/);
});

test('renders reference dividers only between consecutive refs', () => {
  const scene = {
    nodes: [
      {
        hash: 'single1',
        refs: [{ name: 'origin/next', kind: 'remote' as const }],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Single ref',
        x: 0,
        row: 0,
        lane: 0
      },
      {
        hash: 'multi1',
        refs: [
          { name: 'main', kind: 'head' as const },
          { name: 'origin/main', kind: 'remote' as const }
        ],
        author: 'Ada',
        date: '2026-04-07',
        subject: 'Multi ref',
        x: 0,
        row: 1,
        lane: 0
      }
    ],
    edges: [],
    laneCount: 1,
    rowCount: 2
  };

  const html = renderRevisionGraphHtml(
    scene,
    'main',
    'origin/main',
    false,
    createDefaultRevisionGraphProjectionOptions(),
    [],
    { single1: ['single1'], multi1: ['multi1'] },
    true
  );

  assert.match(html, /\.ref-line \+ \.ref-line \{\s*border-top: 1px solid rgba\(0, 0, 0, 0\.08\);/);
  assert.doesNotMatch(html, /\.ref-line \{\s*padding: 8px 12px; border-bottom:/);
  assert.doesNotMatch(html, /\.node \{\s*position: absolute; min-width: 180px; min-height: 54px;/);
  assert.equal((html.match(/class="node-summary"/g) ?? []).length, 0);
});

test('renders structural commits with a summary and active projection controls', () => {
  const scene = {
    nodes: [
      {
        hash: 'structural1',
        refs: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Merge pivot',
        x: 0,
        row: 0,
        lane: 0
      }
    ],
    edges: [],
    laneCount: 1,
    rowCount: 1
  };

  const html = renderRevisionGraphHtml(
    scene,
    'main',
    'origin/main',
    false,
    {
      refScope: 'current',
      showTags: false,
      showBranchingsAndMerges: true
    },
    [],
    { structural1: ['structural1'] },
    true
  );

  assert.match(html, /class="node node-structural"/);
  assert.match(html, /Merge pivot/);
  assert.match(html, /Ada on 2026-04-08/);
  assert.match(html, /<option value="current" selected>Current Branch<\/option>/);
  assert.match(html, /id="showTagsToggle" type="checkbox" /);
  assert.match(html, /id="showBranchingsToggle"[\s\S]*checked/);
  assert.doesNotMatch(html, /Ancestor Filter/);
});

test('anchors edges to the real height of single-ref cards', () => {
  const scene = {
    nodes: [
      {
        hash: 'top1',
        refs: [{ name: 'origin/seen', kind: 'remote' as const }],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Top ref',
        x: 0,
        row: 0,
        lane: 0
      },
      {
        hash: 'bottom1',
        refs: [{ name: 'origin/jch', kind: 'remote' as const }],
        author: 'Ada',
        date: '2026-04-07',
        subject: 'Bottom ref',
        x: 0,
        row: 1,
        lane: 0
      }
    ],
    edges: [{ from: 'top1', to: 'bottom1' }],
    laneCount: 1,
    rowCount: 2
  };

  const html = renderRevisionGraphHtml(
    scene,
    'main',
    'origin/main',
    false,
    createDefaultRevisionGraphProjectionOptions(),
    [],
    { top1: ['top1'], bottom1: ['bottom1'] },
    true
  );

  assert.match(html, /data-node-height="31"/);
  assert.match(html, /data-edge-from="top1" data-edge-to="bottom1" d="M 116 113 C /);
});

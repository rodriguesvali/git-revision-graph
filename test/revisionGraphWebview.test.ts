import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRevisionGraphHtml } from '../src/revisionGraphWebview';

test('renders the auto-arrange bootstrap flag for the webview', () => {
  const scene = {
    nodes: [
      {
        hash: 'a1',
        refs: [{ name: 'main', kind: 'head' as const }],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        row: 0,
        lane: 0
      }
    ],
    edges: [],
    laneCount: 1,
    rowCount: 1
  };

  const autoArrangeHtml = renderRevisionGraphHtml('repo', scene, 'main', 'origin/main', false, undefined, [], { a1: ['a1'] }, true);
  const passiveHtml = renderRevisionGraphHtml('repo', scene, 'main', undefined, true, undefined, [], { a1: ['a1'] }, false);

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
        row: 1,
        lane: 0
      }
    ],
    edges: [],
    laneCount: 1,
    rowCount: 2
  };

  const html = renderRevisionGraphHtml('repo', scene, 'main', 'origin/main', false, undefined, [], { single1: ['single1'], multi1: ['multi1'] }, true);

  assert.match(html, /\.ref-line \+ \.ref-line \{\s*border-top: 1px solid rgba\(0, 0, 0, 0\.08\);/);
  assert.doesNotMatch(html, /\.ref-line \{\s*padding: 8px 12px; border-bottom:/);
  assert.doesNotMatch(html, /\.node \{\s*position: absolute; min-width: 180px; min-height: 54px;/);
});

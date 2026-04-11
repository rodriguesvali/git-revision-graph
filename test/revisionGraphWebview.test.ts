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

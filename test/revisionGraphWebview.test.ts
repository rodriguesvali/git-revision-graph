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

  const autoArrangeHtml = renderRevisionGraphHtml('repo', scene, 'main', 'origin/main', undefined, [], true);
  const passiveHtml = renderRevisionGraphHtml('repo', scene, 'main', undefined, undefined, [], false);

  assert.match(autoArrangeHtml, /const autoArrangeOnInit = true;/);
  assert.match(passiveHtml, /const autoArrangeOnInit = false;/);
  assert.match(autoArrangeHtml, /const currentHeadUpstreamName = "origin\/main";/);
});

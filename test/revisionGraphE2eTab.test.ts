import test from 'node:test';
import assert from 'node:assert/strict';

import {
  matchesRevisionGraphPanelViewType,
  REVISION_GRAPH_PANEL_VIEW_TYPE
} from './e2e/revisionGraphTab';

test('matches the extension-owned revision graph panel view type', () => {
  assert.equal(matchesRevisionGraphPanelViewType(REVISION_GRAPH_PANEL_VIEW_TYPE), true);
});

test('matches a host-prefixed revision graph panel view type', () => {
  assert.equal(
    matchesRevisionGraphPanelViewType(`mainThreadWebview-${REVISION_GRAPH_PANEL_VIEW_TYPE}`),
    true
  );
});

test('rejects other webview panel types', () => {
  assert.equal(matchesRevisionGraphPanelViewType('gitRefs.compareResultsView'), false);
});

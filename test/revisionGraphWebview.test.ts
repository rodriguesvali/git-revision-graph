import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRevisionGraphShellHtml } from '../src/revisionGraphWebview';

test('renders a persistent shell for the revision graph webview', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /<select id="scopeSelect">/);
  assert.match(html, /Show Branchings &amp; Merges/);
  assert.match(html, /id="workspaceLed"/);
  assert.match(html, /id="graphSvg"/);
  assert.match(html, /id="edgeLayer"/);
  assert.match(html, /id="nodeLayer"/);
  assert.match(html, /id="statusCard"/);
  assert.match(html, /window\.addEventListener\('message'/);
  assert.match(html, /case 'init-state'/);
  assert.match(html, /case 'update-state'/);
  assert.match(html, /case 'set-loading'/);
  assert.match(html, /case 'set-error'/);
});

test('keeps loading and error primitives in the shell runtime', () => {
  const html = renderRevisionGraphShellHtml();

  assert.match(html, /function showLoading\(label\)/);
  assert.match(html, /function hideLoading\(\)/);
  assert.match(html, /function showError\(message\)/);
  assert.match(html, /class="loading-overlay"/);
});

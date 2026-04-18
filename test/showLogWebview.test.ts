import test from 'node:test';
import assert from 'node:assert/strict';

import { renderShowLogWebviewHtml } from '../src/showLogWebview';

test('renders a compact show log webview shell with inline commit details support', () => {
  const html = renderShowLogWebviewHtml();

  assert.match(html, /<title>Show Log<\/title>/);
  assert.match(html, /class="commit-row"/);
  assert.match(html, /class="commit-files"/);
  assert.match(html, /Load More/);
  assert.match(html, /Open Commit Details/);
  assert.match(html, /vscode\.postMessage\(\{ type: 'ready' \}\);/);
  assert.match(html, /type: 'toggleCommit', commitHash:/);
  assert.match(html, /type: 'openFile',\s*commitHash:/s);
  assert.match(html, /type: 'openCommitDetails', commitHash: contextCommitHash/);
  assert.match(html, /function renderTopology\(topology\)/);
});

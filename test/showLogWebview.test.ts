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
  assert.match(html, /Open Diff/);
  assert.match(html, /Copy to Clipboard/);
  assert.match(html, /context-menu-group/);
  assert.match(html, /vscode\.postMessage\(\{ type: 'ready' \}\);/);
  assert.match(html, /type: 'toggleCommit', commitHash:/);
  assert.match(html, /data-menu-action="openFile"/);
  assert.match(html, /type: action,\s*commitHash: state\.commitHash,\s*changeId: state\.changeId/s);
  assert.match(html, /type: 'openCommitDetails', commitHash: state\.commitHash/);
  assert.doesNotMatch(html, /vscode\.postMessage\(\{\s*type: 'openFile',\s*commitHash: fileRow/s);
  assert.doesNotMatch(html, /class="graph-layer"/);
  assert.doesNotMatch(html, /function renderGraphLayer\(\)/);
  assert.doesNotMatch(html, /function renderTopology\(/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { renderCompareResultsWebviewHtml } from '../src/compareResultsWebview';

test('renders compare results webview shell with inline search', () => {
  const html = renderCompareResultsWebviewHtml();

  assert.match(html, /placeholder="Filter files by path or status\.\.\."/);
  assert.match(html, /id="clearSearchButton"/);
  assert.match(html, /id="summary"/);
  assert.match(html, /id="countBadge"/);
  assert.match(html, /id="contextMenu"/);
  assert.match(html, /function filterItems\(items, query\)/);
  assert.match(html, /No files match/);
});

test('renders compare result actions through a context menu in the webview', () => {
  const html = renderCompareResultsWebviewHtml();

  assert.match(html, /content\.addEventListener\('contextmenu'/);
  assert.match(html, /content\.addEventListener\('keydown'/);
  assert.doesNotMatch(html, /content\.addEventListener\('click'/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /Press Shift\+F10 or Enter for actions\./);
  assert.match(html, /function openContextMenuForElement\(itemId, element\)/);
  assert.match(html, /Compare with Base/);
  assert.match(html, /Compare with Worktree/);
  assert.match(html, /Revert to This/);
  assert.match(html, /function openContextMenu\(itemId, x, y\)/);
  assert.match(html, /function postAction\(type, itemId\)/);
  assert.match(html, /vscode\.postMessage\(\{ type, itemId \}\)/);
});

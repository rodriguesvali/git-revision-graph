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
  assert.match(html, /selectedItemIds = \[\]/);
  assert.match(html, /function filterItems\(items, query\)/);
  assert.match(html, /function getVisibleItemIds\(\)/);
  assert.match(html, /No files match/);
});

test('renders compare result actions through a context menu in the webview', () => {
  const html = renderCompareResultsWebviewHtml();

  assert.match(html, /content\.addEventListener\('click'/);
  assert.match(html, /content\.addEventListener\('contextmenu'/);
  assert.match(html, /content\.addEventListener\('keydown'/);
  assert.match(html, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-selected="/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /role="option"/);
  assert.match(html, /Press Shift\+F10 or Enter for actions\./);
  assert.match(html, /function openContextMenuForElement\(items, element\)/);
  assert.match(html, /function updateSelection\(itemId, event\)/);
  assert.match(html, /function extendSelectionWithArrow\(itemId, direction\)/);
  assert.match(html, /focusItem\(targetItemId\)/);
  assert.match(html, /function getSelectionForContextMenu\(itemId\)/);
  assert.match(html, /Compare with Base/);
  assert.match(html, /Copy to Clipboard/);
  assert.match(html, /File Name/);
  assert.match(html, /Full Path/);
  assert.match(html, /Compare with Worktree/);
  assert.match(html, /Revert to This/);
  assert.match(html, /context-menu-group/);
  assert.match(html, /context-submenu/);
  assert.match(html, /function openContextMenu\(items, x, y\)/);
  assert.match(html, /countBadge\.textContent = totalCount \+ '\/' \+ selectedCount/);
  assert.match(html, /function postSingleAction\(type, itemId\)/);
  assert.match(html, /function postMultiAction\(type, itemIds\)/);
  assert.match(html, /vscode\.postMessage\(\{ type, itemIds \}\)/);
  assert.match(html, /item\.fullPath/);
});

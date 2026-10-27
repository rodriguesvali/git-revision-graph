import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { renderShowLogCommitMenuScript } from '../src/showLog/webviewCommitMenu';

function menu(selected: string[], clicked: string, merges: string[] = []): string {
  const context = {
    contextMenu: { innerHTML: '' }, contextMenuState: undefined,
    getCompareSelectionForCommit: () => selected.length === 2 && selected.includes(clicked) ? {} : undefined,
    findCommitByHash: (hash: string) => ({ isMerge: merges.includes(hash) }),
    renderCopyReferenceNameMenu: () => '', getCurrentSourceToken: () => '1',
    getCherryPickCommitHashes: () => selected.includes(clicked) ? selected : [clicked],
    isMultiSelectedContext: () => selected.length > 1 && selected.includes(clicked), showContextMenuAt() {}
  };
  runInNewContext(`${renderShowLogCommitMenuScript()} handleContextMenu('${clicked}', 0, 0);`, context);
  return context.contextMenu.innerHTML;
}

test('Show Log Format Patch is available for single, two and larger selections', () => {
  for (const hashes of [['a'], ['a', 'b'], ['a', 'b', 'c']]) {
    const html = menu(hashes, 'a');
    assert.match(html, /data-menu-action="formatPatch">Format Patch…/);
    assert.match(html, /data-menu-action="cherryPickCommits"/);
    assert.equal(html.includes('data-menu-action="compareCommits"'), hashes.length === 2);
  }
});

test('Format Patch disables the whole selection when any selected commit is a merge', () => {
  for (const hashes of [['a'], ['a', 'b'], ['a', 'b', 'c']]) {
    assert.match(menu(hashes, 'a', [hashes.at(-1)!]), /data-menu-action="formatPatch" disabled/);
  }
  assert.match(menu(['a', 'b'], 'c', ['a']), /data-menu-action="formatPatch">/);
});

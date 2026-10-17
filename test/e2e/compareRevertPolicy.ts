import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RefType } from '../../src/git';
import type { Repository } from '../../src/git';
import { contents, git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { command, ObservedPanel, waitFor } from './webviewBridge';

const TAG = 'v22.3.0-next.2';

export async function verifyCompareRevertPolicy(harness: SafetyHarness, repository: Pick<Repository, 'rootUri'>): Promise<void> {
  const root = repository.rootUri.fsPath;
  const before = contents(root), index = indexState(root), head = git(root, ['rev-parse', 'HEAD']);
  const confirmations = harness.confirmations.length;
  const same = join(root, 'same.txt'), original = join(root, 'original.txt');
  git(root, ['tag', '-a', TAG, '-m', 'Worktree Revert regression', 'baseline']);
  try {
    for (const [name, type] of [['main', RefType.Head], ['baseline', RefType.Head], [TAG, RefType.Tag]] as const) {
      const panel = await compare(name, type);
      assert.deepEqual((await inspect(panel)).filter(item => item.action === 'revert'), [{ action: 'revert', label: 'Revert' }]);
    }
    const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
    await waitFor(() => !graph.loading, 'graph ready for ref-to-ref comparison');
    const previous = context();
    await graph.send({ type: 'compare-selected', baseRevision: 'baseline', baseLabel: 'baseline',
      compareRevision: 'main', compareLabel: 'main', origin: (await graph.snapshot()).messageOrigin });
    const between = await result(previous);
    assert.equal((await inspect(between)).some(item => item.action === 'revert'), false);
    const state = await between.snapshot();
    await between.send({ type: 'revert', itemId: state.items![0].id, origin: state.messageOrigin });
    const tag = await compare(TAG, RefType.Tag);
    assert.equal(harness.confirmations.length, confirmations, 'Ref-to-ref restore requests must be rejected by the host');
    assert.equal(contents(root), before);
    assert.equal(indexState(root), index);
    const posted = tag.posted.length;
    await tag.menu('.row[data-item-id]', 'revert');
    await waitFor(() => !existsSync(same) && existsSync(original), 'actual tag-to-worktree file restore');
    await waitFor(() => tag.disposed || tag.posted.slice(posted).some(message => message.type === 'state'), 'comparison refresh after tag restore');
    assert.equal(contents(root, 'original.txt'), git(root, ['show', `${TAG}:original.txt`]) + '\n');
    assert.equal(harness.confirmations.length, confirmations + 1);
    assert.equal(indexState(root), index);
    assert.equal(git(root, ['rev-parse', 'HEAD']), head);
    assert.equal(git(root, ['symbolic-ref', 'HEAD']), 'refs/heads/main');
    assert.deepEqual(harness.errors, []);
    console.log('[e2e:safety] tag/branch-to-worktree Revert, actual tag restore and ref-to-ref rejection passed');
  } finally {
    writeFileSync(same, before);
    if (existsSync(original)) unlinkSync(original);
    git(root, ['tag', '-d', TAG]);
  }

  function context() {
    return [...harness.panels].reverse().find(panel => panel.viewType === 'gitRefs.compareResultsView' && !panel.disposed)?.state?.messageOrigin?.contextId;
  }

  async function result(previous: string | undefined): Promise<ObservedPanel> {
    const panel = await harness.panel('gitRefs.compareResultsView');
    await waitFor(() => panel.state?.kind === 'results' && panel.state.messageOrigin?.repositoryPath === root
      && panel.state.messageOrigin.contextId !== previous, 'fresh comparison result');
    return panel;
  }

  async function compare(name: string, type: RefType): Promise<ObservedPanel> {
    const previous = context();
    await command('gitRefs.compareWithWorktree', { kind: 'ref', repository, ref: { type, name } });
    return result(previous);
  }

  async function inspect(panel: ObservedPanel) {
    const reply = await panel.control('inspectMenu', { selector: '.row[data-item-id]' });
    assert.ok(reply.menuItems);
    return reply.menuItems;
  }
}

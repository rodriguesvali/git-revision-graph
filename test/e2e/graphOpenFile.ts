import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { contents, git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { command, waitFor } from './webviewBridge';

export async function verifyGraphOpenFile(harness: SafetyHarness, repositories: readonly GitApiBaselineRepository[]): Promise<void> {
  const [repository, other] = repositories;
  const root = repository.rootUri.fsPath;
  const before = contents(root), index = indexState(root), head = git(root, ['rev-parse', 'HEAD']);
  const baseline = git(root, ['rev-parse', 'baseline']);
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  await waitFor(() => !graph.loading, 'graph file menu ready');
  const pickerCount = harness.quickPicks.length;
  await graph.menu('[data-ref-name="baseline"][data-ref-kind="branch"]', 'open-file-at-revision');
  await waitFor(() => harness.quickPicks.length > pickerCount && !harness.quickPicks.at(-1)!.busy, 'native searchable revision picker');
  const picker = harness.quickPicks.at(-1)!;
  assert.ok(picker.title?.includes(baseline.slice(0, 8)));
  assert.deepEqual(picker.items.map(item => item.label), ['original.txt']);
  try {
    git(root, ['update-ref', 'refs/heads/baseline', head]);
    await repository.status();
    picker.value = 'original';
    await waitFor(() => picker.activeItems[0]?.label === 'original.txt', 'native active filtered file');
    await command('workbench.action.acceptSelectedQuickOpenItem');
    await waitFor(() => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      return uri?.scheme === 'git-ext-ref' && new URLSearchParams(uri.query).get('ref') === baseline
        && new URLSearchParams(uri.query).get('repo') === root;
    }, 'selected original revision document');
    assert.equal(vscode.window.activeTextEditor!.document.getText(), git(root, ['show', `${baseline}:original.txt`]) + '\n');
  } finally {
    git(root, ['update-ref', 'refs/heads/baseline', baseline]);
    await repository.status();
  }
  const originalEditor = vscode.window.activeTextEditor!.document.uri.toString();
  await refresh();
  await openHeadPicker();
  harness.quickPicks.at(-1)!.hide();
  await command('workbench.action.focusActiveEditorGroup');
  assert.equal(vscode.window.activeTextEditor!.document.uri.toString(), originalEditor, 'Escape must not open a different file');

  await openHeadPicker();
  harness.selectedRoot = other.rootUri.fsPath;
  await graph.send({ type: 'choose-repository' });
  await waitFor(() => graph.state?.repositoryPath === other.rootUri.fsPath && !graph.loading, 'repository switch cancels file picker');
  harness.selectedRoot = root;
  await graph.send({ type: 'choose-repository' });
  await waitFor(() => graph.state?.repositoryPath === root && !graph.loading, 'return to original repository');
  await graph.snapshot();
  await command('workbench.action.focusActiveEditorGroup');
  assert.equal(vscode.window.activeTextEditor!.document.uri.toString(), originalEditor, 'A→B→A must not revive a file request');
  assert.equal(contents(root), before);
  assert.equal(indexState(root), index);
  assert.equal(git(root, ['rev-parse', 'HEAD']), head);
  assert.deepEqual(harness.errors, []);
  console.log('[e2e:safety] graph file picker, search, pinned branch movement, cancel and A→B→A passed');

  async function refresh() {
    const context = graph.state?.messageOrigin?.contextId;
    await graph.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => !graph.loading && graph.state?.messageOrigin?.contextId !== context, 'fresh graph file target');
    await graph.snapshot();
  }
  async function openHeadPicker() {
    const count = harness.quickPicks.length;
    await graph.send({ type: 'open-file-at-revision', commitHash: head, origin: (await graph.snapshot()).messageOrigin });
    await waitFor(() => harness.quickPicks.length > count && !harness.quickPicks.at(-1)!.busy, 'fresh HEAD file picker');
  }
}

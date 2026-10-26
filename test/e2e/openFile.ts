import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { Repository } from '../../src/git';
import { contents, git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { command, waitFor } from './webviewBridge';

export async function verifyOpenFile(harness: SafetyHarness, repository: Pick<Repository, 'rootUri'>): Promise<void> {
  const root = repository.rootUri.fsPath;
  const before = contents(root), index = indexState(root), head = git(root, ['rev-parse', 'HEAD']);
  const baseline = git(root, ['rev-parse', 'baseline']);
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  await waitFor(() => !graph.loading, 'graph ready for Open File');
  await graph.send({ type: 'compare-selected', baseRevision: 'baseline', baseLabel: 'Baseline',
    compareRevision: 'main', compareLabel: 'Main', origin: (await graph.snapshot()).messageOrigin });
  const compare = await harness.panel('gitRefs.compareResultsView');
  await waitFor(() => compare.state?.kind === 'results', 'Open File comparison');
  const row = '.row[data-item-id]';
  await compare.menu(row, 'openWorktreeFile');
  await waitFor(() => vscode.window.activeTextEditor?.document.uri.fsPath === root + '/same.txt', 'native current file editor');
  const current = vscode.window.activeTextEditor!;
  await current.edit(edit => edit.insert(new vscode.Position(0, 0), 'unsaved review\n'));
  assert.equal(current.document.isDirty, true);
  await compare.menu(row, 'openWorktreeFile');
  await waitFor(() => vscode.window.activeTextEditor?.document === current.document, 'existing dirty editor');
  assert.ok(current.document.getText().startsWith('unsaved review'));
  await command('workbench.action.files.revert');
  try {
    git(root, ['update-ref', 'refs/heads/baseline', head]);
    await compare.menu(row, 'openSourceFile');
    await revisionEditor(baseline, 'original.txt');
    await compare.menu(row, 'openTargetFile');
    await revisionEditor(head, 'same.txt');
  } finally {
    git(root, ['update-ref', 'refs/heads/baseline', baseline]);
  }
  await graph.send({ type: 'show-log', source: { kind: 'target', revision: head, label: 'Main' }, origin: (await graph.snapshot()).messageOrigin });
  const log = await harness.panel('gitRefs.showLogView');
  await waitFor(() => !!log.state?.commits?.some(entry => entry.hash === head) && !log.loading, 'Open File Show Log');
  await log.send({ type: 'toggleCommit', commitHash: head, origin: (await log.snapshot()).messageOrigin });
  await waitFor(() => !!log.state?.commits?.some(entry => entry.hash === head && entry.changes.length > 0), 'expanded file list');
  await log.menu('[data-change-id]', 'openTargetFile');
  await revisionEditor(head, 'same.txt');
  await log.menu('[data-change-id]', 'openWorktreeFile');
  await waitFor(() => vscode.window.activeTextEditor?.document.uri.scheme === 'file', 'Show Log current file editor');
  assert.equal(contents(root), before);
  assert.equal(indexState(root), index);
  assert.equal(git(root, ['rev-parse', 'HEAD']), head);
  assert.deepEqual(harness.errors, []);
  console.log('[e2e:safety] Open File current/dirty editor, pinned source/target rename and Show Log passed');

  async function revisionEditor(revision: string, file: string) {
    await waitFor(() => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      return uri?.scheme === 'git-ext-ref' && new URLSearchParams(uri.query).get('ref') === revision
        && new URLSearchParams(uri.query).get('path')?.endsWith('/' + file) === true;
    }, `historical editor ${file}`);
    const document = vscode.window.activeTextEditor!.document;
    assert.equal(document.getText(), git(root, ['show', `${revision}:${file}`]) + '\n');
    assert.equal(document.isDirty, false);
    assert.ok(document.uri.path.includes(revision.slice(0, 8)), 'Editor path must identify its revision');
  }
}

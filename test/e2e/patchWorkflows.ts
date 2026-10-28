import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { waitFor } from './webviewBridge';

export async function verifyPatchWorkflows(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath;
  const fixture = process.env.GIT_REVISION_GRAPH_E2E_FIXTURE_ROOT!;
  const output = path.join(fixture, 'comparison.patch'), formatted = path.join(fixture, 'commit.patch');
  const input = path.join(fixture, 'input.patch');
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  const before = git(root, ['rev-parse', 'HEAD']), index = indexState(root);
  const baseline = git(root, ['rev-parse', 'baseline']);
  const origin = (await graph.snapshot()).messageOrigin;
  await graph.send({ type: 'compare-selected', baseRevision: baseline, baseLabel: 'baseline', compareRevision: before, compareLabel: 'HEAD', origin });
  const compare = await harness.panel('gitRefs.compareResultsView');
  await waitFor(() => compare.state?.kind === 'results', 'comparison for patch export');
  harness.saveDestination = vscode.Uri.file(output);
  await compare.control('filterCompare', { value: 'no-file-can-match-this-filter' });
  await compare.control('click', { selector: '#savePatchButton' });
  await waitFor(async () => fs.stat(output).then(() => true, () => false), 'full patch saved despite filter');
  const patch = await fs.readFile(output, 'utf8');
  const prefix = `baseline-${baseline.slice(0, 8)}-to-HEAD-${before.slice(0, 8)}-`;
  assert.equal(path.basename(harness.saveSuggestions.at(-1)!.fsPath), `${prefix}1.patch`);
  await waitFor(() => compare.posted.filter(message => message.type === 'patchProgress').length >= 2, 'first patch export finished');
  const secondOutput = path.join(fixture, 'comparison-next.patch');
  harness.saveDestination = vscode.Uri.file(secondOutput);
  await compare.control('click', { selector: '#savePatchButton' });
  await waitFor(async () => fs.readFile(secondOutput, 'utf8').then(text => text === patch, () => false), 'second patch export');
  assert.equal(path.basename(harness.saveSuggestions.at(-1)!.fsPath), `${prefix}2.patch`);
  assert.ok(patch.includes('original.txt') && patch.includes('same.txt'));
  assert.equal(indexState(root), index);
  await graph.send({ type: 'show-log', source: { kind: 'target', revision: before, label: 'HEAD' }, origin: (await graph.snapshot()).messageOrigin });
  const log = await harness.panel('gitRefs.showLogView');
  await waitFor(() => !!log.state?.commits?.length && !log.state.loading, 'Show Log patch commit');
  harness.saveDestination = vscode.Uri.file(formatted);
  await log.menu(`[data-commit-hash="${before}"]`, 'formatPatch');
  await waitFor(async () => fs.stat(formatted).then(() => true, () => false), 'formatted commit saved');
  assert.match(await fs.readFile(formatted, 'utf8'), new RegExp(`^From ${before} `));
  const directory = path.join(fixture, 'selected-patches');
  await fs.mkdir(directory); harness.patchDirectory = vscode.Uri.file(directory);
  await log.control('click', { selector: `.commit-row[data-commit-hash="${before}"]`, ctrlKey: true });
  await log.control('click', { selector: `.commit-row[data-commit-hash="${baseline}"]`, ctrlKey: true });
  await log.menu(`.commit-row[data-commit-hash="${before}"]`, 'formatPatch');
  const names = [`0001-${baseline.slice(0, 12)}.patch`, `0002-${before.slice(0, 12)}.patch`];
  await waitFor(async () => {
    const contents = await Promise.all(names.map(name => fs.readFile(path.join(directory, name), 'utf8').catch(() => '')));
    return contents[0].startsWith(`From ${baseline} `) && contents[1].startsWith(`From ${before} `);
  }, 'one patch per selected commit');
  assert.deepEqual((await fs.readdir(directory)).sort(), names);
  for (const [index, hash] of [baseline, before].entries()) {
    assert.match(await fs.readFile(path.join(directory, names[index]), 'utf8'), new RegExp(`^From ${hash} `));
  }
  assert.equal(git(root, ['rev-parse', 'HEAD']), before); assert.equal(indexState(root), index);
  harness.patchDirectory = undefined;

  const head = graph.state!.references!.find(ref => ref.kind === 'head')!;
  const headSelector = `[data-ref-kind="head"][data-ref-name="${head.name}"]`;
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root, 'same.txt')));
  const original = document.getText();
  const edit = new vscode.WorkspaceEdit(); edit.insert(document.uri, new vscode.Position(0, 0), 'unsaved test\n');
  assert.equal(await vscode.workspace.applyEdit(edit), true);
  await waitFor(() => graph.state?.hasUnsavedChanges === true, 'unsaved editors disable patch application');
  graph.panel.reveal();
  const menu = await graph.control('inspectMenu', { selector: headSelector });
  assert.equal(menu.menuItems?.find(item => item.action === 'apply-patch')?.disabled, true);
  const undo = new vscode.WorkspaceEdit(); undo.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), original);
  assert.equal(await vscode.workspace.applyEdit(undo), true); await document.save();
  await waitFor(() => graph.state?.hasUnsavedChanges === false, 'clean editor restores patch availability');

  await fs.writeFile(input, 'diff --git a/patch-added.txt b/patch-added.txt\nnew file mode 100644\n--- /dev/null\n+++ b/patch-added.txt\n@@ -0,0 +1 @@\n+from patch\n');
  harness.patchInput = vscode.Uri.file(input); harness.allowedConfirmations.add('Apply Patch');
  await repository.status();
  await graph.menu(headSelector, 'apply-patch');
  await waitFor(async () => fs.readFile(path.join(root, 'patch-added.txt'), 'utf8').then(text => text === 'from patch\n', () => false), 'native Git API applied patch');
  assert.equal(git(root, ['rev-parse', 'HEAD']), before);
  assert.equal(indexState(root), index);
  assert.ok(harness.confirmations.some(message => message.startsWith('Apply patch to ')));
  await fs.unlink(path.join(root, 'patch-added.txt')); await repository.status();
  harness.saveDestination = undefined; harness.patchInput = undefined;
  assert.deepEqual(harness.errors, []);
  console.log('[e2e:safety] full filtered comparison export, Show Log Format Patch and native HEAD-only worktree apply passed');
}

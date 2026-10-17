import assert from 'node:assert/strict';
import { installNegativeControl } from './negativeControls';
import { existsSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { SafetyHarness } from './safetyHarness';
import { command, ObservedPanel, waitFor } from './webviewBridge';
import { checkoutLog, contents, git, GitFault, indexState } from './gitSafetyFixture';
const GRAPH = 'gitRefs.revisionGraphEditorPanel';
const COMPARE = 'gitRefs.compareResultsView';
const LOG = 'gitRefs.showLogView';
interface Repository {
  readonly rootUri: vscode.Uri;
}

export async function runSafetyScenarios(harness: SafetyHarness, repositories: readonly Repository[], extensionPath: string): Promise<void> {
  const restoreGuard = installNegativeControl(extensionPath);
  try {
    const [a, b] = harness.roots;
    const graph = await harness.panel(GRAPH);
    try {
      await graphReady(graph, a);
    } catch (error) {
      console.error('Graph diagnostics', graph.state, harness.errors, graph.received.slice(-5));
      throw error;
    }
    await graphReplay(harness, graph);
    console.log('[e2e:safety] graph cross-repository and A→B→A replay / fresh Git checkout passed');
    await compareReplay(harness, repositories);
    console.log('[e2e:safety] Compare Results stale restore / fresh DOM restore / repository isolation passed');
    await logReplay(harness, graph);
    console.log('[e2e:safety] Show Log stale source / fresh DOM restore / identical commit passed');
    await restoreFailure(harness, repositories, extensionPath);
    console.log('[e2e:safety] partial rename restore failure / recovery of both paths and index passed');
    await pendingClose(harness, graph, extensionPath);
    console.log('[e2e:safety] pending load / close / reopen / stale message rejection passed');
    assert.equal(git(a, ['symbolic-ref', '--short', 'HEAD']), 'main');
    assert.equal(git(b, ['symbolic-ref', '--short', 'HEAD']), 'main');
    assert.deepEqual(harness.panels.flatMap(panel => panel.received.filter(message => message.type === '__e2e-browser-error')), [], 'Actual webviews must not report JavaScript errors');
  } finally {
    restoreGuard();
  }
}

async function graphReady(panel: ObservedPanel, root: string): Promise<void> {
  await waitFor(() => {
    if (panel.state?.errorMessage)
      throw new Error(panel.state.errorMessage);
    return panel.state?.repositoryPath === root && !!panel.state.messageOrigin && !panel.state.loading && !panel.loading;
  }, `graph ready in ${root}`);
  assert.equal((await panel.snapshot()).repositoryPath, root, 'The browser must display the selected repository');
}

async function choose(harness: SafetyHarness, graph: ObservedPanel, root: string): Promise<void> {
  harness.selectedRoot = root;
  await graph.send({ type: 'choose-repository' });
  await graphReady(graph, root);
}

async function graphReplay(harness: SafetyHarness, graph: ObservedPanel): Promise<void> {
  const [a, b] = harness.roots;
  const original = await graph.snapshot();
  const beforeA = checkoutLog(a).length, beforeB = checkoutLog(b).length;
  await choose(harness, graph, b);
  const stale = { type: 'checkout', refName: 'side', refKind: 'branch', origin: original.messageOrigin };
  await graph.send(stale);
  await graph.send({ ...stale, origin: undefined });
  await graph.send({ type: 'checkout', refName: 'other', refKind: 'branch', origin: (await graph.snapshot()).messageOrigin });
  await waitFor(() => { assert.deepEqual(harness.errors, []); return git(b, ['symbolic-ref', '--short', 'HEAD']) === 'other'; }, 'fresh B checkout in real Git');
  assert.equal(git(a, ['symbolic-ref', '--short', 'HEAD']), 'main');
  assert.equal(git(b, ['symbolic-ref', '--short', 'HEAD']), 'other');
  assert.equal(checkoutLog(a).length, beforeA);
  assert.equal(checkoutLog(b).length, beforeB + 1);
  assert.equal(checkoutLog(b)[0], 'checkout: moving from main to other');
  await choose(harness, graph, a);
  await graph.send(stale);
  await graph.send({ type: 'checkout', refName: 'other', refKind: 'branch', origin: (await graph.snapshot()).messageOrigin });
  await waitFor(() => { assert.deepEqual(harness.errors, []); return git(a, ['symbolic-ref', '--short', 'HEAD']) === 'other'; }, 'fresh A checkout after ABA replay');
  assert.equal(checkoutLog(a).length, beforeA + 1);
  assert.ok(checkoutLog(a)[0].endsWith('main to other'));
  assert.deepEqual(harness.errors, []);
  for (const root of [a, b])
    git(root, ['checkout', 'main']);
  await waitFor(() => graph.state?.currentHeadName === 'main', 'real Git state reconciled after reset');
}

async function compare(harness: SafetyHarness, repository: Repository, ref = 'main'): Promise<ObservedPanel> {
  await command('gitRefs.compareWithWorktree', { kind: 'ref', repository, ref: { type: 0, name: ref } });
  const panel = await harness.panel(COMPARE);
  await waitFor(() => panel.state?.kind === 'results' && panel.state.messageOrigin?.repositoryPath === repository.rootUri.fsPath, 'comparison results');
  return panel;
}

async function compareReplay(harness: SafetyHarness, repositories: readonly Repository[]): Promise<void> {
  const [a, b] = harness.roots;
  const source = git(a, ['show', 'main:same.txt']) + '\n';
  writeFileSync(path.join(a, 'same.txt'), source + 'local A\n');
  writeFileSync(path.join(b, 'same.txt'), source + 'local B\n');
  const indexA = indexState(a), indexB = indexState(b);
  const first = await compare(harness, repositories[0]);
  const original = await first.snapshot();
  const panel = await compare(harness, repositories[1]);
  const state = await panel.snapshot();
  const item = state.items![0];
  assert.notEqual(item.id, original.items![0].id);
  const confirmations = harness.confirmations.length;
  await panel.send({ type: 'revert', itemId: item.id, origin: original.messageOrigin });
  await panel.menu('.row[data-item-id]', 'revert');
  await waitFor(() => panel.state?.kind === 'empty', 'fresh comparison restore completion');
  assert.equal(harness.confirmations.length, confirmations + 1, 'Only the fresh action may ask for confirmation');
  assert.equal(contents(a), source + 'local A\n');
  assert.equal(contents(b), source);
  assert.equal(indexState(a), indexA);
  assert.equal(indexState(b), indexB);
  assert.deepEqual(harness.errors, []);
}

async function showLog(harness: SafetyHarness, graph: ObservedPanel, root: string): Promise<ObservedPanel> {
  await choose(harness, graph, root);
  await graph.send({ type: 'show-log', source: { kind: 'target', revision: 'main', label: 'main' }, origin: (await graph.snapshot()).messageOrigin });
  const log = await harness.panel(LOG);
  await waitFor(() => log.state?.messageOrigin?.repositoryPath === root && !log.state.loading && !!log.state.commits?.length, 'log loaded');
  const state = await log.snapshot();
  await log.send({ type: 'toggleCommit', commitHash: state.commits![0].hash, origin: state.messageOrigin });
  await waitFor(() => !!log.state?.commits?.[0].changes.length, 'expanded commit changes');
  await log.snapshot();
  return log;
}

async function logReplay(harness: SafetyHarness, graph: ObservedPanel): Promise<void> {
  const [a, b] = harness.roots;
  const original = await (await showLog(harness, graph, a)).snapshot();
  const log = await showLog(harness, graph, b), state = await log.snapshot();
  const commit = state.commits![0];
  assert.equal(commit.hash, original.commits![0].hash, 'Clones must expose the identical commit');
  const source = contents(b), index = indexState(b), confirmations = harness.confirmations.length;
  writeFileSync(path.join(b, 'same.txt'), source + 'local log B\n');
  await log.send({ type: 'revertFileToCommit', commitHash: commit.hash, changeId: commit.changes[0].id, origin: original.messageOrigin });
  await log.menu('.file-row[data-change-id]', 'revertFileToCommit');
  await waitFor(() => {
    assert.deepEqual(harness.errors, []);
    return contents(b) === source;
  }, 'fresh log restore completion in real Git');
  assert.equal(harness.confirmations.length, confirmations + 1);
  assert.ok(contents(a).endsWith('local A\n'));
  assert.equal(indexState(b), index);
  assert.deepEqual(harness.errors, []);
}

async function restoreFailure(harness: SafetyHarness, repositories: readonly Repository[], extensionPath: string): Promise<void> {
  const a = harness.roots[0];
  const panel = await compare(harness, repositories[0], 'baseline');
  const state = await panel.snapshot();
  assert.ok(state.items?.some(item => item.originalPath && item.path === 'same.txt'), 'Fixture must produce a real rename');
  const old = Buffer.from('local original path\0data'), current = contents(a), index = indexState(a), errors = harness.errors.length;
  writeFileSync(path.join(a, 'original.txt'), old);
  const fault = new GitFault(extensionPath, a, 'fail-restore');
  try {
    await panel.menu('.row[data-item-id]', 'revert');
    await waitFor(() => harness.errors.length > errors, 'failed restore error boundary');
    assert.equal(harness.errors.length, errors + 1);
    assert.match(harness.errors.at(-1)!, /injected E2E restore failure/);
    assert.ok(existsSync(fault.started), 'Fault must occur after real Git has already restored the later path');
    assert.equal(contents(a), current);
    assert.deepEqual(require('node:fs').readFileSync(path.join(a, 'original.txt')), old);
    assert.equal(indexState(a), index);
  } finally {
    fault.dispose();
  }
}

async function pendingClose(harness: SafetyHarness, previous: ObservedPanel, extensionPath: string): Promise<void> {
  const a = harness.roots[0];
  await previous.panel.reveal();
  await choose(harness, previous, a);
  const oldState = await previous.snapshot(), errors = harness.errors.length;
  const fault = new GitFault(extensionPath, a, 'hold-log');
  try {
    await previous.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => existsSync(fault.started), 'pending native graph log');
    previous.panel.dispose();
    const oldPosted = previous.posted.length;
    fault.unblock();
    await command('gitRefs.openRevisionGraphEditor', { preserveGraphState: true });
    const reopened = await harness.panel(GRAPH);
    assert.notEqual(reopened, previous);
    await graphReady(reopened, a);
    const state = await reopened.snapshot();
    assert.notDeepEqual(state.messageOrigin, oldState.messageOrigin);
    const beforeRefresh = reopened.posted.filter(message => message.type === 'update-state').length;
    await reopened.send({ type: 'checkout', refName: 'side', refKind: 'branch', origin: oldState.messageOrigin });
    await reopened.send({ type: 'refresh' });
    await waitFor(() => reopened.posted.filter(message => message.type === 'update-state').length > beforeRefresh && !reopened.loading, 'fresh render after replay');
    assert.equal(git(a, ['symbolic-ref', '--short', 'HEAD']), 'main');
    assert.equal(previous.posted.length, oldPosted, 'Retired surface must receive no late posts');
    assert.equal(harness.errors.length, errors, 'Cancelled load must not report late errors');
    assert.equal(reopened.posted.some(message => message.type === 'set-error'), false, 'Cancelled load must not publish error state');
  } finally {
    fault.dispose();
  }
}

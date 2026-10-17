import assert from 'node:assert/strict';
import * as path from 'node:path';
import { RefType } from '../../src/git';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { git } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { ObservedPanel, waitFor } from './webviewBridge';

const TAG = 'v22.3.0-next.2';

export async function verifyTagDetachedHead(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath;
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  harness.selectedRoot = root;
  await graph.send({ type: 'choose-repository' });
  await waitFor(() => graph.state?.repositoryPath === root && !graph.loading, 'initial fixture repository');
  const original = git(root, ['symbolic-ref', '--short', 'HEAD']);
  const tagCommit = git(root, ['rev-parse', 'main']);
  const branchCommit = git(root, ['rev-parse', 'baseline']);
  git(root, ['tag', '--annotate', '--no-sign', '-m', 'Detached HEAD regression', TAG, tagCommit]);
  let branchCreated = false;
  try {
    await repository.checkout(`refs/tags/${TAG}`);
    await repository.status();
    assert.equal(repository.state.HEAD?.type, RefType.Tag);
    assert.equal(repository.state.HEAD.name, TAG, 'The actual API must expose the reported tag name');
    let state = await refresh(harness, graph);
    assert.equal(state.currentHeadName, undefined);
    assert.equal(graph.panel.title, `${path.basename(root)}: Detached HEAD (Tag: ${TAG})`);
    assert.ok(state.references?.some(ref => ref.kind === 'tag' && ref.name === TAG));
    assert.equal(state.references?.some(ref => ref.kind === 'head'), false);

    git(root, ['branch', TAG, branchCommit]);
    branchCreated = true;
    await repository.status();
    state = await refresh(harness, graph);
    assert.equal(state.currentHeadName, undefined, 'A same-named branch must not attach detached HEAD');
    assert.equal(state.references?.find(ref => ref.kind === 'tag' && ref.name === TAG)?.hash, tagCommit);
    assert.equal(state.references?.find(ref => ref.kind === 'branch' && ref.name === TAG)?.hash, branchCommit);
    harness.allowedConfirmations.add(`Checkout to: ${TAG}`);
    await graph.send({ type: 'checkout', refName: TAG, refKind: 'branch', origin: state.messageOrigin });
    await waitFor(() => {
      assert.deepEqual(harness.errors, []);
      return git(root, ['rev-parse', '--symbolic-full-name', 'HEAD']) === `refs/heads/${TAG}`;
    }, 'attaching the branch with the same tag name');
    assert.equal(git(root, ['rev-parse', 'HEAD']), branchCommit);
    await repository.status();
    state = await refresh(harness, graph);
    assert.equal(state.currentHeadName, TAG);
    assert.equal(graph.panel.title, `${path.basename(root)}: Branch: ${TAG}`);

    await repository.checkout(branchCommit);
    await repository.status();
    state = await refresh(harness, graph);
    assert.equal(state.currentHeadName, undefined, 'Detached commit must remain branchless');
    assert.equal(graph.panel.title, `${path.basename(root)}: Detached HEAD`);
  } finally {
    harness.allowedConfirmations.delete(`Checkout to: ${TAG}`);
    await repository.checkout(original);
    if (branchCreated) git(root, ['branch', '-D', TAG]);
    git(root, ['tag', '-d', TAG]);
    await repository.status();
  }
  await refresh(harness, graph);
  console.log('[e2e:safety] tag-detached graph, same-name branch attachment and detached commit passed');
}

async function refresh(harness: SafetyHarness, graph: ObservedPanel) {
  const before = graph.state?.messageOrigin?.contextId;
  const posted = graph.posted.length;
  await graph.send({ type: 'refresh-with-empty-cache' });
  await waitFor(() => {
    assert.deepEqual(harness.errors, []);
    assert.equal(graph.posted.slice(posted).some(message => message.type === 'set-error'), false, 'Graph load must not report malformed refs');
    return graph.state?.viewMode === 'ready' && !graph.loading && graph.state.messageOrigin?.contextId !== before;
  }, 'fresh graph after HEAD change');
  return graph.snapshot();
}

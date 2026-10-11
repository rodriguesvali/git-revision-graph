import test from 'node:test';
import assert from 'node:assert/strict';
import { RefType } from '../src/git';
import { DefaultRevisionGraphBackend } from '../src/revisionGraph/backend';
import { buildReadyRevisionGraphViewStateBundle, buildReadyRevisionGraphViewStateBundleFromSnapshot } from '../src/revisionGraph/panel/state';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createRepository } from './fakes';
import { createBisectFixture } from './bugBisectFixture';

const limits = { initialLimit: 1, steppedLimits: [], minVisibleNodes: 1, graphCommandTimeoutMs: 60000 };

function session(root: string, hashes: readonly string[], index: number): RevisionGraphProtocol.BisectView {
  return { id: 'marker-test', version: index + 1, repositoryPath: root, status: 'testing',
    selected: { hash: hashes[0], subject: 'good' }, original: { hash: hashes[6], subject: 'bad' },
    current: { hash: hashes[index], subject: `revision ${index}` }, swapped: false,
    candidates: [], history: [], mergeBaseCheck: false, busy: false };
}

test('pins the detached bisect commit with the exact visual label despite scope, focus and bounded history', async () => {
  const fixture = await createBisectFixture();
  try {
    await fixture.git('checkout', '--detach', fixture.hashes[2]);
    const repository = createRepository({ root: fixture.root,
      head: { type: RefType.Head, commit: fixture.hashes[2] },
      refs: [{ type: RefType.Head, name: 'main', commit: fixture.hashes[6] }] });
    const refsBefore = await fixture.git('show-ref');
    const backend = new DefaultRevisionGraphBackend();
    for (const extra of [ {}, { refScope: 'local' as const }, { refScope: 'remoteHead' as const },
      { descendantFocus: { anchorRevision: fixture.hashes[6], anchorLabel: 'main' } },
      { revisionRange: { baseRevision: fixture.hashes[5], baseLabel: 'base', compareRevision: fixture.hashes[6], compareLabel: 'HEAD' } } ]) {
      const context = { bisect: session(fixture.root, fixture.hashes, 2), branchDescriptions: new Map<string, string>() };
      const { state } = await buildReadyRevisionGraphViewStateBundle(repository,
        { ...createDefaultRevisionGraphProjectionOptions(), ...extra, showTags: false, showRemoteBranches: false, showStashes: false },
        backend, limits, undefined, undefined, context);
      const marker = state.references.find(ref => ref.name === 'Bisect Commit');
      assert.ok(marker, 'the current test revision must have a visible reference');
      assert.equal(marker.hash, fixture.hashes[2]);
      assert.equal(marker.kind, 'bisect');
      assert.equal(state.scene.nodes.find(node => node.hash === marker.hash)?.subject, 'revision 2');
      assert.equal(state.flowGovernance?.references.some(ref => ref.refName === 'Bisect Commit'), false);
    }
    assert.equal(await fixture.git('show-ref'), refsBefore, 'visual references never change Git refs');
  } finally { await fixture.dispose(); }
});

test('moves the bisect marker on the next step and removes it from reused snapshots when the session ends', async () => {
  const fixture = await createBisectFixture();
  try {
    const backend = new DefaultRevisionGraphBackend();
    const options = createDefaultRevisionGraphProjectionOptions();
    const build = async (index: number) => {
      await fixture.git('checkout', '--detach', fixture.hashes[index]);
      const repository = createRepository({ root: fixture.root, head: { type: RefType.Head, commit: fixture.hashes[index] },
        refs: [{ type: RefType.Head, name: 'main', commit: fixture.hashes[6] }] });
      const context = { bisect: session(fixture.root, fixture.hashes, index), branchDescriptions: new Map<string, string>() };
      return { repository, bundle: await buildReadyRevisionGraphViewStateBundle(repository, options, backend, limits, undefined, undefined, context) };
    };
    const first = await build(2);
    assert.equal(first.bundle.state.references.filter(ref => ref.name === 'Bisect Commit').length, 1);
    const next = await build(4);
    assert.deepEqual(next.bundle.state.references.filter(ref => ref.name === 'Bisect Commit').map(ref => ref.hash), [fixture.hashes[4]]);
    const finished = await buildReadyRevisionGraphViewStateBundleFromSnapshot(next.repository, options, backend, next.bundle.snapshot);
    assert.equal(finished.state.references.some(ref => ref.name === 'Bisect Commit'), false);
  } finally { await fixture.dispose(); }
});

test('does not mark an unstarted search, another repository or a commit that was not checked out', async () => {
  const fixture = await createBisectFixture();
  try {
    const repository = createRepository({ root: fixture.root, head: { type: RefType.Head, name: 'main', commit: fixture.hashes[6] },
      refs: [{ type: RefType.Head, name: 'main', commit: fixture.hashes[6] }] });
    const view = session(fixture.root, fixture.hashes, 6);
    for (const bisect of [ { ...view, status: 'preparing' as const }, { ...view, repositoryPath: '/another/repo' }, session(fixture.root, fixture.hashes, 2) ]) {
      const context = { bisect, branchDescriptions: new Map<string, string>() };
      const { state } = await buildReadyRevisionGraphViewStateBundle(repository, createDefaultRevisionGraphProjectionOptions(), new DefaultRevisionGraphBackend(), limits, undefined, undefined, context);
      assert.equal(state.references.some(ref => ref.name === 'Bisect Commit'), false);
    }
  } finally { await fixture.dispose(); }
});

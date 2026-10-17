import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { RefType } from '../src/git';
import { getPublishedLocalBranchNames } from '../src/gitState';
import { getReferenceDescription } from '../src/refPresentation';
import { DefaultRevisionGraphBackend } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import { loadRevisionGraphReadyStateMetadata } from '../src/revisionGraph/panel/readyMetadata';
import { buildReadyRevisionGraphViewStateBundleFromSnapshot } from '../src/revisionGraph/panel/state';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createBranch, createRepository } from './fakes';
import { createSharedGitFixture } from './gitFixture';

const TAG = 'v22.3.0-next.2';

test('tag-detached HEAD never becomes refs/heads/<tag> in real merge metadata fallback', async () => {
  const fixture = await createSharedGitFixture();
  const git = (args: string[]) => execFileSync('git', args, { cwd: fixture.repositoryPath, encoding: 'utf8', stdio: 'pipe' }).trim();
  try {
    git(['branch', '-M', 'main']);
    git(['tag', TAG]);
    git(['checkout', '--detach', `refs/tags/${TAG}`]);
    assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD']), 'HEAD');
    const repository = createRepository({
      root: fixture.repositoryPath,
      head: { type: RefType.Tag, name: TAG, commit: fixture.renameCommit },
      refs: [
        { type: RefType.Head, name: 'main', commit: fixture.renameCommit },
        { type: RefType.Tag, name: TAG, commit: fixture.renameCommit }
      ]
    });
    const snapshot = {
      graph: buildCommitGraph([{
        hash: fixture.renameCommit, parents: [], author: 'Fixture', date: '2026-10-17',
        subject: 'tag checkout', refs: [{ kind: 'tag' as const, name: TAG }]
      }]),
      loadedAt: Date.now(), requestedLimit: 1
    };
    const backend = new DefaultRevisionGraphBackend();
    // A ref absent from the raw graph exercises the real batched CLI fallback.
    const metadata = await loadRevisionGraphReadyStateMetadata(repository, backend, snapshot, [
      { id: 'main', kind: 'branch', name: 'main', hash: fixture.renameCommit, title: 'main' }
    ]);
    assert.deepEqual(metadata.mergeBlockedTargets, []);
    assert.deepEqual(await backend.getMergeBlockedTargets(repository, snapshot, TAG, [
      { id: 'main', kind: 'branch', name: 'main', hash: fixture.renameCommit, title: 'main' }
    ]), [], 'The backend must also reject a detached tag supplied as a branch name');
    const { state } = await buildReadyRevisionGraphViewStateBundleFromSnapshot(
      repository, createDefaultRevisionGraphProjectionOptions(), backend, snapshot
    );
    assert.equal(state.viewMode, 'ready');
    assert.equal(state.currentHeadName, undefined);
    assert.ok(state.references.some(ref => ref.kind === 'tag' && ref.name === TAG));
    assert.equal(state.references.some(ref => ref.kind === 'head'), false);
  } finally { await fixture.dispose(); }
});

test('a detached tag does not replace or mark a same-named published branch as current', () => {
  const branch = createBranch({ type: RefType.Head, name: TAG, commit: 'branch-commit', upstream: { remote: 'origin', name: TAG } });
  const repository = createRepository({
    root: '/repo', head: { type: RefType.Tag, name: TAG, commit: 'tag-commit' }, refs: [branch]
  });
  assert.deepEqual(getPublishedLocalBranchNames(repository), [TAG]);
  assert.notEqual(getReferenceDescription(repository, branch), 'current');
});

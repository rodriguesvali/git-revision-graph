import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BugBisectSessions, type BugBisectHost } from '../src/bugBisect/session';
import { RepositoryMutationCoordinator } from '../src/repositoryMutationCoordinator';
import { RevisionGraphMessageHandler, type RevisionGraphMessageHandlerHost } from '../src/revisionGraph/messageHandler';
import { createBisectFixture } from './bugBisectFixture';
import { createRepository, createRevisionLogEntry } from './fakes';
import { startShowLogBugBisect } from '../src/showLog/bugBisectAction';
import { createHiddenShowLogState, type ShowLogState } from '../src/showLogShared';

async function setup() {
  const f = await createBisectFixture();
  const coordinator = new RepositoryMutationCoordinator();
  const sessions = new BugBisectSessions(coordinator, {
    hasUnsavedDocuments: () => false, changed() {}
  } as unknown as BugBisectHost);
  const repository = createRepository({ root: f.root });
  const host: Pick<RevisionGraphMessageHandlerHost, 'getCurrentRepository' | 'prepareBugBisect'> = {
    getCurrentRepository: () => repository,
    prepareBugBisect: (repo, revision, refKind) => sessions.prepare(repo, revision, refKind)
  };
  const handler = new RevisionGraphMessageHandler(host as RevisionGraphMessageHandlerHost);
  return {
    ...f, repository, sessions,
    start(revision: string, refKind: RevisionGraphProtocol.TargetKind) {
      return handler.handleMessage({ type: 'start-bug-bisect', revision, refKind });
    },
    async expectSelection(revision: string, refKind: RevisionGraphProtocol.TargetKind, hash: string) {
      const refs = await f.git('for-each-ref', '--format=%(refname) %(objectname)');
      await handler.handleMessage({ type: 'start-bug-bisect', revision, refKind });
      assert.equal(sessions.state(f.root)?.selected.hash, hash);
      assert.equal((await f.engine.head()).hash, f.hashes[6]);
      assert.equal((await f.engine.head()).branch, 'refs/heads/main');
      assert.equal(await f.git('status', '--porcelain=v1'), '');
      assert.equal(await f.git('for-each-ref', '--format=%(refname) %(objectname)'), refs);
      assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    },
    async dispose() { sessions.dispose(); coordinator.dispose(); await f.dispose(); }
  };
}

test('graph bisect resolves a selected branch instead of its namesake tag', async () => {
  const f = await setup();
  try {
    await f.git('branch', 'release', f.hashes[1]);
    await f.git('tag', 'release', f.hashes[4]);
    await f.expectSelection('release', 'branch', f.hashes[1]);
    await f.expectSelection('release', 'tag', f.hashes[4]);
  } finally { await f.dispose(); }
});

test('bisect peels an annotated namesake tag from packed refs', async () => {
  const f = await setup();
  try {
    await f.git('branch', 'release', f.hashes[1]);
    await f.git('tag', '-a', 'release', '-m', 'annotated release', f.hashes[4]);
    await f.git('pack-refs', '--all', '--prune');
    await f.expectSelection('release', 'tag', f.hashes[4]);
    await f.expectSelection('release', 'branch', f.hashes[1]);
  } finally { await f.dispose(); }
});

test('bisect remote target cannot resolve a namesake local branch or tag', async () => {
  const f = await setup();
  try {
    await f.git('branch', 'origin/release', f.hashes[1]);
    await f.git('tag', 'origin/release', f.hashes[4]);
    await f.git('update-ref', 'refs/remotes/origin/release', f.hashes[3]);
    await f.expectSelection('origin/release', 'remote', f.hashes[3]);
    await f.expectSelection('origin/release', 'branch', f.hashes[1]);
    await f.expectSelection('origin/release', 'tag', f.hashes[4]);
  } finally { await f.dispose(); }
});

test('bisect stash target cannot resolve namesake branches or tags', async () => {
  const f = await setup();
  try {
    await writeFile(join(f.root, 'test.txt'), 'stashed modification');
    await f.git('stash', 'push', '-m', 'bisect stash target');
    const stash = (await f.git('show-ref', '--verify', '--hash', 'refs/stash')).trim();
    await f.git('branch', 'stash', f.hashes[1]);
    await f.git('tag', 'stash', f.hashes[4]);
    await f.expectSelection('stash', 'stash', stash);
    await f.expectSelection('stash', 'branch', f.hashes[1]);
    await f.expectSelection('stash', 'tag', f.hashes[4]);
    await assert.rejects(f.start('other', 'stash'), /Invalid bisect stash/);
  } finally { await f.dispose(); }
});

test('bisect preserves literal branch names that start with refs/', async () => {
  const f = await setup();
  try {
    await f.git('branch', 'refs/tags/release', f.hashes[1]);
    await f.git('tag', 'release', f.hashes[4]);
    await f.git('tag', 'refs/tags/release', f.hashes[3]);
    await f.expectSelection('refs/tags/release', 'branch', f.hashes[1]);
    await f.expectSelection('refs/tags/release', 'tag', f.hashes[3]);
  } finally { await f.dispose(); }
});

test('bisect HEAD target retains the same-HEAD guard despite a namesake tag', async () => {
  const f = await setup();
  try {
    await f.git('tag', 'main', f.hashes[4]);
    await assert.rejects(f.start('main', 'head'), /different from HEAD/);
    await assert.rejects(f.start('HEAD', 'head'), /different from HEAD/);
    assert.equal(f.sessions.state(f.root), null);
    await f.expectSelection('main', 'tag', f.hashes[4]);
  } finally { await f.dispose(); }
});

test('missing bisect references fail without Git namespace fallback or revision expressions', async () => {
  const f = await setup();
  try {
    await f.git('tag', 'release', f.hashes[4]);
    await f.git('tag', 'refs/heads/release', f.hashes[3]);
    await f.git('branch', 'origin/release', f.hashes[1]);
    await f.git('branch', 'stash', f.hashes[1]);
    for (const [revision, kind] of [['release', 'branch'], ['origin/release', 'remote'],
      ['stash', 'stash'], ['main~1', 'branch']] as const) {
      await assert.rejects(f.start(revision, kind));
      assert.equal(f.sessions.state(f.root), null);
      assert.equal((await f.engine.head()).hash, f.hashes[6]);
      assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    }
    await assert.rejects(f.start('release', 'commit'), /Invalid bisect commit/);
  } finally { await f.dispose(); }
});

test('Show Log explicitly prepares its loaded full commit hash even with hash-shaped refs', async () => {
  const f = await setup();
  try {
    const hash = f.hashes[1];
    await f.git('tag', hash, f.hashes[4]);
    await f.git('branch', hash, f.hashes[3]);
    const visible = { ...createHiddenShowLogState(), kind: 'visible', repository: f.repository,
      sourceToken: 'loaded', entries: [createRevisionLogEntry({ hash })] } as unknown as ShowLogState;
    await startShowLogBugBisect(visible, hash, 'loaded', (repo, revision) => f.sessions.prepare(repo, revision, 'commit'));
    assert.equal(f.sessions.state(f.root)?.selected.hash, hash);
    await f.expectSelection(hash, 'commit', hash);
  } finally { await f.dispose(); }
});

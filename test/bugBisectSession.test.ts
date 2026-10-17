import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { BugBisectSessions, type BugBisectHost } from '../src/bugBisect/session';
import { BisectGit } from '../src/bugBisect/git';
import { RepositoryMutationCoordinator } from '../src/repositoryMutationCoordinator';
import { readBisectSessions, type BisectSession } from '../src/bugBisect/sessionState';
import { createRepository } from './fakes';
import { createBisectFixture } from './bugBisectFixture';

async function setup() {
  const f = await createBisectFixture();
  const repository = createRepository({ root: f.root });
  let failure = false;
  repository.checkout = async (ref) => { if (failure) throw new Error('Checkout failed'); await f.git('checkout', ref); };
  let stored: readonly BisectSession[] = [];
  let unsaved = false;
  let confirmed = true;
  const emissions: unknown[] = [];
  const host: BugBisectHost = {
    hasUnsavedDocuments: () => unsaved,
    async save(sessions) { stored = sessions; },
    changed(root, state, reveal) { emissions.push({ root, state, reveal }); },
    async confirmStop() { return confirmed; },
    async confirmAbandon() { return confirmed; },
    async inspect() {}, async copy() {}, async openSourceControl() {}
  };
  const coordinator = new RepositoryMutationCoordinator();
  let sessions = new BugBisectSessions(coordinator, host);
  const state = () => { const value = sessions.state(f.root); assert.ok(value); return value; };
  const message = (action: RevisionGraphProtocol.BisectControl): RevisionGraphProtocol.MessageOf<'bisect-control'> => ({
    type: 'bisect-control', repositoryPath: f.root, id: state().id, version: state().version, action
  });
  const control = (action: RevisionGraphProtocol.BisectControl) => sessions.control(repository, message(action));
  return {
    ...f, repository, host, coordinator, emissions, state, message, control,
    get sessions() { return sessions; }, get stored() { return stored; },
    setFailure(value: boolean) { failure = value; }, setUnsaved(value: boolean) { unsaved = value; },
    setConfirmed(value: boolean) { confirmed = value; },
    async prepare() { await sessions.prepare(repository, f.hashes[0]); },
    reload(snapshot: unknown = stored) { sessions.dispose(); sessions = new BugBisectSessions(coordinator, host, snapshot); },
    async dispose() { sessions.dispose(); coordinator.dispose(); await f.dispose(); }
  };
}

test('session finds a bug, preserves the branch ref and restores original attachment', async () => {
  const f = await setup();
  try {
    await f.prepare();
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    await f.control('start');
    assert.equal((await f.engine.head()).branch, undefined);
    assert.deepEqual(await f.coordinator.run(f.root, () => 'conflicting'), { status: 'rejected' });
    assert.equal((await f.coordinator.run(`${f.root}-other`, () => 'independent')).status, 'completed');
    let count = 0;
    while (f.state().status === 'testing') {
      const hash = f.state().current!.hash;
      assert.equal((await f.engine.head()).hash, hash);
      await f.control(f.hashes.indexOf(hash) >= 3 ? 'bad' : 'good');
      assert.ok(++count < 8);
    }
    assert.equal(f.state().status, 'found');
    assert.equal(f.state().candidates[0].hash, f.hashes[3]);
    assert.equal((await f.engine.resolveCommit('main')).hash, f.hashes[6]);
    await f.control('stop');
    assert.equal(f.sessions.state(f.root), null);
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[6], branch: 'refs/heads/main' });
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    assert.deepEqual(f.stored, []);
    assert.equal((await f.coordinator.run(f.root, () => 'available')).status, 'completed');
  } finally { await f.dispose(); }
});

test('dirty and unsaved test work blocks answer, undo and restoration without deleting files', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const current = f.state().current!.hash;
    await writeFile(join(f.root, 'generated.txt'), 'keep this');
    for (const action of ['good', 'undo', 'stop'] as const) {
      await f.control(action);
      assert.match(f.state().error!, /Resolve changes/);
      assert.equal((await f.engine.head()).hash, current);
      assert.equal(f.state().history.length, 0);
    }
    await rm(join(f.root, 'generated.txt'));
    f.setUnsaved(true); await f.control('good'); assert.match(f.state().error!, /Resolve changes/);
    f.setUnsaved(false); await f.control('retry'); assert.equal(f.state().error, undefined);
    await f.control('good'); assert.equal(f.state().history.length, 1);
  } finally { await f.dispose(); }
});

test('undo and reload retain the exact test question and original destination', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const previous = f.state().current!.hash;
    await f.control('bad'); assert.equal(f.state().history.length, 1);
    f.reload(); assert.equal(f.state().original.hash, f.hashes[6]);
    await f.control('undo');
    assert.equal(f.state().current!.hash, previous);
    assert.equal((await f.engine.head()).hash, previous);
    assert.equal(f.state().history.length, 0);
    assert.equal(f.state().error, undefined);
    await f.control('stop'); assert.equal((await f.engine.head()).branch, 'refs/heads/main');
  } finally { await f.dispose(); }
});

test('failed checkout retains selected revision for retry and restoration', async () => {
  const f = await setup();
  try {
    await f.prepare(); f.setFailure(true); await f.control('start');
    assert.match(f.state().error!, /Checkout failed/);
    assert.equal(f.state().status, 'testing');
    assert.equal((await f.engine.head()).hash, f.hashes[6]);
    f.reload(); f.setFailure(false); await f.control('retry');
    assert.equal((await f.engine.head()).hash, f.state().current!.hash);
    assert.equal(f.state().error, undefined);
    await f.control('stop'); assert.equal((await f.engine.head()).hash, f.hashes[6]);
  } finally { await f.dispose(); }
});

test('stale, cross-repository and duplicate answer messages cannot advance the question', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const message = f.message('good');
    await f.sessions.control(f.repository, { ...message, id: 'not-owned' });
    await f.sessions.control(f.repository, { ...message, repositoryPath: '/other' });
    assert.equal(f.state().history.length, 0);
    await Promise.all([f.sessions.control(f.repository, message), f.sessions.control(f.repository, message)]);
    assert.equal(f.state().history.length, 1);
    await f.sessions.control(f.repository, message); assert.equal(f.state().history.length, 1);
  } finally { await f.dispose(); }
});

test('external bisect metadata and checkout changes fail closed', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    await f.git('checkout', f.hashes[0]); await f.control('good');
    assert.match(f.state().error!, /HEAD changed outside/);
    assert.equal(f.state().history.length, 0);
    await f.git('checkout', f.state().current!.hash);
    await f.git('bisect', 'good', f.state().current!.hash);
    const externalLog = await f.engine.log();
    await f.control('stop'); assert.match(f.state().error!, /state changed outside/);
    assert.equal(await f.engine.log(), externalLog);
  } finally { await f.dispose(); }
});

test('external branch movement offers detached restoration without rewriting the branch', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    await f.git('update-ref', 'refs/heads/main', f.hashes[1]);
    await f.control('stop'); assert.match(f.state().error!, /original branch moved/);
    await f.control('stop-detached');
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[6], branch: undefined });
    assert.equal((await f.engine.resolveCommit('main')).hash, f.hashes[1]);
  } finally { await f.dispose(); }
});

test('swapped endpoints restore the original detached HEAD and cancelled stop is inert', async () => {
  const f = await setup();
  try {
    await f.git('checkout', f.hashes[0]);
    await f.sessions.prepare(f.repository, f.hashes[6]); await f.control('start-swapped');
    assert.equal(f.state().swapped, true);
    const head = await f.engine.head();
    f.setConfirmed(false); await f.control('stop'); assert.deepEqual(await f.engine.head(), head);
    f.setConfirmed(true); await f.control('stop');
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[0], branch: undefined });
  } finally { await f.dispose(); }
});

test('cancelling preparation and failed clean checks do not reserve the repository', async () => {
  const f = await setup();
  try {
    await f.prepare(); f.setUnsaved(true); await f.control('start');
    assert.match(f.state().error!, /Resolve changes/);
    assert.equal((await f.coordinator.run(f.root, () => 'free')).status, 'completed');
    await f.control('stop');
    assert.equal(f.sessions.state(f.root), null);
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    f.setUnsaved(false); await f.engine.start(f.hashes[6], f.hashes[0]);
    await assert.rejects(f.prepare(), /already active/);
  } finally { await f.dispose(); }
});

test('cancelling preparation invalidates a concurrently submitted start before Git mutation', async () => {
  const f = await setup();
  try {
    await f.prepare();
    const start = f.message('start');
    const cancel = f.message('stop');
    await Promise.all([f.sessions.control(f.repository, start), f.sessions.control(f.repository, cancel)]);
    assert.equal(f.sessions.state(f.root), null);
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[6], branch: 'refs/heads/main' });
    assert.equal((await f.coordinator.run(f.root, () => 'available')).status, 'completed');
    assert.deepEqual(f.stored, []);
  } finally { await f.dispose(); }
});

test('detaching controls invalidates a stop confirmation that is still pending', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    f.setUnsaved(true); await f.control('good'); f.setUnsaved(false);
    let confirm: (value: boolean) => void = () => {};
    let opened: () => void = () => {};
    const waiting = new Promise<void>(resolve => { opened = resolve; });
    f.host.confirmStop = () => { opened(); return new Promise(resolve => { confirm = resolve; }); };
    const head = await f.engine.head(); const log = await f.engine.log();
    const stop = f.control('stop'); await waiting;
    await f.control('abandon');
    confirm(true); await stop;
    assert.equal(f.sessions.state(f.root), null);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), log);
    assert.equal((await f.coordinator.run(f.root, () => 'available')).status, 'completed');
    assert.deepEqual(f.stored, []);
  } finally { await f.dispose(); }
});

test('selection checkout rechecks ownership after persistence and preserves a replacement session', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const head = await f.engine.head(); const save = f.host.save;
    let replaced = false; let externalLog = '';
    f.host.save = async sessions => {
      await save(sessions);
      const session = sessions[0];
      if (!replaced && session?.current?.hash !== head.hash && !session?.pendingAnswer) {
        replaced = true;
        await f.engine.reset(); await f.engine.start(f.hashes[5], f.hashes[1]);
        externalLog = await f.engine.log();
      }
    };
    await f.control('good');
    assert.equal(replaced, true);
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), externalLog);
  } finally { await f.dispose(); }
});

test('undo rechecks ownership after reset persistence before restarting native bisect', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start'); await f.control('good');
    const head = await f.engine.head(); const save = f.host.save;
    let replaced = false; let externalLog = '';
    f.host.save = async sessions => {
      await save(sessions);
      if (!replaced && sessions[0]?.rebuilding && sessions[0]?.log === '') {
        replaced = true;
        await f.engine.start(f.hashes[5], f.hashes[1]); externalLog = await f.engine.log();
      }
    };
    await f.control('undo');
    assert.equal(replaced, true);
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), externalLog);
  } finally { await f.dispose(); }
});

test('detaching controls never resets externally changed Git state or checkout', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    await f.git('bisect', 'good', f.state().current!.hash);
    const log = await f.engine.log(); const head = await f.engine.head();
    await f.control('stop'); assert.match(f.state().error!, /state changed outside/);
    f.setConfirmed(false); await f.control('abandon'); assert.ok(f.sessions.state(f.root));
    f.setConfirmed(true); await f.control('abandon');
    assert.equal(f.sessions.state(f.root), null);
    assert.equal(await f.engine.log(), log); assert.deepEqual(await f.engine.head(), head);
    assert.deepEqual(f.stored, []);
    assert.equal((await f.coordinator.run(f.root, () => 'available')).status, 'completed');
  } finally { await f.dispose(); }
});

test('an invalid endpoint-role choice can be corrected without leaving the original revision', async () => {
  const f = await setup();
  try {
    await f.git('checkout', f.hashes[0]);
    await f.sessions.prepare(f.repository, f.hashes[6]);
    await f.control('start'); assert.ok(f.state().error);
    assert.equal((await f.engine.head()).hash, f.hashes[0]);
    await f.control('start-swapped');
    assert.equal(f.state().error, undefined); assert.equal(f.state().status, 'testing');
    await f.control('stop'); assert.equal((await f.engine.head()).hash, f.hashes[0]);
  } finally { await f.dispose(); }
});

test('restoration preserves checkout when another bisect replaces the session during persistence', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const head = await f.engine.head(); const save = f.host.save;
    let replaced = false; let externalLog = '';
    f.host.save = async sessions => {
      await save(sessions);
      if (!replaced && sessions[0]?.returning) {
        replaced = true;
        await f.engine.reset(); await f.engine.start(f.hashes[5], f.hashes[1]);
        externalLog = await f.engine.log();
      }
    };
    await f.control('stop');
    assert.equal(replaced, true);
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), externalLog);
  } finally { await f.dispose(); }
});

test('restoration rechecks metadata after checkout and never resets a replacement external session', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const checkout = f.repository.checkout;
    f.repository.checkout = async (ref) => {
      await checkout(ref);
      if (ref === 'main') {
        await f.engine.reset();
        await f.engine.start(f.hashes[5], f.hashes[1]);
      }
    };
    await f.control('stop');
    assert.match(f.state().error!, /state changed outside/);
    assert.equal((await f.engine.head()).hash, f.hashes[6]);
    assert.ok((await f.engine.log()).includes(f.hashes[5]));
    assert.equal(await f.engine.hasMetadata('BISECT_START'), true);
  } finally { await f.dispose(); }
});

test('a persisted pending answer retries once after storage failure without duplicating history', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const log = await f.engine.log();
    const save = f.host.save; let fail = true;
    f.host.save = async (sessions) => {
      if (fail) { fail = false; throw new Error('Storage unavailable'); }
      await save(sessions);
    };
    await f.control('good');
    assert.match(f.state().error!, /Storage unavailable/);
    assert.equal(await f.engine.log(), log);
    f.reload(); await f.control('retry');
    assert.equal(f.state().error, undefined);
    assert.equal(f.state().history.length, 1);
    assert.equal((await f.engine.head()).hash, f.state().current!.hash);
  } finally { await f.dispose(); }
});

test('interrupted checkout recovers the persisted intended revision on reload', async () => {
  const f = await setup();
  try {
    await f.prepare();
    const checkout = f.repository.checkout;
    f.repository.checkout = async (ref) => { await checkout(ref); f.coordinator.invalidate(f.root); };
    await f.control('start');
    assert.ok(f.state().error);
    assert.equal((await f.engine.head()).hash, f.state().current!.hash);
    f.repository.checkout = checkout; f.reload(); await f.control('retry');
    assert.equal(f.state().error, undefined);
    await f.control('stop'); assert.equal((await f.engine.head()).branch, 'refs/heads/main');
  } finally { await f.dispose(); }
});

test('interrupted restoration retains the original destination and can finish after reload', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const checkout = f.repository.checkout;
    f.repository.checkout = async (ref) => { await checkout(ref); f.coordinator.invalidate(f.root); };
    await f.control('stop');
    assert.ok(f.state().error);
    assert.equal((await f.engine.head()).hash, f.hashes[6]);
    assert.equal(await f.engine.hasMetadata('BISECT_START'), true);
    f.repository.checkout = checkout; f.reload(); await f.control('stop');
    assert.equal(f.sessions.state(f.root), null);
    assert.equal((await f.engine.head()).branch, 'refs/heads/main');
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
  } finally { await f.dispose(); }
});

async function replaceWithIdenticalBisect(f: Awaited<ReturnType<typeof setup>>): Promise<void> {
  const session = f.stored[0];
  const log = await f.engine.log();
  await f.engine.reset();
  await f.engine.start(session.swapped ? session.selected.hash : session.original.hash,
    session.swapped ? session.original.hash : session.selected.hash);
  for (const entry of session.history) await f.engine.answer(entry.answer, entry.commit.hash);
  assert.equal(await f.engine.log(), log, 'The replacement must have the exact same log');
}

for (const action of ['good', 'bad', 'skip', 'undo', 'retry', 'stop', 'stop-detached'] as const) {
  test(`an external bisect with the same endpoints/history blocks ${action} without changing native state`, async () => {
    const f = await setup();
    try {
      await f.prepare(); await f.control('start'); await f.control('good');
      await replaceWithIdenticalBisect(f);
      const head = await f.engine.head(); const log = await f.engine.log();
      const selection = await f.engine.resolveCommit('BISECT_HEAD');
      const history = f.state().history;
      await f.control(action);
      assert.match(f.state().error ?? '', /state changed outside/);
      assert.deepEqual(await f.engine.head(), head);
      assert.equal(await f.engine.log(), log);
      assert.deepEqual(await f.engine.resolveCommit('BISECT_HEAD'), selection);
      assert.deepEqual(f.state().history, history);
      assert.equal(await f.engine.hasMetadata('BISECT_START'), true);
    } finally { await f.dispose(); }
  });
}

test('replacement with identical start contents and log is rejected after reload', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const startPath = join(f.root, (await f.git('rev-parse', '--git-path', 'BISECT_START')).trim());
    const originalStart = await readFile(startPath, 'utf8');
    const head = await f.engine.head(); const log = await f.engine.log();
    await f.engine.reset(); await f.git('checkout', 'main');
    await f.engine.start(f.hashes[6], f.hashes[0]); await f.git('checkout', head.hash);
    assert.equal(await readFile(startPath, 'utf8'), originalStart);
    assert.equal(await f.engine.log(), log);
    f.reload(); await f.control('stop');
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), log);
    assert.equal(await f.engine.hasMetadata('BISECT_START'), true);
  } finally { await f.dispose(); }
});

test('legacy stored searches retain recovery context but cannot adopt an active native bisect', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const legacy = f.stored.map(({ nativeIdentity: _identity, ...session }) => session);
    const head = await f.engine.head(); const log = await f.engine.log();
    f.reload(legacy); await f.control('retry');
    assert.match(f.state().error ?? '', /native identity cannot be verified/);
    assert.equal(f.state().original.hash, f.hashes[6]);
    await f.control('stop'); assert.match(f.state().error ?? '', /native identity cannot be verified/);
    await f.control('abandon');
    assert.equal(f.sessions.state(f.root), null);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), log);
    assert.equal((await f.coordinator.run(f.root, () => 'available')).status, 'completed');
  } finally { await f.dispose(); }
});

test('persisted native identity is validated and never exposed to the webview', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    assert.match(f.stored[0].nativeIdentity ?? '', /^[a-f0-9]{64}$/);
    assert.equal(Object.hasOwn(f.state(), 'nativeIdentity'), false);
    for (const nativeIdentity of ['', 'bad', 'a'.repeat(65), 42, null]) {
      assert.deepEqual(readBisectSessions([{ ...f.stored[0], nativeIdentity }]), []);
    }
    f.reload(); await f.control('good'); await f.control('undo'); await f.control('stop');
    assert.equal(f.sessions.state(f.root), null);
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[6], branch: 'refs/heads/main' });
  } finally { await f.dispose(); }
});

test('a same-log replacement during selection persistence is rejected before the next checkout', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const head = await f.engine.head(); const save = f.host.save;
    let replaced = false; let log = '';
    f.host.save = async sessions => {
      await save(sessions);
      if (!replaced && sessions[0]?.current?.hash !== head.hash && !sessions[0]?.pendingAnswer) {
        replaced = true;
        await replaceWithIdenticalBisect(f); log = await f.engine.log();
      }
    };
    await f.control('good');
    assert.equal(replaced, true);
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), log);
  } finally { await f.dispose(); }
});

test('a same-log replacement during restoration checkout cannot be reset', async () => {
  const f = await setup();
  try {
    await f.prepare(); await f.control('start');
    const checkout = f.repository.checkout; let log = '';
    f.repository.checkout = async ref => {
      await checkout(ref);
      if (ref === 'main') { await replaceWithIdenticalBisect(f); log = await f.engine.log(); }
    };
    await f.control('stop');
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.equal(await f.engine.log(), log);
    assert.equal(await f.engine.hasMetadata('BISECT_START'), true);
  } finally { await f.dispose(); }
});

test('native command recovery cannot adopt a replacement with the exact expected log extension', async () => {
  const f = await setup(); const answer = BisectGit.prototype.answer;
  try {
    await f.prepare(); await f.control('start');
    const identity = f.stored[0].nativeIdentity;
    const head = await f.engine.head(); let replaced = false; let log = '';
    BisectGit.prototype.answer = async function (classification, hash) {
      const selection = await answer.call(this, classification, hash);
      if (this.repositoryPath === f.root && !replaced) {
        replaced = true;
        await replaceWithIdenticalBisect(f); log = await f.engine.log();
      }
      return selection;
    };
    await f.control('good');
    assert.equal(replaced, true);
    assert.match(f.state().error ?? '', /state changed outside/);
    assert.equal(f.stored[0].nativeIdentity, identity, 'A replacement identity must never become owned');
    assert.deepEqual(await f.engine.head(), head);
    assert.equal(await f.engine.log(), log);
  } finally { BisectGit.prototype.answer = answer; await f.dispose(); }
});

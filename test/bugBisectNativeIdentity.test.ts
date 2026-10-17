import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BisectGit } from '../src/bugBisect/git';
import { createBisectFixture } from './bugBisectFixture';

test('native identity stays stable across answers but changes on an identical restart', async () => {
  const f = await createBisectFixture();
  try {
    assert.equal(await f.engine.nativeIdentity(), undefined);
    const selection = await f.engine.start(f.hashes[6], f.hashes[0]);
    const start = resolve(f.root, (await f.git('rev-parse', '--git-path', 'BISECT_START')).trim());
    const content = await readFile(start);
    const identity = await f.engine.nativeIdentity();
    assert.match(identity ?? '', /^[a-f0-9]{64}$/);
    assert.equal(await f.engine.nativeIdentity(), identity);
    await f.engine.answer('good', selection.current!.hash);
    assert.equal(await f.engine.nativeIdentity(), identity);
    await f.engine.reset();
    assert.equal(await f.engine.nativeIdentity(), undefined);
    await f.engine.start(f.hashes[6], f.hashes[0]);
    assert.deepEqual(await readFile(start), content);
    assert.notEqual(await f.engine.nativeIdentity(), identity);
  } finally { await f.dispose(); }
});

test('linked worktrees retain independent native identities', async () => {
  const f = await createBisectFixture(); const linked = `${f.root}-linked`;
  try {
    await f.git('worktree', 'add', '--detach', linked, f.hashes[6]);
    const other = new BisectGit(linked);
    await f.engine.start(f.hashes[6], f.hashes[0]);
    await other.start(f.hashes[6], f.hashes[0]);
    const identity = await other.nativeIdentity();
    assert.ok(identity);
    assert.notEqual(identity, await f.engine.nativeIdentity());
    await f.engine.reset();
    assert.equal(await other.nativeIdentity(), identity);
  } finally { await rm(linked, { recursive: true, force: true }); await f.dispose(); }
});

test('oversized native start metadata fails closed', async () => {
  const f = await createBisectFixture();
  try {
    await f.engine.start(f.hashes[6], f.hashes[0]);
    const start = resolve(f.root, (await f.git('rev-parse', '--git-path', 'BISECT_START')).trim());
    await writeFile(start, 'a'.repeat(16_385));
    await assert.rejects(f.engine.nativeIdentity(), /Invalid native bisect start metadata/);
  } finally { await f.dispose(); }
});

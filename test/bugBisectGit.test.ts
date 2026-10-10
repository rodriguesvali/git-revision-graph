import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BisectGit } from '../src/bugBisect/git';
import { createBisectFixture } from './bugBisectFixture';

test('native bisect selects revisions without checkout and finds the first bad commit', async () => {
  const f = await createBisectFixture();
  try {
    await f.engine.assertClean(false);
    let selection = await f.engine.start(f.hashes[6], f.hashes[0]);
    let steps = 0;
    while (selection.status === 'testing') {
      assert.equal((await f.engine.head()).hash, f.hashes[6]);
      assert.equal(selection.mergeBaseCheck, false);
      const index = f.hashes.indexOf(selection.current!.hash);
      selection = await f.engine.answer(index >= 3 ? 'bad' : 'good', selection.current!.hash);
      assert.ok(++steps < 7);
    }
    assert.equal(selection.status, 'found');
    assert.deepEqual(selection.candidates.map((commit) => commit.hash), [f.hashes[3]]);
    await f.engine.reset();
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    assert.deepEqual(await f.engine.head(), { hash: f.hashes[6], branch: 'refs/heads/main' });
  } finally { await f.dispose(); }
});

test('skipping untestable revisions reports multiple possible culprits', async () => {
  const f = await createBisectFixture();
  try {
    let selection = await f.engine.start(f.hashes[3], f.hashes[1]);
    selection = await f.engine.answer('skip', selection.current!.hash);
    assert.equal(selection.status, 'inconclusive');
    assert.deepEqual(new Set(selection.candidates.map((commit) => commit.hash)), new Set([f.hashes[2], f.hashes[3]]));
  } finally { await f.dispose(); }
});

test('clean-worktree guard catches untracked, staged, unstaged and unsaved documents', async () => {
  const f = await createBisectFixture();
  try {
    await assert.rejects(f.engine.assertClean(true), /Resolve changes/);
    await writeFile(join(f.root, 'untracked.txt'), 'untracked');
    await assert.rejects(f.engine.assertClean(false), /Resolve changes/);
    await rm(join(f.root, 'untracked.txt'));
    await writeFile(join(f.root, 'test.txt'), 'changed');
    await assert.rejects(f.engine.assertClean(false), /Resolve changes/);
    await f.git('add', '--', 'test.txt');
    await assert.rejects(f.engine.assertClean(false), /Resolve changes/);
  } finally { await f.dispose(); }
});

test('divergent endpoints ask for merge-base evidence before searching', async () => {
  const f = await createBisectFixture();
  try {
    await f.git('checkout', '-b', 'healthy', f.hashes[2]);
    await writeFile(join(f.root, 'other.txt'), 'branch');
    await f.git('add', '--', 'other.txt'); await f.git('commit', '-m', 'healthy branch');
    const good = (await f.engine.head()).hash;
    await f.git('checkout', 'main');
    const selection = await f.engine.start(f.hashes[6], good);
    assert.equal(selection.current?.hash, f.hashes[2]);
    assert.equal(selection.mergeBaseCheck, true);
    const result = await f.engine.answer('bad', selection.current!.hash);
    assert.equal(result.status, 'outside');
  } finally { await f.dispose(); }
});

test('native history search finds a bug introduced on a merged side branch', async () => {
  const f = await createBisectFixture();
  try {
    await f.git('checkout', '-b', 'feature', f.hashes[2]);
    await writeFile(join(f.root, 'bug.txt'), 'introduced bug');
    await f.git('add', '--', 'bug.txt'); await f.git('commit', '-m', 'introduce side branch bug');
    const culprit = (await f.engine.head()).hash;
    await f.git('checkout', 'main'); await f.git('merge', '--no-ff', '-m', 'merge feature', 'feature');
    let selection = await f.engine.start((await f.engine.head()).hash, f.hashes[0]);
    let steps = 0;
    while (selection.status === 'testing') {
      const ancestors = (await f.git('rev-list', selection.current!.hash)).split('\n');
      selection = await f.engine.answer(ancestors.includes(culprit) ? 'bad' : 'good', selection.current!.hash);
      assert.ok(++steps < 10);
    }
    assert.equal(selection.status, 'found');
    assert.equal(selection.candidates[0].hash, culprit);
  } finally { await f.dispose(); }
});

test('linked worktrees keep their native bisect metadata independent', async () => {
  const f = await createBisectFixture();
  const linked = `${f.root}-linked`;
  try {
    await f.git('worktree', 'add', '--detach', linked, f.hashes[6]);
    const other = new BisectGit(linked);
    await f.engine.start(f.hashes[6], f.hashes[0]);
    await other.start(f.hashes[5], f.hashes[2]);
    const otherLog = await other.log();
    await f.engine.reset();
    assert.equal(await f.engine.hasMetadata('BISECT_START'), false);
    assert.equal(await other.hasMetadata('BISECT_START'), true);
    assert.equal(await other.log(), otherLog);
    await other.reset();
  } finally {
    await rm(linked, { recursive: true, force: true });
    await f.dispose();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadCommitPatch, loadComparisonPatch } from '../src/patches/exportGit';
import { checkPatch, inspectCleanPatchTarget } from '../src/patches/applyGit';
import { preparePatchInput, validatePatchBytes, readPatchFile } from '../src/patches/input';
import { formatShowLogPatch } from '../src/showLog/patchExport';
import { writeCommitPatchFiles } from '../src/patches/files';
import { createHiddenShowLogState } from '../src/showLogShared';
import { createRepository, createRevisionLogEntry } from './fakes';

async function fixture(t: test.TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-patch-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], {
    env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Author', GIT_AUTHOR_EMAIL: 'author@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  git('init', '-q', '-b', 'main');
  const write = (name: string, contents: string | Buffer) => fs.writeFile(path.join(root, name), contents);
  await write('text.txt', 'old\n'); await write('old name.txt', 'rename\n');
  await write('delete.txt', 'delete\n'); await write('binary.bin', Buffer.from([0, 1, 255]));
  git('add', '.'); git('commit', '-qm', 'root');
  const base = git('rev-parse', 'HEAD').toString().trim();
  await write('text.txt', 'new\n'); await fs.rename(path.join(root, 'old name.txt'), path.join(root, 'new name.txt'));
  await fs.unlink(path.join(root, 'delete.txt')); await write('added.txt', 'added\n');
  await write('binary.bin', Buffer.from([0, 2, 254]));
  git('add', '.'); git('commit', '-qm', 'change files');
  const target = git('rev-parse', 'HEAD').toString().trim();
  return { root, git, write, base, target };
}

test('comparison patch contains all change kinds and applies without changing HEAD or index', async t => {
  const f = await fixture(t);
  const patch = await loadComparisonPatch(f.root, f.base, f.target);
  assert.match(patch.toString(), /GIT binary patch/);
  assert.match(patch.toString(), /rename from old name.txt/);
  f.git('checkout', '-q', '--detach', f.base);
  const index = await fs.readFile(path.join(f.root, '.git', 'index'));
  const input = await preparePatchInput(patch); t.after(() => input.dispose());
  const summary = await checkPatch(f.root, input.filePath);
  assert.match(summary, /text.txt/); assert.match(summary, /added.txt/);
  f.git('apply', '--', input.filePath);
  assert.equal(f.git('rev-parse', 'HEAD').toString().trim(), f.base);
  assert.deepEqual(await fs.readFile(path.join(f.root, '.git', 'index')), index);
  assert.deepEqual(await fs.readFile(path.join(f.root, 'binary.bin')), Buffer.from([0, 2, 254]));
  assert.equal(await fs.readFile(path.join(f.root, 'new name.txt'), 'utf8'), 'rename\n');
  await assert.rejects(fs.stat(path.join(f.root, 'delete.txt')));
});

test('selected Format Patch creates one mailbox per exact commit and excludes gaps', async t => {
  const f = await fixture(t);
  await f.write('third.txt', 'third\n'); f.git('add', '.'); f.git('commit', '-qm', 'third selected commit');
  const last = f.git('rev-parse', 'HEAD').toString().trim();
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-selected-patches-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const index = await fs.readFile(path.join(f.root, '.git', 'index'));
  const state = { ...createHiddenShowLogState(), kind: 'visible' as const, loading: false,
    repository: createRepository({ root: f.root }), entries: [last, f.target, f.base].map(hash =>
      createRevisionLogEntry({ hash, parentHashes: [] })) };
  await formatShowLogPatch(() => state, [last, f.base], {
    async suggestComparisonFileName() { throw new Error('must not name comparison'); },
    async chooseDirectory() { return output; }, writeCommitPatches: writeCommitPatchFiles,
    async chooseDestination() { throw new Error('must choose folder'); }, async writeFile() { throw new Error('must write batch'); },
    hasDirtyEditors() { return false; }, loadCommit: loadCommitPatch, loadComparison: loadComparisonPatch
  });
  const names = (await fs.readdir(output)).sort();
  assert.equal(names.length, 2);
  for (const [index, hash] of [f.base, last].entries()) {
    const text = await fs.readFile(path.join(output, names[index]), 'utf8');
    assert.match(text, new RegExp(`^From ${hash} `));
    assert.equal((text.match(/^From [0-9a-f]{40} Mon Sep 17 /gm) || []).length, 1);
    assert.match(text, /From: Author <author@example.invalid>/);
    assert.doesNotMatch(text, /Subject: \[PATCH\] change files/);
  }
  assert.equal(f.git('rev-parse', 'HEAD').toString().trim(), last);
  assert.deepEqual(await fs.readFile(path.join(f.root, '.git', 'index')), index);
});

test('worktree export includes staged, unstaged, untracked and ignored-but-staged files without staging', async t => {
  const f = await fixture(t);
  await f.write('text.txt', 'worktree\n'); await f.write('untracked.txt', 'untracked\n');
  await f.write('.gitignore', 'ignored.txt\n'); await f.write('ignored.txt', 'tracked despite ignore\n');
  f.git('add', '-f', 'ignored.txt');
  const before = f.git('status', '--porcelain=v1', '-z');
  const patch = await loadComparisonPatch(f.root, f.base);
  for (const name of ['added.txt', 'delete.txt', 'text.txt', 'untracked.txt', 'ignored.txt', '.gitignore']) {
    assert.ok(patch.includes(Buffer.from(name)), `missing ${name}`);
  }
  assert.match(patch.toString(), /\+worktree/);
  assert.deepEqual(f.git('status', '--porcelain=v1', '-z'), before);
});

test('worktree export handles a staged addition removed from disk and preserves tracked deletions', async t => {
  const f = await fixture(t);
  await f.write('staged then removed.txt', 'temporary\n');
  f.git('add', 'staged then removed.txt');
  await fs.unlink(path.join(f.root, 'staged then removed.txt'));
  await fs.unlink(path.join(f.root, 'text.txt'));
  await f.write('new worktree.txt', 'different new worktree content\n');
  const before = f.git('status', '--porcelain=v1', '-z');
  const index = await fs.readFile(path.join(f.root, '.git', 'index'));
  const patch = await loadComparisonPatch(f.root, f.target);
  assert.match(patch.toString(), /deleted file mode 100644/);
  assert.match(patch.toString(), /text\.txt/);
  assert.match(patch.toString(), /new worktree\.txt/);
  assert.doesNotMatch(patch.toString(), /staged then removed\.txt/);
  assert.deepEqual(f.git('status', '--porcelain=v1', '-z'), before);
  assert.deepEqual(await fs.readFile(path.join(f.root, '.git', 'index')), index);
});

test('commit export pins exactly one commit, supports roots, and refuses merges', async t => {
  const f = await fixture(t);
  assert.match((await loadCommitPatch(f.root, f.base)).toString(), new RegExp(`^From ${f.base} `));
  const patch = await loadCommitPatch(f.root, f.target);
  assert.match(patch.toString(), new RegExp(`^From ${f.target} `));
  assert.equal((patch.toString().match(/^From [a-f0-9]+ Mon Sep/gm) ?? []).length, 1);
  f.git('checkout', '-qb', 'side', f.base); await f.write('side.txt', 'side\n');
  f.git('add', '.'); f.git('commit', '-qm', 'side'); f.git('checkout', '-q', 'main');
  f.git('merge', '-q', '--no-ff', 'side', '-m', 'merge');
  const merge = f.git('rev-parse', 'HEAD').toString().trim();
  await assert.rejects(loadCommitPatch(f.root, merge), /merge/i);
  await assert.rejects(loadCommitPatch(f.root, '--evil'), /immutable/i);
  await assert.rejects(loadComparisonPatch(f.root, f.base, ''), /immutable/i);
});

test('apply guard requires the exact clean attached HEAD and rejects ongoing sessions', async t => {
  const f = await fixture(t); const target = { branchName: 'main', commitHash: f.target };
  await inspectCleanPatchTarget(f.root, target);
  await assert.rejects(inspectCleanPatchTarget(f.root, { ...target, commitHash: f.base }), /HEAD|changed/i);
  await f.write('dirty.txt', 'dirty'); await assert.rejects(inspectCleanPatchTarget(f.root, target), /clean/i);
  await fs.unlink(path.join(f.root, 'dirty.txt'));
  await fs.writeFile(path.join(f.root, '.git', 'MERGE_HEAD'), f.base);
  await assert.rejects(inspectCleanPatchTarget(f.root, target), /operation|progress/i);
  await fs.unlink(path.join(f.root, '.git', 'MERGE_HEAD'));
  f.git('checkout', '-q', '--detach', f.target);
  await assert.rejects(inspectCleanPatchTarget(f.root, target), /branch|HEAD/i);
});

test('invalid and multi-message patches are rejected before application', async t => {
  const f = await fixture(t);
  assert.throws(() => validatePatchBytes(Buffer.alloc(0)), /empty/i);
  assert.throws(() => validatePatchBytes(Buffer.alloc(32 * 1024 * 1024 + 1)), /limit|large/i);
  const patch = await loadCommitPatch(f.root, f.target);
  assert.throws(() => validatePatchBytes(Buffer.concat([patch, patch])), /series|multiple/i);
  const input = await preparePatchInput(Buffer.from('garbage\n')); t.after(() => input.dispose());
  await assert.rejects(checkPatch(f.root, input.filePath));
});

test('empty commit mailbox remains exportable and explains why Apply Patch cannot use it', async t => {
  const f = await fixture(t);
  f.git('commit', '--allow-empty', '-qm', 'empty commit');
  const hash = f.git('rev-parse', 'HEAD').toString().trim();
  const patch = await loadCommitPatch(f.root, hash);
  assert.match(patch.toString(), new RegExp(`^From ${hash} `));
  const index = await fs.readFile(path.join(f.root, '.git', 'index'));
  await assert.rejects(preparePatchInput(patch), /no recognizable patch.*does not create commits.*git am --empty=keep/i);
  assert.equal(f.git('rev-parse', 'HEAD').toString().trim(), hash);
  assert.deepEqual(await fs.readFile(path.join(f.root, '.git', 'index')), index);
  f.git('checkout', '-q', '--detach', f.target);
  const mailbox = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'grg-empty-mailbox-')), 'empty.patch');
  t.after(() => fs.rm(path.dirname(mailbox), { recursive: true, force: true }));
  await fs.writeFile(mailbox, patch);
  f.git('am', '--empty=keep', mailbox);
  assert.equal(f.git('show', '-s', '--format=%s', 'HEAD').toString().trim(), 'empty commit');
  assert.equal(f.git('diff', '--name-only', 'HEAD^', 'HEAD').length, 0);
});

test('apply check refuses path traversal and protected Git paths without writing files', async t => {
  const f = await fixture(t);
  for (const name of ['../outside.txt', '.git/config']) {
    const patch = Buffer.from(`diff --git a/${name} b/${name}\nnew file mode 100644\n--- /dev/null\n+++ b/${name}\n@@ -0,0 +1 @@\n+unsafe\n`);
    const input = await preparePatchInput(patch); t.after(() => input.dispose());
    await assert.rejects(checkPatch(f.root, input.filePath));
  }
  assert.equal(f.git('status', '--porcelain=v1').toString(), '');
});

test('patch input accepts bytes from regular files and rejects directories and oversized input', async t => {
  const f = await fixture(t);
  await f.write('input.patch', 'patch bytes');
  assert.deepEqual(await readPatchFile(path.join(f.root, 'input.patch')), Buffer.from('patch bytes'));
  await assert.rejects(readPatchFile(f.root), /regular patch file/);
  const file = await fs.open(path.join(f.root, 'large.patch'), 'w');
  await file.truncate(32 * 1024 * 1024 + 1); await file.close();
  await assert.rejects(readPatchFile(path.join(f.root, 'large.patch')), /limit/);
});

test('sparse checkouts fail explicitly instead of exporting missing files as deletions', async t => {
  const f = await fixture(t); f.git('config', 'core.sparseCheckout', 'true');
  await assert.rejects(loadComparisonPatch(f.root, f.base), /sparse checkout/i);
  await assert.rejects(inspectCleanPatchTarget(f.root, { branchName: 'main', commitHash: f.target }), /sparse checkout/i);
  assert.ok((await loadComparisonPatch(f.root, f.base, f.target)).length > 0);
});

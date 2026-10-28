import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadComparisonChanges } from '../src/compareResults/endpointChanges';
import { loadComparisonPatch } from '../src/patches/exportGit';
import { createRepository, createUri } from './fakes';
import { Status } from '../src/git';
import { DefaultRevisionLogBackend } from '../src/revisionGraph/backendServices/revisionLog';
import { getShowLogFileChangeParentHash } from '../src/showLog/fileActions';
import { createRevisionLogEntry } from './fakes';

async function fixture(t: test.TestContext, objectFormat: 'sha1' | 'sha256' = 'sha1') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-endpoints-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], {
    env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' }, stdio: 'pipe'
  });
  git('init', '-q', '-b', 'main', `--object-format=${objectFormat}`);
  const write = (file: string, text: string) => fs.writeFile(path.join(root, file), text);
  await write('one.txt', 'before\n'); await write('two.txt', 'before\n');
  git('add', '.'); git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').toString().trim();
  return { root, git, write, base, repository: createRepository({ root }), commit(message: string) {
    git('add', '.'); git('commit', '-qm', message); return git('rev-parse', 'HEAD').toString().trim();
  } };
}

const options = { fileUri: createUri };

test('patch applied and committed on a sibling branch has no endpoint differences', async t => {
  const f = await fixture(t);
  await f.write('one.txt', 'after\n'); await f.write('two.txt', 'after\n');
  const original = f.commit('original');
  const patch = await loadComparisonPatch(f.root, f.base, original);
  const input = path.join(f.root, '.git', 'comparison.patch'); await fs.writeFile(input, patch);
  f.git('checkout', '-qb', 'patched', f.base); f.git('apply', '--', input);
  const applied = f.commit('apply patch separately');
  assert.notEqual(original, applied);
  assert.equal(f.git('diff', '--name-only', `${applied}...${original}`).toString(), 'one.txt\ntwo.txt\n');
  assert.equal(f.git('rev-parse', `${original}^{tree}`).toString(), f.git('rev-parse', `${applied}^{tree}`).toString());
  assert.deepEqual(await loadComparisonChanges(f.repository, applied, original, options), []);
  assert.deepEqual(await loadComparisonChanges(f.repository, original, applied, options), []);
  assert.equal((await loadComparisonChanges(f.repository, f.base, original, options)).length, 2);
});

test('endpoint comparison includes source-only changes, renames and both directions', async t => {
  const f = await fixture(t);
  f.git('checkout', '-qb', 'left', f.base);
  await f.write('left.txt', 'only left\n'); f.git('mv', 'one.txt', 'renamed\tfile.txt');
  const left = f.commit('left changes');
  f.git('checkout', '-q', 'main'); await f.write('two.txt', 'only right\n'); await f.write('right.txt', 'right\n');
  const right = f.commit('right changes');
  const changes = await loadComparisonChanges(f.repository, left, right, options);
  const byName = new Map(changes.map(change => [path.basename(change.uri.fsPath), change]));
  assert.equal(changes.length, 4);
  assert.equal(byName.get('left.txt')?.status, Status.INDEX_DELETED);
  assert.equal(byName.get('right.txt')?.status, Status.INDEX_ADDED);
  assert.equal(byName.get('two.txt')?.status, Status.MODIFIED);
  const rename = changes.find(change => change.status === Status.INDEX_RENAMED)!;
  assert.equal(rename.originalUri.fsPath, path.join(f.root, 'renamed\tfile.txt'));
  assert.equal(rename.renameUri?.fsPath, path.join(f.root, 'one.txt'));
  const reversed = await loadComparisonChanges(f.repository, right, left, options);
  assert.equal(reversed.find(change => path.basename(change.uri.fsPath) === 'left.txt')?.status, Status.INDEX_ADDED);
  assert.equal(reversed.find(change => path.basename(change.uri.fsPath) === 'right.txt')?.status, Status.INDEX_DELETED);
});

test('root commit compares against the empty tree without a merge base', async t => {
  const f = await fixture(t);
  const changes = await loadComparisonChanges(f.repository, '4b825dc642cb6eb9a060e54bf8d69288fbee4904', f.base, options);
  assert.equal(changes.length, 2);
  assert.ok(changes.every(change => change.status === Status.INDEX_ADDED));
});

for (const format of ['sha1', 'sha256'] as const) {
  test(`Show Log loads root changes with ${format} object IDs`, async t => {
    const f = await fixture(t, format);
    const backend = new DefaultRevisionLogBackend((repository, left, right) =>
      loadComparisonChanges(repository, left, right, options));
    const emptyTree = f.git('hash-object', '-t', 'tree', '--stdin').toString().trim();
    const before = f.git('status', '--porcelain=v1').toString();
    const changes = await backend.loadRevisionLogChanges(f.repository, f.base);
    assert.equal(changes.length, 2);
    assert.ok(changes.every(change => change.status === Status.INDEX_ADDED));
    assert.equal(getShowLogFileChangeParentHash([createRevisionLogEntry({ hash: f.base, parentHashes: [] })], f.base), emptyTree);
    assert.equal(f.git('status', '--porcelain=v1').toString(), before);
    await f.write('one.txt', 'after\n');
    const next = f.commit('next');
    const nonRoot = await backend.loadRevisionLogChanges(f.repository, next, f.base);
    assert.equal(nonRoot.length, 1);
    assert.equal(nonRoot[0].status, Status.MODIFIED);
  });
}

test('endpoint comparison rejects range/option revisions and honors cancellation', async t => {
  const f = await fixture(t);
  for (const invalid of ['--all', 'main...left', 'HEAD', '']) {
    await assert.rejects(loadComparisonChanges(f.repository, invalid, f.base, options), /immutable/i);
  }
  const signal = AbortSignal.abort();
  await assert.rejects(loadComparisonChanges(f.repository, f.base, f.base, { ...options, signal }), /abort/i);
});

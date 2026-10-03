import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createSharedGitFixture } from './gitFixture';
import { createRepository } from './fakes';
import { DefaultRevisionLogBackend } from '../src/revisionGraph/backendServices/revisionLog';

const execFile = promisify(execFileCallback);

test('file and change search finds changed code with literal punctuation and pages the current scope', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  try {
    await fs.mkdir(path.join(root, 'src', 'auth'), { recursive: true });
    const file = path.join(root, 'src', 'auth', 'token.ts');
    await fs.writeFile(file, 'validateToken(1);\n');
    await git('add', '--', '.');
    await git('commit', '-m', 'Introduce parser');
    const added = await git('rev-parse', 'HEAD');
    await fs.writeFile(file, 'validateToken(2);\n');
    await git('commit', '-am', 'Fix parser');
    const changed = await git('rev-parse', 'HEAD');
    await fs.writeFile(file, 'validateToken(2);\n// comment-only change\n');
    await git('commit', '-am', 'Add explanation');
    const contextOnly = await git('rev-parse', 'HEAD');
    await fs.writeFile(path.join(root, 'notes.txt'), 'validateToken(3);\n');
    await git('add', '--', '.');
    await git('commit', '-m', 'validateToken in message and another path');
    const outside = await git('rev-parse', 'HEAD');
    const backend = new DefaultRevisionLogBackend();
    const repository = createRepository({ root });
    const source = { kind: 'target' as const, revision: 'HEAD', label: 'HEAD' };
    const query = 'file:src/auth/ change:"validateToken("';
    const first = await backend.loadRevisionLog(repository, source, 1, 0, false, query);
    const second = await backend.loadRevisionLog(repository, source, 1, 1, false, query);
    assert.deepEqual(first.entries.map((entry) => entry.hash), [changed]);
    assert.equal(first.hasMore, true);
    assert.deepEqual(second.entries.map((entry) => entry.hash), [added]);
    assert.equal(second.hasMore, false);
    const metadata = await backend.loadRevisionLog(repository, source, 50, 0, false, query + ' fix parser');
    assert.deepEqual(metadata.entries.map((entry) => entry.hash), [changed]);
    const literal = await backend.loadRevisionLog(repository, source, 50, 0, false, 'validateToken');
    assert.deepEqual(literal.entries.map((entry) => entry.hash), [outside]);
    const files = await backend.loadRevisionLog(repository, source, 50, 0, false, 'file:src/auth/');
    assert.deepEqual(files.entries.map((entry) => entry.hash), [contextOnly, changed, added]);
    assert.equal((await backend.loadRevisionLog(repository, source, 50, 0, false, 'change:VALIDATETOKEN')).entries.length, 0);
    assert.equal((await backend.loadRevisionLog(repository, source, 50, 0, false, 'file:src/Auth/')).entries.length, 0);
  } finally {
    await fixture.dispose();
  }
});

test('literal paths, root changes, rename and deletion do not interpret Git pathspec magic', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  try {
    const backend = new DefaultRevisionLogBackend();
    const repository = createRepository({ root });
    const source = { kind: 'target' as const, revision: 'HEAD', label: 'HEAD' };
    const search = (query: string) => backend.loadRevisionLog(repository, source, 50, 0, false, query);
    assert.deepEqual((await search('file:"space name.txt" change:space')).entries.map((e) => e.hash), [fixture.initialCommit]);
    assert.deepEqual((await search('file:-option-like.txt')).entries.map((e) => e.hash), [fixture.initialCommit]);
    assert.deepEqual((await search('file:unicodé-文件.txt')).entries.map((e) => e.hash), [fixture.initialCommit]);
    assert.deepEqual((await search('file:"nested/new name.txt"')).entries.map((e) => e.hash), [fixture.renameCommit]);
    await fs.writeFile(path.join(root, 'query-empty.txt'), '');
    await fs.writeFile(path.join(root, 'binary.dat'), Buffer.from([0, 1, 2, 3]));
    await git('add', '--', '.');
    await git('commit', '-m', 'Empty and binary files');
    const nonText = await git('rev-parse', 'HEAD');
    assert.deepEqual((await search('file:query-empty.txt')).entries.map((e) => e.hash), [nonText]);
    assert.deepEqual((await search('file:binary.dat')).entries.map((e) => e.hash), [nonText]);
    await git('config', 'log.showRoot', 'false');
    assert.deepEqual((await search('file:-option-like.txt')).entries.map((e) => e.hash), [fixture.initialCommit]);
    if (process.platform !== 'win32') {
      await fs.writeFile(path.join(root, 'literal[1]*.txt'), 'literal.$+?()[]{}|^\\\n');
      await git('add', '--', '.');
      await git('commit', '-m', 'Literal filename');
      const created = await git('rev-parse', 'HEAD');
      assert.deepEqual((await search('file:literal[1]*.txt')).entries.map((e) => e.hash), [created]);
      assert.equal((await search('file:literal*')).entries.length, 0);
      assert.equal((await search('file::(glob)*')).entries.length, 0);
      const code = String.raw`change:"literal.$+?()[]{}|^\\"`;
      assert.deepEqual((await search(code)).entries.map((e) => e.hash), [created]);
      await git('rm', '--', 'literal[1]*.txt');
      await git('commit', '-m', 'Remove file');
      const removed = await git('rev-parse', 'HEAD');
      assert.deepEqual((await search('file:literal[1]*.txt ' + code)).entries.map((e) => e.hash), [removed, created]);
    }
    await git('config', 'diff.external', 'query-must-never-execute-external-diff');
    await git('config', 'diff.query.textconv', 'query-must-never-execute-textconv');
    await fs.writeFile(path.join(root, '.gitattributes'), '"space name.txt" diff=query\n');
    assert.deepEqual((await search('file:"space name.txt" change:space')).entries.map((e) => e.hash), [fixture.initialCommit]);
    const before = await git('status', '--porcelain');
    await assert.rejects(search('file:../outside'), /repository-relative/);
    await assert.rejects(search('change:"unclosed'), /Close the double quote/);
    assert.equal(await git('status', '--porcelain'), before);
  } finally {
    await fixture.dispose();
  }
});

test('change search respects target, all-branches and range scope and includes merge changes once', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  try {
    await git('checkout', '-b', 'main-query');
    const base = await git('rev-parse', 'HEAD');
    await git('checkout', '-b', 'topic-query');
    await fs.writeFile(path.join(root, 'token.ts'), 'validateToken(1);\n');
    await git('add', '--', '.');
    await git('commit', '-m', 'Topic update');
    const topic = await git('rev-parse', 'HEAD');
    await git('checkout', 'main-query');
    await fs.writeFile(path.join(root, 'main-only.txt'), 'main\n');
    await git('add', '--', '.');
    await git('commit', '-m', 'Main update');
    await git('merge', '--no-ff', 'topic-query', '-m', 'Integrate topic');
    const merged = await git('rev-parse', 'HEAD');
    const backend = new DefaultRevisionLogBackend();
    const repository = createRepository({ root });
    const target = { kind: 'target' as const, revision: 'HEAD', label: 'HEAD' };
    const query = 'file:token.ts change:validateToken';
    const selected = await backend.loadRevisionLog(repository, target, 50, 0, false, query);
    assert.deepEqual(selected.entries.map((e) => e.hash), [merged]);
    assert.deepEqual((await backend.loadRevisionLog(repository, target, 50, 0, false, 'file:token.ts')).entries.map((e) => e.hash), [merged]);
    const all = await backend.loadRevisionLog(repository, target, 50, 0, true, query);
    assert.deepEqual(new Set(all.entries.map((e) => e.hash)), new Set([merged, topic]));
    assert.equal(all.entries.length, 2);
    const range = { kind: 'range' as const, baseRevision: base, baseLabel: 'Base', compareRevision: topic, compareLabel: 'Topic' };
    assert.deepEqual((await backend.loadRevisionLog(repository, range, 50, 0, true, query)).entries.map((e) => e.hash), [topic]);
    const first = await backend.loadRevisionLog(repository, target, 1, 0, true, query);
    const second = await backend.loadRevisionLog(repository, target, 1, 1, true, query);
    assert.equal(first.hasMore, true);
    assert.equal(second.hasMore, false);
    assert.equal(new Set([...first.entries, ...second.entries].map((e) => e.hash)).size, 2);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(backend.loadRevisionLog(repository, target, 50, 0, false, query, controller.signal), { name: 'AbortError' });
  } finally {
    await fixture.dispose();
  }
});

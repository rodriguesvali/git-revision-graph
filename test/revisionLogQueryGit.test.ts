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

test('Show Log resolves the selected branch, tag and remote by exact identity', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  try {
    await git('branch', 'collision', fixture.initialCommit);
    await git('tag', '-a', 'collision', fixture.renameCommit, '-m', 'tag');
    await git('update-ref', 'refs/remotes/collision', fixture.initialCommit);
    const backend = new DefaultRevisionLogBackend();
    const repository = createRepository({ root });
    for (const [refKind, expected] of [['branch', fixture.initialCommit], ['tag', fixture.renameCommit],
      ['remote', fixture.initialCommit]] as const) {
      for (const all of [false, true]) {
        const source = { kind: 'target' as const, revision: 'collision', label: 'collision', refKind };
        assert.equal((await backend.loadRevisionLog(repository, source, 1, 0, all)).entries[0]?.hash, expected);
      }
    }
    await git('update-ref', 'refs/heads/collision', fixture.renameCommit);
    const branch = { kind: 'target' as const, revision: 'collision', label: 'collision', refKind: 'branch' as const };
    assert.equal((await backend.loadRevisionLog(repository, branch, 1, 0, false)).entries[0]?.hash, fixture.renameCommit);
    await git('branch', '-D', 'collision');
    for (const all of [false, true]) await assert.rejects(backend.loadRevisionLog(repository, branch, 1, 0, all));
  } finally {
    await fixture.dispose();
  }
});

test('all branches starts at the selected historical tag for paging and search', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  try {
    await git('tag', '-a', 'selected', '-m', 'Selected');
    await fs.writeFile(path.join(root, 'later.txt'), 'target-later\n');
    await git('add', '--', 'later.txt');
    await git('commit', '-m', 'Later than selected');
    const descendant = await git('rev-parse', 'HEAD');
    const backend = new DefaultRevisionLogBackend();
    const repo = createRepository({ root });
    const source = { kind: 'target' as const, revision: 'refs/tags/selected', label: 'selected' };
    const first = await backend.loadRevisionLog(repo, source, 1, 0, true);
    const next = await backend.loadRevisionLog(repo, source, 1, 1, true);
    assert.deepEqual(first.entries.map(e => e.hash), [fixture.renameCommit]);
    assert.equal(first.hasMore, true);
    assert.deepEqual(next.entries.map(e => e.hash), [fixture.initialCommit]);
    assert.equal(next.hasMore, false);
    assert.deepEqual((await backend.loadRevisionLog(repo, source, 50, 0, true, 'Later than selected')).entries, []);
    assert.deepEqual((await backend.loadRevisionLog(repo, source, 50, 0, true, 'file:later.txt')).entries, []);
    assert.deepEqual((await backend.loadRevisionLog(repo, source, 50, 0, true, 'file:"nested/new name.txt"')).entries.map(e => e.hash), [fixture.renameCommit]);
    assert.ok(!(await backend.loadRevisionLog(repo, source, 50, 0, true)).entries.some(e => e.hash === descendant));
    const detached = await git('commit-tree', fixture.renameCommit + '^{tree}', '-p', fixture.renameCommit, '-m', 'Detached');
    const detachedSource = { kind: 'target' as const, revision: detached, label: detached };
    const detachedPage = await backend.loadRevisionLog(repo, detachedSource, 1, 0, true);
    assert.deepEqual(detachedPage.entries.map(e => e.hash), [detached]);
  } finally {
    await fixture.dispose();
  }
});

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
    await git('checkout', '-b', 'unmerged-query', base);
    await fs.writeFile(path.join(root, 'token.ts'), 'validateToken(unmerged);\n');
    await git('add', '--', 'token.ts');
    await git('commit', '-m', 'Unmerged topic');
    const unmerged = await git('rev-parse', 'HEAD');
    const backend = new DefaultRevisionLogBackend();
    const repository = createRepository({ root });
    const target = { kind: 'target' as const, revision: 'main-query', label: 'main-query' };
    const query = 'file:token.ts change:validateToken';
    const selected = await backend.loadRevisionLog(repository, target, 50, 0, false, query);
    assert.deepEqual(new Set(selected.entries.map((e) => e.hash)), new Set([merged, topic]));
    assert.deepEqual(new Set((await backend.loadRevisionLog(repository, target, 50, 0, false, 'file:token.ts')).entries.map((e) => e.hash)), new Set([merged, topic]));
    const history = await backend.loadRevisionLog(repository, target, 50, 0, false);
    assert.ok(history.entries.some((e) => e.hash === topic));
    assert.ok(!history.entries.some((e) => e.hash === unmerged));
    const page1 = await backend.loadRevisionLog(repository, target, 1, 0, false, query);
    const page2 = await backend.loadRevisionLog(repository, target, 1, 1, false, query);
    assert.equal(page1.hasMore, true);
    assert.equal(page2.hasMore, false);
    assert.deepEqual(new Set([...page1.entries, ...page2.entries].map((e) => e.hash)), new Set([merged, topic]));
    const all = await backend.loadRevisionLog(repository, target, 50, 0, true, query);
    assert.deepEqual(new Set(all.entries.map((e) => e.hash)), new Set([merged, topic, unmerged]));
    assert.equal(all.entries.length, 3);
    const range = { kind: 'range' as const, baseRevision: base, baseLabel: 'Base', compareRevision: topic, compareLabel: 'Topic' };
    assert.deepEqual((await backend.loadRevisionLog(repository, range, 50, 0, true, query)).entries.map((e) => e.hash), [topic]);
    const first = await backend.loadRevisionLog(repository, target, 1, 0, true, query);
    const second = await backend.loadRevisionLog(repository, target, 1, 1, true, query);
    assert.equal(first.hasMore, true);
    assert.equal(second.hasMore, true);
    assert.equal(new Set([...first.entries, ...second.entries].map((e) => e.hash)).size, 2);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(backend.loadRevisionLog(repository, target, 50, 0, false, query, controller.signal), { name: 'AbortError' });
  } finally {
    await fixture.dispose();
  }
});

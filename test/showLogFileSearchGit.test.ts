import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createSharedGitFixture } from './gitFixture';
import { createRepository } from './fakes';
import { loadShowLogFileMatchPaths } from '../src/revisionGraph/backendServices/revisionLogFileSearch';
const execFile = promisify(execFileCallback);

test('expanded change search finds root, literal, removed and renamed paths without context-only matches', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath;
  const repository = createRepository({ root });
  const git = async (...args: string[]) => (await execFile('git', args, { cwd: root })).stdout.trim();
  const search = (hash: string, change: string, file?: string) => loadShowLogFileMatchPaths(repository, hash, { text: '', change, file });
  try {
    assert.deepEqual(await search(fixture.initialCommit, 'space'), ['space name.txt']);
    assert.deepEqual(await search(fixture.initialCommit, 'SPACE'), []);
    await fs.writeFile(path.join(root, 'space name.txt'), 'space\nadded\n');
    await fs.writeFile(path.join(root, 'literal-文件\nname.txt'), 'literal.$+?()[]{}|^\\\nneedle\n');
    await fs.writeFile(path.join(root, 'unrelated.txt'), 'other\n');
    await git('add', '--', '.'); await git('commit', '-m', 'needle in message');
    const added = await git('rev-parse', 'HEAD');
    assert.deepEqual(await search(added, 'space'), []);
    assert.deepEqual(await search(added, 'literal.$+?()[]{}|^\\'), ['literal-文件\nname.txt']);
    assert.deepEqual(await search(added, 'needle', 'unrelated.txt'), []);
    await fs.unlink(path.join(root, 'literal-文件\nname.txt'));
    await git('add', '--', '.'); await git('commit', '-m', 'delete');
    assert.deepEqual(await search(await git('rev-parse', 'HEAD'), 'needle'), ['literal-文件\nname.txt']);
    assert.deepEqual(await search(fixture.renameCommit, 'rename'), []);
    await fs.rename(path.join(root, 'space name.txt'), path.join(root, 'renamed.txt'));
    await fs.writeFile(path.join(root, 'renamed.txt'), 'space\nadded\nrename needle\n');
    await git('add', '--', '.'); await git('commit', '-m', 'rename with edit');
    assert.deepEqual(await search(await git('rev-parse', 'HEAD'), 'rename needle'), ['renamed.txt']);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(loadShowLogFileMatchPaths(repository, added, {text: '', change: 'needle'}, controller.signal), {name: 'AbortError'});
    await assert.rejects(search('--all', 'needle'), /valid commit/);
  } finally { await fixture.dispose(); }
});

test('matching paths use first-parent merge semantics and handle hundreds of files in one query', async () => {
  const fixture = await createSharedGitFixture();
  const root = fixture.repositoryPath; const repository = createRepository({root});
  const git = async (...args: string[]) => (await execFile('git', args, {cwd:root})).stdout.trim();
  try {
    const baseBranch = await git('branch', '--show-current');
    await git('checkout', '-b', 'topic');
    await Promise.all(Array.from({length:300}, (_, i) => fs.writeFile(path.join(root, `file-${i}.ts`), i===299 ? 'needle\n' : 'other\n')));
    await fs.writeFile(path.join(root,'binary-added.bin'), Buffer.from([0,110,101,101,100,108,101,0]));
    await git('add', '--', '.'); await git('commit','-m','topic');
    const topic = await git('rev-parse','HEAD');
    assert.deepEqual(await loadShowLogFileMatchPaths(repository, topic, {text:'',change:'needle'}), ['file-299.ts']);
    await git('checkout', baseBranch);
    await fs.writeFile(path.join(root,'main.ts'), 'main side needle\n');
    await git('add','--','.'); await git('commit','-m','main');
    await git('merge','--no-ff','topic','-m','merge');
    assert.deepEqual(await loadShowLogFileMatchPaths(repository, await git('rev-parse','HEAD'), {text:'',change:'needle'}), ['file-299.ts']);
  } finally { await fixture.dispose(); }
});

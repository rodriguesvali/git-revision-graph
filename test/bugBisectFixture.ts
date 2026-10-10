import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BisectGit } from '../src/bugBisect/git';
import { execGit } from '../src/gitExec';

export async function createBisectFixture() {
  const root = await mkdtemp(join(tmpdir(), 'grg-bisect-test-'));
  const git = (...args: string[]) => execGit(root, args);
  await git('init', '-b', 'main');
  await git('config', 'user.name', 'Bisect Test');
  await git('config', 'user.email', 'bisect@example.com');
  const hashes: string[] = [];
  for (let index = 0; index < 7; index++) {
    await writeFile(join(root, 'test.txt'), `${index}\n`);
    await git('add', '--', 'test.txt');
    await git('commit', '-m', `revision ${index}`);
    hashes.push((await git('rev-parse', 'HEAD')).trim());
  }
  return { root, git, hashes, engine: new BisectGit(root), dispose: () => rm(root, { recursive: true, force: true }) };
}


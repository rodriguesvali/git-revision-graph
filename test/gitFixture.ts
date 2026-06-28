import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export interface SharedGitFixture {
  readonly repositoryPath: string;
  readonly initialCommit: string;
  readonly renameCommit: string;
  dispose(): Promise<void>;
}

export async function createSharedGitFixture(): Promise<SharedGitFixture> {
  const repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-fixture-'));
  await execFile('git', ['init'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.name', 'Fixture User'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.email', 'fixture@example.com'], { cwd: repositoryPath });
  await execFile('git', ['config', 'core.autocrlf', 'false'], { cwd: repositoryPath });

  await fs.mkdir(path.join(repositoryPath, 'nested'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(repositoryPath, 'space name.txt'), 'space\n'),
    fs.writeFile(path.join(repositoryPath, 'unicodé-文件.txt'), 'unicode\n'),
    fs.writeFile(path.join(repositoryPath, '-option-like.txt'), 'option\n'),
    fs.writeFile(path.join(repositoryPath, 'nested', 'old name.txt'), 'rename\n'),
    fs.writeFile(path.join(repositoryPath, 'binary.bin'), Buffer.from([0, 255, 1, 254])),
    fs.writeFile(path.join(repositoryPath, 'empty.txt'), ''),
    fs.writeFile(path.join(repositoryPath, 'script.sh'), '#!/bin/sh\necho fixture\n', { mode: 0o755 })
  ]);
  await execFile('git', ['add', '--', '.'], { cwd: repositoryPath });
  await execFile('git', ['commit', '-m', 'fixture \u001e record \u001f field'], { cwd: repositoryPath });
  const initialCommit = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: repositoryPath })).stdout.trim();

  await fs.rename(
    path.join(repositoryPath, 'nested', 'old name.txt'),
    path.join(repositoryPath, 'nested', 'new name.txt')
  );
  await execFile('git', ['add', '--', 'nested/old name.txt', 'nested/new name.txt'], { cwd: repositoryPath });
  await execFile('git', ['commit', '-m', 'rename fixture'], { cwd: repositoryPath });
  const renameCommit = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: repositoryPath })).stdout.trim();

  return {
    repositoryPath,
    initialCommit,
    renameCommit,
    async dispose() {
      await fs.rm(repositoryPath, { recursive: true, force: true });
    }
  };
}

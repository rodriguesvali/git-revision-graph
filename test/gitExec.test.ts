import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { execGit, execGitWithResult } from '../src/gitExec';

const execFile = promisify(execFileCallback);

async function createTemporaryRepository(): Promise<string> {
  const repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-'));
  await execFile('git', ['init'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.name', 'Test User'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.email', 'test@example.com'], { cwd: repositoryPath });
  return repositoryPath;
}

test('execGit reads large git output without failing on a fixed maxBuffer', async () => {
  const repositoryPath = await createTemporaryRepository();

  try {
    const chunk = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n';
    const initialContent = chunk.repeat(240000);
    const updatedContent = initialContent.replaceAll('a', 'b');
    const filePath = path.join(repositoryPath, 'large.txt');

    await fs.writeFile(filePath, initialContent, 'utf8');
    await execFile('git', ['add', 'large.txt'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'Add large fixture'], { cwd: repositoryPath });
    await fs.writeFile(filePath, updatedContent, 'utf8');

    const stdout = await execGit(repositoryPath, ['diff', '--no-color', 'HEAD']);

    assert.ok(stdout.length > 8 * 1024 * 1024);
    assert.match(stdout, /^diff --git /);
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('execGitWithResult preserves stderr and exit code for failing git commands', async () => {
  const repositoryPath = await createTemporaryRepository();

  try {
    await assert.rejects(
      execGitWithResult(repositoryPath, ['rev-parse', '--verify', 'missing-ref']),
      (error: unknown) => {
        assert.equal(typeof error, 'object');
        assert.ok(error !== null);
        const gitError = error as { code?: unknown; stderr?: unknown };
        assert.equal(typeof gitError.code, 'number');
        assert.equal(gitError.code, 128);
        assert.equal(typeof gitError.stderr, 'string');
        assert.ok((gitError.stderr as string).trim().length > 0);
        return true;
      }
    );
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

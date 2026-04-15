import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { execGit, execGitBinaryWithResult, execGitWithResult } from '../src/gitExec';

const execFile = promisify(execFileCallback);

async function createTemporaryRepository(): Promise<string> {
  const repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-'));
  await execFile('git', ['init'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.name', 'Test User'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.email', 'test@example.com'], { cwd: repositoryPath });
  return repositoryPath;
}

async function withFakeGitScript<T>(script: string, run: (repositoryPath: string) => Promise<T>): Promise<T> {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-fake-git-'));
  const binDir = path.join(temporaryRoot, 'bin');
  const repositoryPath = path.join(temporaryRoot, 'repo');
  const gitPath = path.join(binDir, 'git');
  const originalPath = process.env.PATH ?? '';

  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(repositoryPath, { recursive: true });
  await fs.writeFile(gitPath, script, { encoding: 'utf8', mode: 0o755 });
  process.env.PATH = `${binDir}:${originalPath}`;

  try {
    return await run(repositoryPath);
  } finally {
    process.env.PATH = originalPath;
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
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

test('execGit aborts an in-flight git process when the signal is cancelled', async () => {
  await withFakeGitScript(
    '#!/bin/sh\ntrap "exit 130" TERM INT\nsleep 10\n',
    async (repositoryPath) => {
      const abortController = new AbortController();
      const execution = execGit(repositoryPath, ['status'], { signal: abortController.signal });

      setTimeout(() => {
        abortController.abort();
      }, 25);

      await assert.rejects(
        execution,
        (error: unknown) => error instanceof Error && error.name === 'AbortError'
      );
    }
  );
});

test('execGit stops when the captured output exceeds the configured limit', async () => {
  await withFakeGitScript(
    '#!/bin/sh\nprintf "1234567890"\n',
    async (repositoryPath) => {
      await assert.rejects(
        execGit(repositoryPath, ['status'], { maxOutputBytes: 4 }),
        (error: unknown) => {
          assert.equal(typeof error, 'object');
          assert.ok(error !== null);
          const gitError = error as { message?: unknown; stdout?: unknown };
          assert.equal(typeof gitError.message, 'string');
          assert.match(gitError.message as string, /maximum captured output/i);
          assert.equal(typeof gitError.stdout, 'string');
          assert.equal(gitError.stdout, '');
          return true;
        }
      );
    }
  );
});

test('execGitBinaryWithResult preserves arbitrary stdout bytes', async () => {
  await withFakeGitScript(
    "#!/bin/sh\nprintf '\\377\\000ABC'\n",
    async (repositoryPath) => {
      const result = await execGitBinaryWithResult(repositoryPath, ['show', 'HEAD:file.bin']);

      assert.deepEqual([...result.stdout], [255, 0, 65, 66, 67]);
      assert.equal(result.stderr, '');
    }
  );
});

test('execGitBinaryWithResult preserves stderr and exit code for failing commands', async () => {
  await withFakeGitScript(
    '#!/bin/sh\nprintf "boom\\n" >&2\nexit 9\n',
    async (repositoryPath) => {
      await assert.rejects(
        execGitBinaryWithResult(repositoryPath, ['show', 'HEAD:file.bin']),
        (error: unknown) => {
          assert.equal(typeof error, 'object');
          assert.ok(error !== null);
          const gitError = error as { code?: unknown; stderr?: unknown; stdout?: unknown };
          assert.equal(gitError.code, 9);
          assert.equal(gitError.stderr, 'boom\n');
          assert.ok(Buffer.isBuffer(gitError.stdout));
          assert.equal((gitError.stdout as Buffer).length, 0);
          return true;
        }
      );
    }
  );
});

test('execGitBinaryWithResult aborts an in-flight git process when the signal is cancelled', async () => {
  await withFakeGitScript(
    '#!/bin/sh\ntrap "exit 130" TERM INT\nsleep 10\n',
    async (repositoryPath) => {
      const abortController = new AbortController();
      const execution = execGitBinaryWithResult(repositoryPath, ['show', 'HEAD:file.bin'], {
        signal: abortController.signal
      });

      setTimeout(() => {
        abortController.abort();
      }, 25);

      await assert.rejects(
        execution,
        (error: unknown) => error instanceof Error && error.name === 'AbortError'
      );
    }
  );
});

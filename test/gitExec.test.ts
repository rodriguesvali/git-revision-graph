import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import {
  configureGitExecutablePath,
  execGit,
  execGitBinaryWithResult,
  execGitWithResult,
  getGitExecutablePath,
  GIT_EXEC_FALLBACK_PROFILE,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE,
  GIT_EXEC_REMOTE_PROFILE,
  resolveGitExecOptions
} from '../src/gitExec';
import { isAbortError } from '../src/errors';
import { createFakeGitExecutable } from './fakeGitExecutable';

const execFile = promisify(execFileCallback);

test('git execution profiles expose the approved bounded policies', () => {
  assert.deepEqual(GIT_EXEC_METADATA_PROFILE, { timeoutMs: 15_000, maxOutputBytes: 1024 * 1024 });
  assert.deepEqual(GIT_EXEC_LOCAL_MUTATION_PROFILE, { timeoutMs: 60_000, maxOutputBytes: 4 * 1024 * 1024 });
  assert.deepEqual(GIT_EXEC_REMOTE_PROFILE, { timeoutMs: 120_000, maxOutputBytes: 4 * 1024 * 1024 });
  assert.deepEqual(GIT_EXEC_FALLBACK_PROFILE, GIT_EXEC_LOCAL_MUTATION_PROFILE);
  assert.deepEqual(resolveGitExecOptions(), GIT_EXEC_FALLBACK_PROFILE);
  assert.deepEqual(resolveGitExecOptions({ timeoutMs: 25 }), {
    timeoutMs: 25,
    maxOutputBytes: GIT_EXEC_FALLBACK_PROFILE.maxOutputBytes
  });
});

async function createTemporaryRepository(): Promise<string> {
  const repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-'));
  await execFile('git', ['init'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.name', 'Test User'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.email', 'test@example.com'], { cwd: repositoryPath });
  return repositoryPath;
}

async function withFakeGitProgram<T>(program: string, run: (repositoryPath: string) => Promise<T>): Promise<T> {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-fake-git-'));
  const binDir = path.join(temporaryRoot, 'bin');
  const repositoryPath = path.join(temporaryRoot, 'repo');

  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(repositoryPath, { recursive: true });
  const fakeGit = await createFakeGitExecutable(binDir, 'git', program);
  configureGitExecutablePath(fakeGit.executablePath, fakeGit.argumentPrefix);

  try {
    return await run(repositoryPath);
  } finally {
    configureGitExecutablePath(undefined);
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

test('configureGitExecutablePath normalizes custom values and falls back to git for empty values', () => {
  configureGitExecutablePath('  /tmp/custom-git  ');
  assert.equal(getGitExecutablePath(), '/tmp/custom-git');

  configureGitExecutablePath(['  ', '  /opt/git  ']);
  assert.equal(getGitExecutablePath(), '/opt/git');

  configureGitExecutablePath('   ');
  assert.equal(getGitExecutablePath(), 'git');

  configureGitExecutablePath(undefined);
  assert.equal(getGitExecutablePath(), 'git');
});

test('execGit uses the configured Git executable path', async () => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-custom-git-'));
  const repositoryPath = path.join(temporaryRoot, 'repo');

  await fs.mkdir(repositoryPath, { recursive: true });
  const customGit = await createFakeGitExecutable(
    temporaryRoot,
    'custom-git',
    'process.stdout.write("configured-git\\n");\n'
  );
  configureGitExecutablePath(customGit.executablePath, customGit.argumentPrefix);

  try {
    const stdout = await execGit(repositoryPath, ['status']);

    assert.equal(stdout, 'configured-git\n');
  } finally {
    configureGitExecutablePath(undefined);
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

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

    const stdout = await execGit(repositoryPath, ['diff', '--no-color', 'HEAD'], {
      maxOutputBytes: 24 * 1024 * 1024,
      timeoutMs: 60_000
    });

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

test('execGitWithResult accepts explicitly allowed non-zero exit codes', async () => {
  await withFakeGitProgram(
    'process.stdout.write("diff output\\n");\nprocess.exitCode = 1;\n',
    async (repositoryPath) => {
      const result = await execGitWithResult(repositoryPath, ['diff', '--no-index'], {
        allowedExitCodes: [1]
      });

      assert.equal(result.stdout, 'diff output\n');
      assert.equal(result.stderr, '');
    }
  );
});

test('execGit aborts an in-flight git process when the signal is cancelled', async () => {
  await withFakeGitProgram(
    'setTimeout(() => undefined, 10_000);\n',
    async (repositoryPath) => {
      const abortController = new AbortController();
      const execution = execGit(repositoryPath, ['status'], { signal: abortController.signal });

      setTimeout(() => {
        abortController.abort();
      }, 25);

      await assert.rejects(execution, isAbortError);
    }
  );
});

test('execGit stops when the configured timeout expires', async () => {
  await withFakeGitProgram(
    'setTimeout(() => undefined, 10_000);\n',
    async (repositoryPath) => {
      await assert.rejects(
        execGit(repositoryPath, ['status'], { timeoutMs: 25 }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.name, 'TimeoutError');
          assert.match(error.message, /timeout/i);
          return true;
        }
      );
    }
  );
});

test('execGit stops when the captured output exceeds the configured limit', async () => {
  await withFakeGitProgram(
    'process.stdout.write("1234567890");\n',
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
  await withFakeGitProgram(
    'process.stdout.write(Buffer.from([255, 0, 65, 66, 67]));\n',
    async (repositoryPath) => {
      const result = await execGitBinaryWithResult(repositoryPath, ['show', 'HEAD:file.bin']);

      assert.deepEqual([...result.stdout], [255, 0, 65, 66, 67]);
      assert.equal(result.stderr, '');
    }
  );
});

test('execGitBinaryWithResult preserves stderr and exit code for failing commands', async () => {
  await withFakeGitProgram(
    'process.stderr.write("boom\\n");\nprocess.exitCode = 9;\n',
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
  await withFakeGitProgram(
    'setTimeout(() => undefined, 10_000);\n',
    async (repositoryPath) => {
      const abortController = new AbortController();
      const execution = execGitBinaryWithResult(repositoryPath, ['show', 'HEAD:file.bin'], {
        signal: abortController.signal
      });

      setTimeout(() => {
        abortController.abort();
      }, 25);

      await assert.rejects(execution, isAbortError);
    }
  );
});

test('execGit cancellation terminates the spawned process tree', async () => {
  await withFakeGitProgram(
    [
      "const { spawn } = require('node:child_process');",
      "spawn(process.execPath, ['-e', `setTimeout(() => require('node:fs').writeFileSync(process.env.GIT_EXEC_TREE_MARKER, 'alive'), 400)`], { stdio: 'ignore' });",
      'setTimeout(() => undefined, 10_000);'
    ].join('\n'),
    async (repositoryPath) => {
      const markerPath = path.join(repositoryPath, 'child-survived.txt');
      const previousMarker = process.env.GIT_EXEC_TREE_MARKER;
      process.env.GIT_EXEC_TREE_MARKER = markerPath;
      try {
        const abortController = new AbortController();
        const execution = execGit(repositoryPath, ['status'], { signal: abortController.signal });
        setTimeout(() => abortController.abort(), 50);
        await assert.rejects(execution, isAbortError);
        await new Promise((resolve) => setTimeout(resolve, 700));
        await assert.rejects(fs.stat(markerPath), { code: 'ENOENT' });
      } finally {
        if (previousMarker === undefined) {
          delete process.env.GIT_EXEC_TREE_MARKER;
        } else {
          process.env.GIT_EXEC_TREE_MARKER = previousMarker;
        }
      }
    }
  );
});

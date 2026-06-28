import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import {
  assertNoSymlinkedRestoreAncestors,
  executeCompareResultRestorePlan
} from '../src/compareResultRestoreExecutor';

const execFile = promisify(execFileCallback);

async function createRepository(): Promise<string> {
  const repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-restore-'));
  await execFile('git', ['init'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.name', 'Test User'], { cwd: repositoryPath });
  await execFile('git', ['config', 'user.email', 'test@example.com'], { cwd: repositoryPath });
  await execFile('git', ['config', 'core.autocrlf', 'false'], { cwd: repositoryPath });
  return repositoryPath;
}

test('restore executor uses Git semantics and preserves executable mode', async () => {
  const repositoryPath = await createRepository();
  const filePath = path.join(repositoryPath, 'script.sh');
  try {
    await fs.writeFile(filePath, '#!/bin/sh\necho original\n', { mode: 0o755 });
    await execFile('git', ['add', 'script.sh'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'executable fixture'], { cwd: repositoryPath });
    await fs.writeFile(filePath, 'changed\n', { mode: 0o644 });

    await executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'write-ref', refPath: filePath, targetPath: filePath }
    ]);

    assert.equal(await fs.readFile(filePath, 'utf8'), '#!/bin/sh\necho original\n');
    if (process.platform !== 'win32') {
      assert.notEqual((await fs.stat(filePath)).mode & 0o100, 0);
    }
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor removes a path only when the revision does not contain it', async () => {
  const repositoryPath = await createRepository();
  const filePath = path.join(repositoryPath, 'untracked.txt');
  try {
    await fs.writeFile(path.join(repositoryPath, 'tracked.txt'), 'tracked');
    await execFile('git', ['add', 'tracked.txt'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'tracked fixture'], { cwd: repositoryPath });
    await fs.writeFile(filePath, 'remove me');

    await executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'delete', targetPath: filePath }
    ]);

    await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor restores rather than removes a path present in the revision', async () => {
  const repositoryPath = await createRepository();
  const filePath = path.join(repositoryPath, 'tracked.txt');
  try {
    await fs.writeFile(filePath, 'original');
    await execFile('git', ['add', 'tracked.txt'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'tracked fixture'], { cwd: repositoryPath });
    await fs.writeFile(filePath, 'changed');

    await executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'delete', targetPath: filePath }
    ]);

    assert.equal(await fs.readFile(filePath, 'utf8'), 'original');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore ancestor validation rejects a symlinked directory', async (context) => {
  if (process.platform === 'win32') {
    context.skip('Symlink creation requires platform-specific privileges on Windows.');
    return;
  }

  const repositoryPath = await createRepository();
  const outsidePath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-outside-'));
  try {
    await fs.symlink(outsidePath, path.join(repositoryPath, 'linked'));
    await assert.rejects(
      assertNoSymlinkedRestoreAncestors(repositoryPath, path.join(repositoryPath, 'linked', 'file.txt')),
      /symbolic-link or junction ancestor/
    );
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
    await fs.rm(outsidePath, { recursive: true, force: true });
  }
});

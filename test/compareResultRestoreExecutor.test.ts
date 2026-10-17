import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { configureGitExecutablePath } from '../src/gitExec';
import { createFakeGitExecutable } from './fakeGitExecutable';
import { createSharedGitFixture } from './gitFixture';
import { createChange, createCompareResultItem, createRepository as createRepositoryDouble } from './fakes';
import { restoreCompareResultItemToWorktree } from '../src/compareResults/restoreAction';
import { revertShowLogFileChangeToCommit } from '../src/showLog/fileRestoreAction';
import { hasWorktreeChangeForCompareResultRestore, restoreWorktreeChangeFromRef } from '../src/workbenchCompareResultRestore';
import { Status } from '../src/git';
import {
  assertNoSymlinkedRestoreAncestors,
  executeCompareResultRestorePlan
} from '../src/compareResultRestoreExecutor';

const execFile = promisify(execFileCallback);

async function withInterceptedGit(program: string, run: () => Promise<void>): Promise<void> {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-restore-git-'));
  try {
    const fakeGit = await createFakeGitExecutable(temporaryRoot, 'git', `
      const fs = require('node:fs');
      const { spawnSync } = require('node:child_process');
      const args = process.argv.slice(2);
      ${program}
      const result = spawnSync('git', args, { stdio: 'inherit' });
      if (result.error) throw result.error;
      process.exit(result.status ?? 1);
    `);
    configureGitExecutablePath(fakeGit.executablePath, fakeGit.argumentPrefix);
    await run();
  } finally {
    configureGitExecutablePath(undefined);
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

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

test('restore executor validates every source before deleting a local renamed file', async () => {
  const repositoryPath = await createRepository();
  const localPath = path.join(repositoryPath, 'renamed.txt');
  const missingPath = path.join(repositoryPath, 'original.txt');
  try {
    await fs.writeFile(path.join(repositoryPath, 'tracked.txt'), 'tracked');
    await execFile('git', ['add', 'tracked.txt'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'source no longer contains original path'], { cwd: repositoryPath });
    await fs.writeFile(localPath, 'uncommitted local contents');

    await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'delete', targetPath: localPath },
      { kind: 'write-ref', refPath: missingPath, targetPath: missingPath }
    ]), /does not contain original.txt/);

    assert.equal(await fs.readFile(localPath, 'utf8'), 'uncommitted local contents');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor validates every target mapping before overwriting a local file', async () => {
  const repositoryPath = await createRepository();
  const localPath = path.join(repositoryPath, 'tracked.txt');
  const otherPath = path.join(repositoryPath, 'other.txt');
  try {
    await fs.writeFile(localPath, 'committed');
    await execFile('git', ['add', 'tracked.txt'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'tracked source'], { cwd: repositoryPath });
    await fs.writeFile(localPath, 'uncommitted local contents');

    await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'write-ref', refPath: localPath, targetPath: localPath },
      { kind: 'write-ref', refPath: localPath, targetPath: otherPath }
    ]), /cannot map/);

    assert.equal(await fs.readFile(localPath, 'utf8'), 'uncommitted local contents');
    await assert.rejects(fs.stat(otherPath), { code: 'ENOENT' });
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor recovers deleted, overwritten and newly created files after a partial Git failure', async () => {
  const repositoryPath = await createRepository();
  const localPath = path.join(repositoryPath, 'renamed.txt');
  const scriptPath = path.join(repositoryPath, 'script.sh');
  const missingPath = path.join(repositoryPath, 'missing.txt');
  const failingPath = path.join(repositoryPath, 'fail.txt');
  const localBytes = Buffer.from([0, 1, 255, 128, 13, 10]);
  try {
    await fs.writeFile(scriptPath, '#!/bin/sh\necho committed\n', { mode: 0o755 });
    await fs.writeFile(missingPath, 'committed missing');
    await fs.writeFile(failingPath, 'committed failure target');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'restore sources'], { cwd: repositoryPath });
    await fs.writeFile(scriptPath, 'staged contents');
    await execFile('git', ['add', 'script.sh'], { cwd: repositoryPath });
    const indexBefore = await execFile('git', ['write-tree'], { cwd: repositoryPath });
    await fs.writeFile(scriptPath, localBytes);
    await fs.chmod(scriptPath, 0o644);
    await fs.rm(missingPath);
    await fs.writeFile(localPath, 'local rename contents');
    await fs.writeFile(failingPath, 'local failure target');

    await withInterceptedGit(`
      if (args.includes('restore') && args.at(-1) === 'fail.txt') {
        fs.writeFileSync('fail.txt', 'partially written by failed command');
        process.stderr.write('injected restore failure');
        process.exit(1);
      }
    `, async () => {
      await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
        { kind: 'delete', targetPath: localPath },
        { kind: 'write-ref', refPath: scriptPath, targetPath: scriptPath },
        { kind: 'write-ref', refPath: missingPath, targetPath: missingPath },
        { kind: 'write-ref', refPath: failingPath, targetPath: failingPath }
      ]), /exited with code 1/);
    });

    assert.equal(await fs.readFile(localPath, 'utf8'), 'local rename contents');
    assert.deepEqual(await fs.readFile(scriptPath), localBytes);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(scriptPath)).mode & 0o777, 0o644);
    }
    await assert.rejects(fs.lstat(missingPath), { code: 'ENOENT' });
    assert.equal(await fs.readFile(failingPath, 'utf8'), 'local failure target');
    assert.equal((await execFile('git', ['write-tree'], { cwd: repositoryPath })).stdout, indexBefore.stdout);
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor rejects directory sources before touching any worktree path', async () => {
  const repositoryPath = await createRepository();
  const directoryPath = path.join(repositoryPath, 'source');
  const localPath = path.join(repositoryPath, 'local.txt');
  try {
    await fs.mkdir(directoryPath);
    await fs.writeFile(path.join(directoryPath, 'child.txt'), 'committed');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'directory source'], { cwd: repositoryPath });
    await fs.rm(directoryPath, { recursive: true });
    await fs.writeFile(localPath, 'local contents');

    await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'delete', targetPath: localPath },
      { kind: 'write-ref', refPath: directoryPath, targetPath: directoryPath }
    ]), /not a file/);
    assert.equal(await fs.readFile(localPath, 'utf8'), 'local contents');
    await assert.rejects(fs.stat(directoryPath), { code: 'ENOENT' });
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor treats pathspec characters literally and leaves other files unchanged', async () => {
  const repositoryPath = await createRepository();
  const targetPath = path.join(repositoryPath, '[ab].txt');
  const unrelatedPath = path.join(repositoryPath, 'a.txt');
  try {
    await fs.writeFile(targetPath, 'committed target');
    await fs.writeFile(unrelatedPath, 'committed unrelated');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'literal path sources'], { cwd: repositoryPath });
    await fs.writeFile(targetPath, 'local target');
    await fs.writeFile(unrelatedPath, 'local unrelated');

    await executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'write-ref', refPath: targetPath, targetPath }
    ]);

    assert.equal(await fs.readFile(targetPath, 'utf8'), 'committed target');
    assert.equal(await fs.readFile(unrelatedPath, 'utf8'), 'local unrelated');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor pins one commit even if the selected branch moves during execution', async () => {
  const repositoryPath = await createRepository();
  const firstPath = path.join(repositoryPath, 'first.txt');
  const secondPath = path.join(repositoryPath, 'second.txt');
  try {
    await fs.writeFile(firstPath, 'original first');
    await fs.writeFile(secondPath, 'original second');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'original sources'], { cwd: repositoryPath });
    await execFile('git', ['branch', 'selected'], { cwd: repositoryPath });
    await fs.writeFile(firstPath, 'new first');
    await fs.writeFile(secondPath, 'new second');
    await execFile('git', ['commit', '-am', 'sources after branch movement'], { cwd: repositoryPath });

    await withInterceptedGit(`
      if (args.includes('rev-parse')) fs.appendFileSync('.git/restore-resolutions', 'resolve\\n');
      if (args.includes('restore') && args.at(-1) === 'first.txt') {
        const moved = spawnSync('git', ['update-ref', 'refs/heads/selected', 'HEAD'], { stdio: 'inherit' });
        if (moved.status !== 0) process.exit(1);
      }
    `, async () => {
      await executeCompareResultRestorePlan(repositoryPath, 'selected', [
        { kind: 'write-ref', refPath: firstPath, targetPath: firstPath },
        { kind: 'write-ref', refPath: secondPath, targetPath: secondPath }
      ]);
    });

    assert.equal(await fs.readFile(firstPath, 'utf8'), 'original first');
    assert.equal(await fs.readFile(secondPath, 'utf8'), 'original second');
    assert.equal(await fs.readFile(path.join(repositoryPath, '.git/restore-resolutions'), 'utf8'), 'resolve\n');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor retains readable recovery copies when an ancestor changes after mutation', async () => {
  const repositoryPath = await createRepository();
  const parentPath = path.join(repositoryPath, 'nested');
  const firstPath = path.join(parentPath, 'first.txt');
  const failingPath = path.join(repositoryPath, 'fail.txt');
  let recoveryDirectory: string | undefined;
  try {
    await fs.mkdir(parentPath);
    await fs.writeFile(firstPath, 'committed first');
    await fs.writeFile(failingPath, 'committed failure target');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'restore sources'], { cwd: repositoryPath });
    await fs.writeFile(firstPath, 'local first');
    await fs.writeFile(failingPath, 'local failure target');

    await withInterceptedGit(`
      if (args.includes('restore') && args.at(-1) === 'fail.txt') {
        fs.rmSync('nested', { recursive: true });
        fs.writeFileSync('nested', 'external replacement');
        fs.writeFileSync('fail.txt', 'partial failure target');
        process.exit(1);
      }
    `, async () => {
      await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
        { kind: 'write-ref', refPath: firstPath, targetPath: firstPath },
        { kind: 'write-ref', refPath: failingPath, targetPath: failingPath }
      ]), (error: unknown) => {
        assert.ok(error instanceof AggregateError);
        const match = /Recovery copies retained at: (.+)$/.exec(error.message);
        assert.ok(match);
        recoveryDirectory = match[1];
        return true;
      });
    });

    assert.ok(recoveryDirectory);
    const entries: Array<{ targetPath: string; backupPath?: string }> = JSON.parse(
      await fs.readFile(path.join(recoveryDirectory, 'manifest.json'), 'utf8')
    );
    const original = entries.find((entry) => entry.targetPath === firstPath);
    assert.ok(original?.backupPath);
    assert.equal(await fs.readFile(original.backupPath, 'utf8'), 'local first');
    assert.equal(await fs.readFile(parentPath, 'utf8'), 'external replacement');
    assert.equal(await fs.readFile(failingPath, 'utf8'), 'local failure target');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
    if (recoveryDirectory) await fs.rm(recoveryDirectory, { recursive: true, force: true });
  }
});

test('restore executor recovers an original symbolic link without changing its outside target', async (context) => {
  if (process.platform === 'win32') {
    context.skip('File symlink creation requires platform-specific privileges on Windows.');
    return;
  }
  const repositoryPath = await createRepository();
  const outsidePath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-restore-outside-'));
  const linkPath = path.join(repositoryPath, 'link.txt');
  const failingPath = path.join(repositoryPath, 'fail.txt');
  const outsideFile = path.join(outsidePath, 'outside.txt');
  try {
    await fs.writeFile(linkPath, 'committed file');
    await fs.writeFile(failingPath, 'committed failure target');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'restore sources'], { cwd: repositoryPath });
    await fs.rm(linkPath);
    await fs.writeFile(outsideFile, 'outside contents');
    await fs.symlink(outsideFile, linkPath);

    await withInterceptedGit(`
      if (args.includes('restore') && args.at(-1) === 'fail.txt') process.exit(1);
    `, async () => {
      await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
        { kind: 'write-ref', refPath: linkPath, targetPath: linkPath },
        { kind: 'write-ref', refPath: failingPath, targetPath: failingPath }
      ]), /exited with code 1/);
    });

    assert.equal((await fs.lstat(linkPath)).isSymbolicLink(), true);
    assert.equal(await fs.readlink(linkPath), outsideFile);
    assert.equal(await fs.readFile(outsideFile, 'utf8'), 'outside contents');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
    await fs.rm(outsidePath, { recursive: true, force: true });
  }
});

for (const surface of ['Compare Results', 'Show Log'] as const) {
  test(`${surface} reports a failed real rename restore after recovering the original worktree files`, async () => {
    const fixture = await createSharedGitFixture();
    const oldPath = path.join(fixture.repositoryPath, 'nested', 'old name.txt');
    const newPath = path.join(fixture.repositoryPath, 'nested', 'new name.txt');
    try {
      await fs.writeFile(oldPath, 'local old contents');
      await fs.writeFile(newPath, 'local new contents');
      const repository = createRepositoryDouble({ root: fixture.repositoryPath });
      const change = createChange({ uriPath: oldPath, renamePath: newPath, status: Status.INDEX_RENAMED });
      const messages: string[] = [];
      let confirmations = 0;
      const services = {
        async showWarningMessage() { confirmations += 1; return 'Revert File'; },
        async showErrorMessage(message: string) { messages.push(message); },
        hasWorktreeChangeForCompareResultRestore,
        restoreWorktreeChangeFromRef
      };
      const failingPath = surface === 'Compare Results' ? 'nested/old name.txt' : 'nested/new name.txt';
      await withInterceptedGit(`
        if (args.includes('restore') && args.at(-1) === ${JSON.stringify(failingPath)}) {
          fs.writeFileSync(args.at(-1), 'partial contents');
          process.stderr.write('injected restore failure');
          process.exit(1);
        }
      `, async () => {
        const restored = surface === 'Compare Results'
          ? await restoreCompareResultItemToWorktree(
              createCompareResultItem({ repository, change, worktreeRef: fixture.initialCommit }), services)
          : await revertShowLogFileChangeToCommit(repository, fixture.renameCommit, change, services);
        assert.equal(restored, false);
      });

      assert.equal(confirmations, 1);
      assert.equal(messages.length, 1);
      assert.match(messages[0], /Could not revert the file/);
      assert.match(messages[0], /injected restore failure/);
      assert.equal(await fs.readFile(oldPath, 'utf8'), 'local old contents');
      assert.equal(await fs.readFile(newPath, 'utf8'), 'local new contents');
    } finally {
      await fixture.dispose();
    }
  });
}

test('restore executor does not interpret a Git inspection failure as an absent deletion source', async () => {
  const repositoryPath = await createRepository();
  const targetPath = path.join(repositoryPath, 'tracked.txt');
  try {
    await fs.writeFile(targetPath, 'committed');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'restore source'], { cwd: repositoryPath });
    await fs.writeFile(targetPath, 'local contents');
    await withInterceptedGit(`
      if (args.includes('ls-tree') || args.includes('cat-file')) process.exit(128);
    `, async () => {
      await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
        { kind: 'delete', targetPath }
      ]), /exited with code 128/);
    });
    assert.equal(await fs.readFile(targetPath, 'utf8'), 'local contents');
  } finally {
    await fs.rm(repositoryPath, { recursive: true, force: true });
  }
});

test('restore executor leaves earlier files intact when a later target cannot be backed up', async () => {
  const repositoryPath = await createRepository();
  const targetPath = path.join(repositoryPath, 'tracked.txt');
  const localPath = path.join(repositoryPath, 'local.txt');
  try {
    await fs.writeFile(targetPath, 'committed');
    await execFile('git', ['add', '.'], { cwd: repositoryPath });
    await execFile('git', ['commit', '-m', 'restore source'], { cwd: repositoryPath });
    await fs.rm(targetPath);
    await fs.mkdir(targetPath);
    await fs.writeFile(path.join(targetPath, 'child.txt'), 'local child');
    await fs.writeFile(localPath, 'local contents');

    await assert.rejects(executeCompareResultRestorePlan(repositoryPath, 'HEAD', [
      { kind: 'delete', targetPath: localPath },
      { kind: 'write-ref', refPath: targetPath, targetPath }
    ]), /target is not a file/);

    assert.equal(await fs.readFile(localPath, 'utf8'), 'local contents');
    assert.equal(await fs.readFile(path.join(targetPath, 'child.txt'), 'utf8'), 'local child');
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

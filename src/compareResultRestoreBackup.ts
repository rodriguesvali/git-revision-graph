import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { assertCompareResultRestorePlanInsideRepository } from './compareResultRestore';

type RestoreBackupEntry = { readonly targetPath: string } & (
  | { readonly kind: 'absent' }
  | { readonly kind: 'file'; readonly backupPath: string }
  | { readonly kind: 'symlink'; readonly linkTarget: string }
);

/** Keeps original worktree entries until the complete restore has succeeded. */
export class CompareResultRestoreBackup {
  private readonly entries = new Map<string, RestoreBackupEntry>();

  private constructor(
    private readonly repositoryRootPath: string,
    private readonly directoryPath: string
  ) {}

  static async create(
    repositoryRootPath: string,
    targetPaths: readonly string[]
  ): Promise<CompareResultRestoreBackup> {
    const directoryPath = await fs.mkdtemp(path.join(tmpdir(), 'git-revision-graph-restore-backup-'));
    const backup = new CompareResultRestoreBackup(repositoryRootPath, directoryPath);
    try {
      for (const targetPath of new Set(targetPaths.map((target) => path.resolve(target)))) {
        await backup.capture(targetPath);
      }
      await fs.writeFile(path.join(directoryPath, 'manifest.json'), JSON.stringify([...backup.entries.values()], null, 2));
      return backup;
    } catch (error) {
      await backup.dispose();
      throw error;
    }
  }

  async dispose(): Promise<void> {
    try {
      await fs.rm(this.directoryPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not remove file restore recovery copies at ${this.directoryPath}.`, error);
    }
  }

  async recover(error: unknown, touchedPaths: ReadonlySet<string>): Promise<never> {
    const failures: unknown[] = [];
    for (const targetPath of [...touchedPaths].reverse()) {
      try {
        await this.restoreEntry(this.entries.get(path.resolve(targetPath))!);
      } catch (recoveryError) {
        failures.push(recoveryError);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError([error, ...failures],
        `File restore failed and some original files could not be recovered. Recovery copies retained at: ${this.directoryPath}`,
        { cause: error });
    }
    await this.dispose();
    throw error;
  }

  private async capture(targetPath: string): Promise<void> {
    await assertNoSymlinkedRestoreAncestors(this.repositoryRootPath, targetPath);
    let stat;
    try {
      stat = await fs.lstat(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      this.entries.set(targetPath, { kind: 'absent', targetPath });
      return;
    }
    if (stat.isSymbolicLink()) {
      this.entries.set(targetPath, { kind: 'symlink', targetPath, linkTarget: await fs.readlink(targetPath) });
      return;
    }
    if (!stat.isFile()) {
      throw new Error('The restore target is not a file or symbolic link.');
    }
    const backupPath = path.join(this.directoryPath, String(this.entries.size));
    await fs.copyFile(targetPath, backupPath, constants.COPYFILE_EXCL);
    this.entries.set(targetPath, { kind: 'file', targetPath, backupPath });
  }

  private async restoreEntry(entry: RestoreBackupEntry): Promise<void> {
    await assertNoSymlinkedRestoreAncestors(this.repositoryRootPath, entry.targetPath);
    try {
      await fs.unlink(entry.targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    if (entry.kind === 'file') {
      await fs.copyFile(entry.backupPath, entry.targetPath, constants.COPYFILE_EXCL);
    } else if (entry.kind === 'symlink') {
      await fs.symlink(entry.linkTarget, entry.targetPath);
    }
  }
}

export async function assertNoSymlinkedRestoreAncestors(
  repositoryRootPath: string,
  candidatePath: string
): Promise<void> {
  assertCompareResultRestorePlanInsideRepository(repositoryRootPath, [
    { kind: 'delete', targetPath: candidatePath }
  ]);
  const relativePath = path.relative(path.resolve(repositoryRootPath), path.resolve(candidatePath));
  const segments = relativePath.split(path.sep).slice(0, -1);
  let currentPath = path.resolve(repositoryRootPath);

  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      const stat = await fs.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        throw new Error('The restore target has a symbolic-link or junction ancestor.');
      }
      if (!stat.isDirectory()) {
        throw new Error('The restore target has a non-directory ancestor.');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
}

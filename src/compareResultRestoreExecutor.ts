import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { CompareResultRestoreAction } from './compareResultRestore';
import { assertCompareResultRestorePlanInsideRepository } from './compareResultRestore';
import { hasGitExitCode } from './errorDetail';
import {
  execGitWithResult,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE
} from './gitExec';

export async function executeCompareResultRestorePlan(
  repositoryRootPath: string,
  ref: string,
  plan: readonly CompareResultRestoreAction[]
): Promise<void> {
  assertCompareResultRestorePlanInsideRepository(repositoryRootPath, plan);

  for (const action of plan) {
    const sourcePath = action.kind === 'write-ref' ? action.refPath : action.targetPath;
    const sourceGitPath = toRepositoryGitPath(repositoryRootPath, sourcePath);
    const targetGitPath = toRepositoryGitPath(repositoryRootPath, action.targetPath);
    await assertNoSymlinkedRestoreAncestors(repositoryRootPath, action.targetPath);

    const resolvedRevision = await resolveRestoreRevision(repositoryRootPath, ref);
    const sourceExists = await doesPathExistAtRevision(
      repositoryRootPath,
      resolvedRevision,
      sourceGitPath
    );

    if (sourceExists) {
      if (sourceGitPath !== targetGitPath) {
        throw new Error('Git restore cannot map the selected source path to a different target path.');
      }
      await assertNoSymlinkedRestoreAncestors(repositoryRootPath, action.targetPath);
      await execGitWithResult(
        repositoryRootPath,
        ['restore', `--source=${resolvedRevision}`, '--worktree', '--', targetGitPath],
        GIT_EXEC_LOCAL_MUTATION_PROFILE
      );
      continue;
    }

    if (action.kind !== 'delete') {
      throw new Error(`The selected revision does not contain ${sourceGitPath}.`);
    }

    await assertNoSymlinkedRestoreAncestors(repositoryRootPath, action.targetPath);
    await fs.rm(action.targetPath, { force: true, recursive: false });
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

async function resolveRestoreRevision(repositoryRootPath: string, ref: string): Promise<string> {
  const { stdout } = await execGitWithResult(
    repositoryRootPath,
    ['rev-parse', '--verify', `${ref}^{commit}`],
    GIT_EXEC_METADATA_PROFILE
  );
  const resolvedRevision = stdout.trim();
  if (!/^[0-9a-f]{40,64}$/i.test(resolvedRevision)) {
    throw new Error('Git did not resolve the selected restore revision to a commit.');
  }
  return resolvedRevision;
}

async function doesPathExistAtRevision(
  repositoryRootPath: string,
  resolvedRevision: string,
  gitPath: string
): Promise<boolean> {
  try {
    await execGitWithResult(
      repositoryRootPath,
      ['cat-file', '-e', `${resolvedRevision}:${gitPath}`],
      GIT_EXEC_METADATA_PROFILE
    );
    return true;
  } catch (error) {
    if (hasGitExitCode(error, 128)) {
      return false;
    }
    throw error;
  }
}

function toRepositoryGitPath(repositoryRootPath: string, candidatePath: string): string {
  return path.relative(repositoryRootPath, candidatePath).split(path.sep).join('/');
}

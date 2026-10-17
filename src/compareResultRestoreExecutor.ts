import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { CompareResultRestoreAction } from './compareResultRestore';
import { assertCompareResultRestorePlanInsideRepository } from './compareResultRestore';
import { assertNoSymlinkedRestoreAncestors, CompareResultRestoreBackup } from './compareResultRestoreBackup';
import {
  execGitWithResult,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE
} from './gitExec';

export { assertNoSymlinkedRestoreAncestors } from './compareResultRestoreBackup';

interface PreparedRestoreAction {
  readonly targetPath: string;
  readonly targetGitPath: string;
  readonly sourceExists: boolean;
}

export async function executeCompareResultRestorePlan(
  repositoryRootPath: string,
  ref: string,
  plan: readonly CompareResultRestoreAction[]
): Promise<void> {
  assertCompareResultRestorePlanInsideRepository(repositoryRootPath, plan);
  if (plan.length === 0) {
    return;
  }

  const resolvedRevision = await resolveRestoreRevision(repositoryRootPath, ref);
  const prepared = await prepareRestoreActions(repositoryRootPath, resolvedRevision, plan);
  const backup = await CompareResultRestoreBackup.create(repositoryRootPath, prepared.map((action) => action.targetPath));
  const touchedPaths = new Set<string>();
  try {
    for (const action of prepared) {
      await assertNoSymlinkedRestoreAncestors(repositoryRootPath, action.targetPath);
      touchedPaths.add(action.targetPath);
      if (action.sourceExists) {
        await execGitWithResult(
          repositoryRootPath,
          ['--literal-pathspecs', 'restore', `--source=${resolvedRevision}`, '--worktree', '--', action.targetGitPath],
          GIT_EXEC_LOCAL_MUTATION_PROFILE
        );
      } else {
        await fs.rm(action.targetPath, { force: true, recursive: false });
      }
    }
  } catch (error) {
    await backup.recover(error, touchedPaths);
  }
  await backup.dispose();
}

async function prepareRestoreActions(
  repositoryRootPath: string,
  resolvedRevision: string,
  plan: readonly CompareResultRestoreAction[]
): Promise<PreparedRestoreAction[]> {
  const prepared: PreparedRestoreAction[] = [];
  for (const action of plan) {
    const sourcePath = action.kind === 'write-ref' ? action.refPath : action.targetPath;
    const sourceGitPath = toRepositoryGitPath(repositoryRootPath, sourcePath);
    const targetGitPath = toRepositoryGitPath(repositoryRootPath, action.targetPath);
    await assertNoSymlinkedRestoreAncestors(repositoryRootPath, action.targetPath);

    const sourceExists = await doesPathExistAtRevision(
      repositoryRootPath,
      resolvedRevision,
      sourceGitPath
    );

    if (sourceExists) {
      if (sourceGitPath !== targetGitPath) {
        throw new Error('Git restore cannot map the selected source path to a different target path.');
      }
    } else if (action.kind !== 'delete') {
      throw new Error(`The selected revision does not contain ${sourceGitPath}.`);
    }

    prepared.push({ targetPath: action.targetPath, targetGitPath, sourceExists });
  }
  return prepared;
}

async function resolveRestoreRevision(repositoryRootPath: string, ref: string): Promise<string> {
  const { stdout } = await execGitWithResult(
    repositoryRootPath,
    ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
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
  const { stdout } = await execGitWithResult(
    repositoryRootPath,
    ['--literal-pathspecs', 'ls-tree', '-z', '--full-tree', resolvedRevision, '--', gitPath],
    GIT_EXEC_METADATA_PROFILE
  );
  if (!stdout) {
    return false;
  }
  if (stdout.split('\0').filter(Boolean).length !== 1 || !/^\d+ blob [0-9a-f]+\t/.test(stdout)) {
    throw new Error(`The selected revision path ${gitPath} is not a file.`);
  }
  return true;
}

function toRepositoryGitPath(repositoryRootPath: string, candidatePath: string): string {
  return path.relative(repositoryRootPath, candidatePath).split(path.sep).join('/');
}

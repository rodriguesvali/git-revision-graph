import * as path from 'node:path';

import {
  assertCompareResultRestorePlanInsideRepository,
  buildCompareResultRestorePlan,
  type CompareResultRestoreSourceSide
} from './compareResultRestore';
import { executeCompareResultRestorePlan } from './compareResultRestoreExecutor';
import {
  execGitWithResult,
  GIT_EXEC_METADATA_PROFILE
} from './gitExec';
import { Change, Repository } from './git';

export async function restoreWorktreeChangeFromRef(
  repository: Repository,
  change: Change,
  ref: string,
  sourceSide?: CompareResultRestoreSourceSide
): Promise<void> {
  const plan = buildCompareResultRestorePlan(change, sourceSide);
  await executeCompareResultRestorePlan(repository.rootUri.fsPath, ref, plan);
}

export async function hasWorktreeChangeForCompareResultRestore(
  repository: Repository,
  change: Change,
  sourceSide?: CompareResultRestoreSourceSide
): Promise<boolean> {
  const plan = buildCompareResultRestorePlan(change, sourceSide);
  assertCompareResultRestorePlanInsideRepository(repository.rootUri.fsPath, plan);
  const paths = [...new Set(plan.map((action) => action.targetPath))]
    .map((targetPath) => path.relative(repository.rootUri.fsPath, targetPath).split(path.sep).join('/'));
  if (paths.length === 0) {
    return false;
  }

  const { stdout } = await execGitWithResult(repository.rootUri.fsPath, [
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    ...paths
  ], GIT_EXEC_METADATA_PROFILE);
  return stdout.trim().length > 0;
}

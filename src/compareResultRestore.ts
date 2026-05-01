import type { Change } from './git';
import { isAddition, getLeftUri, getRightUri } from './changePresentation';
import * as path from 'node:path';

export type CompareResultRestoreAction =
  | {
    readonly kind: 'delete';
    readonly targetPath: string;
  }
  | {
    readonly kind: 'write-ref';
    readonly refPath: string;
    readonly targetPath: string;
  };

export function buildCompareResultRestorePlan(change: Change): CompareResultRestoreAction[] {
  const originalPath = getLeftUri(change).fsPath;
  const targetPath = getRightUri(change).fsPath;

  if (isAddition(change.status)) {
    return [{ kind: 'delete', targetPath }];
  }

  if (change.renameUri && originalPath !== targetPath) {
    return [
      { kind: 'delete', targetPath },
      { kind: 'write-ref', refPath: originalPath, targetPath: originalPath }
    ];
  }

  return [{ kind: 'write-ref', refPath: originalPath, targetPath }];
}

export function assertCompareResultRestorePlanInsideRepository(
  repositoryRootPath: string,
  plan: readonly CompareResultRestoreAction[]
): void {
  for (const action of plan) {
    assertPathInsideRepository(repositoryRootPath, action.targetPath);
    if (action.kind === 'write-ref') {
      assertPathInsideRepository(repositoryRootPath, action.refPath);
    }
  }
}

export function isPathInsideRepository(repositoryRootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(path.resolve(repositoryRootPath), path.resolve(candidatePath));
  return relativePath.length > 0
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function assertPathInsideRepository(repositoryRootPath: string, candidatePath: string): void {
  if (!isPathInsideRepository(repositoryRootPath, candidatePath)) {
    throw new Error('The restore target is outside the selected repository.');
  }
}

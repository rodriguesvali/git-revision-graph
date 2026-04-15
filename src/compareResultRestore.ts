import type { Change } from './git';
import { isAddition, getLeftUri, getRightUri } from './changePresentation';

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

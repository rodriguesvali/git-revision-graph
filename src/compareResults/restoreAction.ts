import { toOperationError } from '../errorDetail';
import type { Change, Repository } from '../git';
import type { CompareResultItem } from '../compareResultsShared';

const RESTORE_FILE_CONFIRMATION_ACTION = 'Restore File';

export interface CompareResultsRestoreServices {
  showWarningMessage(
    message: string,
    options: { readonly modal: true },
    action: typeof RESTORE_FILE_CONFIRMATION_ACTION
  ): Promise<string | undefined>;
  showErrorMessage(message: string): Promise<void>;
  restoreWorktreeChangeFromRef(
    repository: Repository,
    change: Change,
    ref: string
  ): Promise<void>;
}

export async function restoreCompareResultItemToWorktree(
  item: CompareResultItem,
  services?: CompareResultsRestoreServices
): Promise<boolean> {
  if (!item.worktreeRef) {
    return false;
  }

  const restoreServices = services ?? await getDefaultCompareResultsRestoreServices();
  const confirmation = await restoreServices.showWarningMessage(
    buildCompareResultRestoreConfirmationMessage(item),
    { modal: true },
    RESTORE_FILE_CONFIRMATION_ACTION
  );
  if (confirmation !== RESTORE_FILE_CONFIRMATION_ACTION) {
    return false;
  }

  try {
    await restoreServices.restoreWorktreeChangeFromRef(item.repository, item.change, item.worktreeRef);
    return true;
  } catch (error) {
    await restoreServices.showErrorMessage(
      toOperationError('Could not revert the file to the selected revision.', error)
    );
    return false;
  }
}

export function buildCompareResultRestoreConfirmationMessage(item: CompareResultItem): string {
  const restoreSource = item.worktreeLabel ?? item.worktreeRef;
  return `Restore ${item.label} in the worktree from ${restoreSource}?`;
}

async function getDefaultCompareResultsRestoreServices(): Promise<CompareResultsRestoreServices> {
  const [vscode, services] = await Promise.all([
    import('vscode'),
    import('../workbenchRefActionServices')
  ]);
  return {
    async showWarningMessage(message, options, action) {
      return vscode.window.showWarningMessage(message, options, action);
    },
    async showErrorMessage(message) {
      await vscode.window.showErrorMessage(message);
    },
    restoreWorktreeChangeFromRef: services.restoreWorktreeChangeFromRef
  };
}

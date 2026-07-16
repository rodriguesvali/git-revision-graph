import { toOperationError } from '../errorDetail';
import type { Change, Repository } from '../git';
import type { CompareResultItem } from '../compareResultsShared';
import type { CompareResultRestoreSourceSide } from '../compareResultRestore';
import { isAbortError } from '../errors';
import { showModalErrorMessage } from '../workbenchMessages';

const RESTORE_FILE_CONFIRMATION_ACTION = 'Revert File';

export interface CompareResultsRestoreServices {
  showWarningMessage(
    message: string,
    options: { readonly modal: true },
    action: typeof RESTORE_FILE_CONFIRMATION_ACTION
  ): Promise<string | undefined>;
  showErrorMessage(message: string): Promise<void>;
  hasWorktreeChangeForCompareResultRestore(
    repository: Repository,
    change: Change,
    sourceSide: CompareResultRestoreSourceSide
  ): Promise<boolean>;
  restoreWorktreeChangeFromRef(
    repository: Repository,
    change: Change,
    ref: string,
    sourceSide: CompareResultRestoreSourceSide
  ): Promise<void>;
}

export async function restoreCompareResultItemToWorktree(
  item: CompareResultItem,
  services?: CompareResultsRestoreServices,
  assertMutationCurrent: () => void = () => undefined
): Promise<boolean> {
  const restoreSource = getCompareResultRestoreSource(item);
  if (!restoreSource) {
    return false;
  }

  const restoreServices = services ?? await getDefaultCompareResultsRestoreServices();
  if (
    await restoreServices.hasWorktreeChangeForCompareResultRestore(
      item.repository,
      item.change,
      restoreSource.sourceSide
    )
  ) {
    const confirmation = await restoreServices.showWarningMessage(
      buildCompareResultRestoreConfirmationMessage(item),
      { modal: true },
      RESTORE_FILE_CONFIRMATION_ACTION
    );
    if (confirmation !== RESTORE_FILE_CONFIRMATION_ACTION) {
      return false;
    }
  }

  try {
    assertMutationCurrent();
    await restoreServices.restoreWorktreeChangeFromRef(
      item.repository,
      item.change,
      restoreSource.ref,
      restoreSource.sourceSide
    );
    return true;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    await restoreServices.showErrorMessage(
      toOperationError('Could not revert the file to the selected revision.', error)
    );
    return false;
  }
}

export function buildCompareResultRestoreConfirmationMessage(item: CompareResultItem): string {
  const restoreSource = getCompareResultRestoreSource(item);
  return `Revert ${item.label} in the worktree to ${restoreSource?.label ?? 'the selected revision'}?`;
}

function getCompareResultRestoreSource(
  item: CompareResultItem
): { readonly ref: string; readonly label: string; readonly sourceSide: CompareResultRestoreSourceSide } | undefined {
  if (item.worktreeRef) {
    return {
      ref: item.worktreeRef,
      label: item.worktreeLabel ?? item.worktreeRef,
      sourceSide: 'left'
    };
  }

  if (item.rightRef) {
    return {
      ref: item.rightRef,
      label: item.rightRef,
      sourceSide: 'right'
    };
  }

  if (item.leftRef) {
    return {
      ref: item.leftRef,
      label: item.leftRef,
      sourceSide: 'left'
    };
  }

  return undefined;
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
      await showModalErrorMessage(message);
    },
    hasWorktreeChangeForCompareResultRestore: services.hasWorktreeChangeForCompareResultRestore,
    restoreWorktreeChangeFromRef: services.restoreWorktreeChangeFromRef
  };
}

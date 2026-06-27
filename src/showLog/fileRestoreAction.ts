import { getRepositoryRelativeChangePath } from '../changePresentation';
import type { CompareResultRestoreSourceSide } from '../compareResultRestore';
import { toOperationError } from '../errorDetail';
import type { Change, Repository } from '../git';
import { isAbortError } from '../errors';

const REVERT_FILE_CONFIRMATION_ACTION = 'Revert File';
const SHOW_LOG_RESTORE_SOURCE_SIDE: CompareResultRestoreSourceSide = 'right';

export interface ShowLogFileRestoreServices {
  showWarningMessage(
    message: string,
    options: { readonly modal: true },
    action: typeof REVERT_FILE_CONFIRMATION_ACTION
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

export async function revertShowLogFileChangeToCommit(
  repository: Repository,
  commitHash: string,
  change: Change,
  services?: ShowLogFileRestoreServices,
  assertMutationCurrent: () => void = () => undefined
): Promise<boolean> {
  const restoreServices = services ?? await getDefaultShowLogFileRestoreServices();
  if (
    await restoreServices.hasWorktreeChangeForCompareResultRestore(
      repository,
      change,
      SHOW_LOG_RESTORE_SOURCE_SIDE
    )
  ) {
    const confirmation = await restoreServices.showWarningMessage(
      buildShowLogFileRevertConfirmationMessage(repository, commitHash, change),
      { modal: true },
      REVERT_FILE_CONFIRMATION_ACTION
    );
    if (confirmation !== REVERT_FILE_CONFIRMATION_ACTION) {
      return false;
    }
  }

  try {
    assertMutationCurrent();
    await restoreServices.restoreWorktreeChangeFromRef(
      repository,
      change,
      commitHash,
      SHOW_LOG_RESTORE_SOURCE_SIDE
    );
    return true;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    await restoreServices.showErrorMessage(
      toOperationError('Could not revert the file to the selected commit.', error)
    );
    return false;
  }
}

export function buildShowLogFileRevertConfirmationMessage(
  repository: Repository,
  commitHash: string,
  change: Change
): string {
  const label = getRepositoryRelativeChangePath(repository.rootUri.fsPath, change);
  return `Revert ${label} in the worktree to ${commitHash.slice(0, 7)}?`;
}

async function getDefaultShowLogFileRestoreServices(): Promise<ShowLogFileRestoreServices> {
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
    hasWorktreeChangeForCompareResultRestore: services.hasWorktreeChangeForCompareResultRestore,
    restoreWorktreeChangeFromRef: services.restoreWorktreeChangeFromRef
  };
}

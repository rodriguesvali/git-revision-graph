import { toOperationError } from '../errorDetail';
import type { Repository } from '../git';
import { execGitWithResult } from '../gitExec';
import { isCherryPickInProgress } from '../gitState';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh
} from '../refActions/shared';
import type { RefActionServices } from '../refActions/types';

export type CherryPickGitExecutor = (
  repositoryPath: string,
  args: readonly string[]
) => Promise<unknown>;

export async function cherryPickShowLogCommits(
  repository: Repository,
  commitHashes: readonly string[],
  services: RefActionServices | undefined,
  executeGit: CherryPickGitExecutor = execGitWithResult,
  assertMutationCurrent: () => void = () => undefined
): Promise<boolean> {
  if (!services) {
    return false;
  }

  const uniqueCommitHashes = getUniqueCommitHashes(commitHashes);
  if (uniqueCommitHashes.length === 0) {
    return false;
  }

  if (isCherryPickInProgress(repository)) {
    return handleCherryPickInProgress(repository, services, executeGit, assertMutationCurrent);
  }

  if (!await ensureWorkspaceReadyForMutation(repository, 'cherry-picking selected commits', services)) {
    return false;
  }

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  try {
    assertMutationCurrent();
    await executeGit(repository.rootUri.fsPath, ['cherry-pick', '--no-edit', ...uniqueCommitHashes]);
  } catch (error) {
    preparedRefresh.cancel();
    if (isEmptyCherryPickError(error)) {
      return handleEmptyCherryPick(repository, services, executeGit, assertMutationCurrent);
    }

    await services.ui.showErrorMessage(
      toOperationError(
        'Could not cherry-pick the selected commits. If there were conflicts, finish or abort the cherry-pick in Source Control.',
        error
      )
    );
    await services.ui.showSourceControl();
    const followUpRefresh = prepareFullRebuildRefresh(repository, services);
    services.refreshController.refresh(followUpRefresh.request);
    return false;
  }

  services.refreshController.refresh(preparedRefresh.request);
  services.ui.showInformationMessage(buildCherryPickMessage(uniqueCommitHashes.length));
  return true;
}

export function isEmptyCherryPickError(error: unknown): boolean {
  const message = getGitErrorText(error);
  return message.includes('previous cherry-pick is now empty')
    || message.includes('the previous cherry-pick is now empty')
    || message.includes('cherry-pick is now empty');
}

export function buildCherryPickMessage(commitCount: number): string {
  return commitCount === 1
    ? 'Cherry-picked 1 commit into the current branch.'
    : `Cherry-picked ${commitCount} commits into the current branch.`;
}

async function handleCherryPickInProgress(
  repository: Repository,
  services: RefActionServices,
  executeGit: CherryPickGitExecutor,
  assertMutationCurrent: () => void
): Promise<boolean> {
  const abortConfirmed = await services.ui.confirm({
    message: 'A cherry-pick is already in progress.\n\nOpen Source Control to continue resolving it, or abort the cherry-pick and discard its conflict resolutions and staged changes.',
    confirmLabel: 'Abort Cherry Pick'
  });
  if (!abortConfirmed) {
    await services.ui.showSourceControl();
    return false;
  }

  return abortCurrentCherryPick(repository, services, executeGit, assertMutationCurrent);
}

async function handleEmptyCherryPick(
  repository: Repository,
  services: RefActionServices,
  executeGit: CherryPickGitExecutor,
  assertMutationCurrent: () => void
): Promise<boolean> {
  const skipConfirmed = await services.ui.confirm({
    message: 'Git stopped on an empty cherry-pick.\n\nSome selected commits may already have been applied. Skip the empty commit and let Git continue the cherry-pick sequence?',
    confirmLabel: 'Skip Empty Commit'
  });
  if (skipConfirmed) {
    const preparedRefresh = prepareFullRebuildRefresh(repository, services);
    try {
      assertMutationCurrent();
      await executeGit(repository.rootUri.fsPath, ['cherry-pick', '--skip']);
    } catch (error) {
      preparedRefresh.cancel();
      await services.ui.showErrorMessage(toOperationError('Could not skip the empty cherry-pick.', error));
      await services.ui.showSourceControl();
      return false;
    }

    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage('Empty cherry-pick skipped.');
    return true;
  }

  const abortConfirmed = await services.ui.confirm({
    message: 'Abort the current cherry-pick?\n\nThis may discard commits already applied by this cherry-pick sequence, along with conflict resolutions and staged changes.',
    confirmLabel: 'Abort Cherry Pick'
  });
  if (!abortConfirmed) {
    await services.ui.showSourceControl();
    return false;
  }

  return abortCurrentCherryPick(repository, services, executeGit, assertMutationCurrent);
}

async function abortCurrentCherryPick(
  repository: Repository,
  services: RefActionServices,
  executeGit: CherryPickGitExecutor,
  assertMutationCurrent: () => void
): Promise<boolean> {
  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  try {
    assertMutationCurrent();
    await executeGit(repository.rootUri.fsPath, ['cherry-pick', '--abort']);
  } catch (error) {
    preparedRefresh.cancel();
    await services.ui.showErrorMessage(toOperationError('Could not abort the current cherry-pick.', error));
    await services.ui.showSourceControl();
    return false;
  }

  services.refreshController.refresh(preparedRefresh.request);
  services.ui.showInformationMessage('Cherry-pick aborted. Workspace restored to the pre-cherry-pick state.');
  return true;
}

function getGitErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? error.toLowerCase() : '';
  }

  const gitError = error as { readonly stderr?: string; readonly message?: string };
  return `${gitError.stderr ?? ''} ${gitError.message ?? ''}`.toLowerCase();
}

function getUniqueCommitHashes(commitHashes: readonly string[]): string[] {
  return [
    ...new Set(
      commitHashes
        .map((hash) => hash.trim())
        .filter((hash) => hash.length > 0)
    )
  ];
}

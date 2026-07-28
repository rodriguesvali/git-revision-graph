import { toOperationError } from '../errorDetail';
import type { Repository } from '../git';
import type { CompareResultsPresenter } from '../refActions';
import { isCompareResultsRequestCurrent } from '../compareResults/requestOwnership';
import type { RevisionLogEntry } from '../revisionGraphTypes';
import { showModalErrorMessage } from '../workbenchMessages';

export interface ShowLogCommitCompareUi {
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): Promise<void>;
}

export async function compareLoadedShowLogCommits(
  repository: Repository,
  entries: readonly RevisionLogEntry[],
  baseCommitHash: string,
  compareCommitHash: string,
  compareResultsPresenter: CompareResultsPresenter,
  ui?: ShowLogCommitCompareUi
): Promise<void> {
  const base = entries.find((entry) => entry.hash === baseCommitHash);
  const compare = entries.find((entry) => entry.hash === compareCommitHash);
  if (!base || !compare || base.hash === compare.hash) {
    return;
  }

  const request = compareResultsPresenter.beginRequest?.(repository);
  try {
    await compareResultsPresenter.showLoadingBetweenRefs?.(
      repository,
      { refName: base.hash, label: base.shortHash },
      { refName: compare.hash, label: compare.shortHash },
      { source: 'showLog', request }
    );
    const changes = await repository.diffBetween(base.hash, compare.hash);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    if (changes.length === 0) {
      await compareResultsPresenter.hideLoading?.(request);
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      const compareUi = ui ?? await getDefaultShowLogCommitCompareUi();
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      compareUi.showInformationMessage(`No differences found between ${base.shortHash} and ${compare.shortHash}.`);
      return;
    }

    await compareResultsPresenter.showBetweenRefs(
      repository,
      { refName: base.hash, label: base.shortHash },
      { refName: compare.hash, label: compare.shortHash },
      changes,
      { source: 'showLog', request }
    );
  } catch (error) {
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await compareResultsPresenter.hideLoading?.(request);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    const compareUi = ui ?? await getDefaultShowLogCommitCompareUi();
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await compareUi.showErrorMessage(toOperationError('Could not compare the selected commits.', error));
  }
}

export async function compareLoadedShowLogCommitWithWorktree(
  repository: Repository,
  entries: readonly RevisionLogEntry[],
  commitHash: string,
  compareResultsPresenter: CompareResultsPresenter,
  ui?: ShowLogCommitCompareUi
): Promise<void> {
  const entry = entries.find((item) => item.hash === commitHash);
  if (!entry) {
    return;
  }

  const request = compareResultsPresenter.beginRequest?.(repository);
  try {
    await compareResultsPresenter.showLoadingWithWorktree?.(
      repository,
      { refName: entry.hash, label: entry.shortHash },
      { source: 'showLog', request }
    );
    const changes = await repository.diffWith(entry.hash);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    if (changes.length === 0) {
      await compareResultsPresenter.hideLoading?.(request);
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      const compareUi = ui ?? await getDefaultShowLogCommitCompareUi();
      if (!isCompareResultsRequestCurrent(request, repository)) {
        return;
      }
      compareUi.showInformationMessage(`The worktree is already aligned with ${entry.shortHash}.`);
      return;
    }

    await compareResultsPresenter.showWithWorktree(
      repository,
      { refName: entry.hash, label: entry.shortHash },
      changes,
      { source: 'showLog', request }
    );
  } catch (error) {
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await compareResultsPresenter.hideLoading?.(request);
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    const compareUi = ui ?? await getDefaultShowLogCommitCompareUi();
    if (!isCompareResultsRequestCurrent(request, repository)) {
      return;
    }
    await compareUi.showErrorMessage(toOperationError('Could not compare the selected commit with the worktree.', error));
  }
}

async function getDefaultShowLogCommitCompareUi(): Promise<ShowLogCommitCompareUi> {
  const vscode = await import('vscode');
  return {
    showInformationMessage(message) {
      void vscode.window.showInformationMessage(message);
    },
    async showErrorMessage(message) {
      await showModalErrorMessage(message);
    }
  };
}

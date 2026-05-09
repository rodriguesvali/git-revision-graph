import { toOperationError } from '../errorDetail';
import type { Repository } from '../git';
import type { CompareResultsPresenter } from '../refActions';
import type { RevisionLogEntry } from '../revisionGraphTypes';

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
  ui: ShowLogCommitCompareUi
): Promise<void> {
  const base = entries.find((entry) => entry.hash === baseCommitHash);
  const compare = entries.find((entry) => entry.hash === compareCommitHash);
  if (!base || !compare || base.hash === compare.hash) {
    return;
  }

  try {
    const changes = await repository.diffBetween(base.hash, compare.hash);
    if (changes.length === 0) {
      ui.showInformationMessage(`No differences found between ${base.shortHash} and ${compare.shortHash}.`);
      return;
    }

    await compareResultsPresenter.showBetweenRefs(
      repository,
      { refName: base.hash, label: base.shortHash },
      { refName: compare.hash, label: compare.shortHash },
      changes
    );
  } catch (error) {
    await ui.showErrorMessage(toOperationError('Could not compare the selected commits.', error));
  }
}

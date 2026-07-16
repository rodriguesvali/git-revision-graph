import type { Repository } from '../git';
import { formatShortCommitHash } from '../commitHash';
import {
  resetCurrentBranchToCommit,
  type RefActionServices
} from '../refActions';
import type { RevisionLogEntry } from '../revisionGraphTypes';
import { showModalErrorMessage } from '../workbenchMessages';

export interface ShowLogResetActionUi {
  showErrorMessage(message: string): Promise<void>;
}

export type ShowLogResetWorkflow = (
  repository: Repository,
  commitHash: string,
  commitLabel: string,
  services: RefActionServices
) => Promise<boolean>;

export async function resetShowLogCommit(
  repository: Repository,
  entries: readonly RevisionLogEntry[],
  commitHash: string,
  services: RefActionServices | undefined,
  ui?: ShowLogResetActionUi,
  resetWorkflow: ShowLogResetWorkflow = resetCurrentBranchToCommit
): Promise<boolean> {
  const entry = entries.find((item) => item.hash === commitHash);
  if (!entry) {
    return false;
  }

  if (!services) {
    const resetUi = ui ?? await getDefaultShowLogResetActionUi();
    await resetUi.showErrorMessage('Could not reset the branch because Git actions are not ready yet.');
    return false;
  }

  return resetWorkflow(
    repository,
    commitHash,
    getShowLogResetCommitLabel(entry, commitHash),
    services
  );
}

export function getShowLogResetCommitLabel(entry: RevisionLogEntry, commitHash: string): string {
  return entry.shortHash || formatShortCommitHash(commitHash);
}

async function getDefaultShowLogResetActionUi(): Promise<ShowLogResetActionUi> {
  return {
    async showErrorMessage(message) {
      await showModalErrorMessage(message);
    }
  };
}

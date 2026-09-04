import * as vscode from 'vscode';

import { toErrorDetail } from '../errorDetail';
import { execGitWithResult } from '../gitExec';
import { Repository } from '../git';
import { RefActionProgress, RefActionUi } from '../refActions/types';
import { RevisionGraphRefreshRequestLike } from '../revisionGraphRefresh';
import { isAbortError } from '../errors';
import {
  buildRevisionGraphFetchArgs,
  buildRevisionGraphFetchOptions,
  createRevisionGraphFetchOptionItems,
  formatRevisionGraphFetchSuccessMessage,
  RevisionGraphFetchOption,
  shouldUseGitCliForRevisionGraphFetch
} from './fetchOptions';

const FETCH_WITH_TAGS_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const FETCH_WITH_TAGS_TIMEOUT_MS = 120000;

export interface RevisionGraphFetchWorkflowHost {
  readonly ui: Pick<RefActionUi, 'showInformationMessage' | 'showErrorMessage'>;
  readonly progress: RefActionProgress;
  postCurrentState(): void;
  refresh(request?: RevisionGraphRefreshRequestLike): Promise<void>;
  prepareRefresh(request?: RevisionGraphRefreshRequestLike): { cancel(): void } | undefined;
  createCurrentRepositoryRefreshRequest(): RevisionGraphRefreshRequestLike;
  getCurrentRepositoryLabel(): string;
  assertMutationCurrent?(): void;
  readonly signal?: AbortSignal;
}

export async function runRevisionGraphFetchWorkflow(
  repository: Repository | undefined,
  host: RevisionGraphFetchWorkflowHost
): Promise<void> {
  if (!repository) {
    host.ui.showInformationMessage('Choose a repository before fetching from the revision graph.');
    host.postCurrentState();
    return;
  }

  const selectedOptions = await pickFetchOptions();
  if (!selectedOptions) {
    host.postCurrentState();
    return;
  }

  host.assertMutationCurrent?.();

  const refreshRequest = host.createCurrentRepositoryRefreshRequest();
  const preparedRefresh = host.prepareRefresh(refreshRequest);

  try {
    await host.progress.run('Fetching remotes...', 'subtle', async () => {
      if (shouldUseGitCliForRevisionGraphFetch(selectedOptions)) {
        await execGitWithResult(
          repository.rootUri.fsPath,
          buildRevisionGraphFetchArgs(selectedOptions),
          {
            maxOutputBytes: FETCH_WITH_TAGS_MAX_OUTPUT_BYTES,
            timeoutMs: FETCH_WITH_TAGS_TIMEOUT_MS,
            signal: host.signal
          }
        );
      } else {
        await repository.fetch(buildRevisionGraphFetchOptions(selectedOptions));
      }
    });
    host.ui.showInformationMessage(
      formatRevisionGraphFetchSuccessMessage(host.getCurrentRepositoryLabel(), selectedOptions)
    );
    await host.refresh(refreshRequest);
  } catch (error) {
    preparedRefresh?.cancel();
    if (isAbortError(error)) {
      throw error;
    }
    await host.ui.showErrorMessage(`Could not fetch the current repository. ${toErrorDetail(error)}`);
  }
}

async function pickFetchOptions(): Promise<RevisionGraphFetchOption[] | undefined> {
  const pickedOptions = await vscode.window.showQuickPick(createRevisionGraphFetchOptionItems(), {
    canPickMany: true,
    title: 'Fetch Options',
    placeHolder: 'Choose optional flags for the current repository fetch',
    ignoreFocusOut: true
  });

  return pickedOptions?.map((option) => option.id);
}

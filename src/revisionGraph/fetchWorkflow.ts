import * as vscode from 'vscode';

import { toErrorDetail } from '../errorDetail';
import { execGitWithResult } from '../gitExec';
import { Repository } from '../git';
import { RefActionUi } from '../refActions';
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
  postActionLoading(label: string, mode?: 'blocking' | 'subtle'): void;
  postCurrentState(): void;
  refresh(request?: RevisionGraphRefreshRequestLike): Promise<void>;
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

  host.postActionLoading('Fetching remotes...');

  try {
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
    host.ui.showInformationMessage(
      formatRevisionGraphFetchSuccessMessage(host.getCurrentRepositoryLabel(), selectedOptions)
    );
    await host.refresh(host.createCurrentRepositoryRefreshRequest());
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    await host.ui.showErrorMessage(`Could not fetch the current repository. ${toErrorDetail(error)}`);
    host.postCurrentState();
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

import type * as vscode from 'vscode';

import {
  getRepositoryRelativeChangePath,
  getRepositoryRelativeUriPath,
  getStatusLabel
} from '../changePresentation';
import { Status, type Change } from '../git';
import type { CompareResultsState } from '../compareResultsShared';
import type { RevisionGraphDocumentBackend } from '../revisionGraph/backend';
import {
  isSensitiveCompareBriefingPath,
  MAX_COMPARE_BRIEFING_DIFF_CHARS,
  MAX_COMPARE_BRIEFING_FILES,
  normalizeCompareBriefingPath,
  truncateCompareBriefingDiff,
  type CompareBriefingInput
} from './aiBriefing';

const COMPARE_BRIEFING_GIT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export type CompareBriefingPreparation =
  | { readonly status: 'ready'; readonly input: CompareBriefingInput }
  | { readonly status: 'unavailable'; readonly message: string }
  | { readonly status: 'cancelled' };

export async function prepareCompareBriefing(
  state: CompareResultsState,
  backend: RevisionGraphDocumentBackend,
  token: vscode.CancellationToken
): Promise<CompareBriefingPreparation> {
  if (state.kind !== 'between' && state.kind !== 'worktree') {
    return { status: 'unavailable', message: 'Open a completed comparison before generating a briefing.' };
  }

  const safeChanges = state.changes
    .map((change) => toSafeCompareBriefingChange(state.repository.rootUri.fsPath, change))
    .filter((change): change is SafeCompareBriefingChange => !!change)
    .sort((left, right) => left.path.localeCompare(right.path));
  const selectedChanges = safeChanges.slice(0, MAX_COMPARE_BRIEFING_FILES);
  if (selectedChanges.length === 0) {
    return {
      status: 'unavailable',
      message: 'No non-sensitive changed files are available for an AI briefing.'
    };
  }

  const abortController = new AbortController();
  const cancellation = token.onCancellationRequested(() => abortController.abort());
  if (token.isCancellationRequested) {
    abortController.abort();
  }

  try {
    const paths = selectedChanges.map((change) => change.path);
    const options = {
      paths,
      signal: abortController.signal,
      maxOutputBytes: COMPARE_BRIEFING_GIT_MAX_OUTPUT_BYTES
    };
    const diff = state.kind === 'between'
      ? await backend.loadUnifiedDiff(
        state.repository,
        state.left.refName,
        state.right.refName,
        options
      )
      : await backend.loadUnifiedDiffWithWorktree(
        state.repository,
        state.target.refName,
        selectedChanges
          .filter((change) => change.status === Status.UNTRACKED)
          .map((change) => change.path),
        options
      );
    if (token.isCancellationRequested) {
      return { status: 'cancelled' };
    }
    if (diff.trim().length === 0) {
      return { status: 'unavailable', message: 'No diff content is available for an AI briefing.' };
    }

    const boundedDiff = truncateCompareBriefingDiff(diff, MAX_COMPARE_BRIEFING_DIFF_CHARS);
    return {
      status: 'ready',
      input: {
        sourceLabel: state.kind === 'between' ? state.left.label : state.target.label,
        targetLabel: state.kind === 'between' ? state.right.label : 'Worktree',
        files: selectedChanges.map((change) => ({
          path: change.path,
          status: getStatusLabel(change.status)
        })),
        omittedFileCount: state.changes.length - selectedChanges.length,
        diff: boundedDiff.text,
        diffTruncated: boundedDiff.truncated
      }
    };
  } finally {
    cancellation.dispose();
  }
}

interface SafeCompareBriefingChange {
  readonly path: string;
  readonly status: Status;
}

function toSafeCompareBriefingChange(
  repositoryPath: string,
  change: Change
): SafeCompareBriefingChange | undefined {
  const relatedPaths = [
    getRepositoryRelativeUriPath(repositoryPath, change.uri.fsPath),
    getRepositoryRelativeUriPath(repositoryPath, change.originalUri.fsPath),
    change.renameUri
      ? getRepositoryRelativeUriPath(repositoryPath, change.renameUri.fsPath)
      : undefined
  ].filter((value): value is string => !!value);
  const normalizedPaths = relatedPaths.map((value) => normalizeCompareBriefingPath(value));
  if (
    normalizedPaths.some((value) => !value)
    || normalizedPaths.some((value) => value ? isSensitiveCompareBriefingPath(value) : true)
  ) {
    return undefined;
  }

  const path = normalizeCompareBriefingPath(
    getRepositoryRelativeChangePath(repositoryPath, change)
  );
  return path ? { path, status: change.status } : undefined;
}

import * as vscode from 'vscode';
import type { CompareResultsState } from '../compareResultsShared';
import type { RevisionGraphDocumentBackend } from '../revisionGraph/backend';
import { openUnifiedDiffDocument, openUnifiedDiffWithWorktreeDocument } from '../revisionGraph/repository/log';
import { prepareCompareResultsWorktreeUnifiedDiff } from './worktreeRefresh';
import { showModalErrorMessage } from '../workbenchMessages';
import { toOperationError } from '../errorDetail';

export async function openCompareUnifiedDiff(host: {
  getState(): CompareResultsState;
  update(state: CompareResultsState): void;
  close(): void;
}, backend: RevisionGraphDocumentBackend): Promise<void> {
  const initial = host.getState();
  if (initial.kind === 'between') {
    await openUnifiedDiffDocument(
      initial.repository,
      initial.left.refName,
      initial.right.refName,
      backend
    );
  } else {
    const state = initial;
    if (state.kind !== 'worktree') return;
    let preparation;
    try {
      preparation = await prepareCompareResultsWorktreeUnifiedDiff(
        state,
        () => host.getState()
      );
    } catch (error) {
      await showModalErrorMessage(
        toOperationError(
          'Could not refresh Compare Results before opening the unified diff.',
          error
        ),
        { modal: true }
      );
      return;
    }
    if (!preparation) {
      return;
    }

    host.update(preparation.nextState);
    if (!preparation.request) {
      host.close();
      if (preparation.infoMessage) {
        void vscode.window.showInformationMessage(preparation.infoMessage);
      }
      return;
    }

    await openUnifiedDiffWithWorktreeDocument(
      preparation.request.repository,
      preparation.request.refName,
      preparation.request.label,
      preparation.request.untrackedPaths,
      backend
    );
  }
}

import * as vscode from 'vscode';

import type { Change, Repository } from './git';
import { toOperationError } from './errorDetail';
import {
  CompareResultsCompletedState,
  CompareResultItem,
  CompareResultsState,
  isCompareResultsStateForRepository
} from './compareResultsShared';
import {
  renderCompareResultsWebviewHtml,
  type CompareResultsWebviewState
} from './compareResultsWebview';
import {
  dispatchCompareResultsWebviewMessage,
  type CompareResultsMessageHandlers
} from './compareResults/messageHandler';
import { restoreCompareResultItemToWorktree } from './compareResults/restoreAction';
import {
  compareCompareResultItemWithWorktree,
  openCompareResultItem
} from './compareResults/itemActions';
import {
  copyCompareResultFileNames,
  copyCompareResultFullPaths
} from './compareResults/clipboardActions';
import {
  createCompareResultsWebviewState,
  getCompareResultItems
} from './compareResults/viewState';
import {
  prepareCompareResultsWorktreeUnifiedDiff,
  refreshCompareResultsWorktreeComparison
} from './compareResults/worktreeRefresh';
import type { RevisionGraphDocumentBackend } from './revisionGraph/backend';
import {
  openUnifiedDiffDocument,
  openUnifiedDiffWithWorktreeDocument
} from './revisionGraph/repository/log';
import type { RefSelection } from './refActions';
import { createRetainedScriptWebviewPanelOptions } from './webviewOptions';
import { handleWebviewMessageSafely } from './webviewMessageBoundary';
import {
  createMutationGuardedRepository,
  RepositoryMutationCoordinator
} from './repositoryMutationCoordinator';

export const COMPARE_RESULTS_VIEW_ID = 'gitRefs.compareResultsView';

export class CompareResultsViewProvider implements vscode.Disposable {
  private state: CompareResultsState = { kind: 'empty' };
  private panel: vscode.WebviewPanel | undefined;
  private openingUnifiedDiff = false;
  private readonly panelDisposables: vscode.Disposable[] = [];
  private readonly messageHandlers: CompareResultsMessageHandlers = {
    ready: () => {
      this.postState();
    },
    base: (itemId) => this.compareItemWithBase(itemId),
    copyFileName: (itemIds) => this.copyFileNames(itemIds),
    copyFullPath: (itemIds) => this.copyFullPaths(itemIds),
    unifiedDiff: () => this.openUnifiedDiff(),
    worktree: (itemId) => this.compareItemWithWorktree(itemId),
    revert: (itemId) => this.revertItem(itemId)
  };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backend: RevisionGraphDocumentBackend,
    private readonly mutationCoordinator?: RepositoryMutationCoordinator
  ) {}

  dispose(): void {
    this.disposePanel();
  }

  handleRepositoryClosed(repository: Repository): void {
    if (!isCompareResultsStateForRepository(this.state, repository)) {
      return;
    }

    this.state = { kind: 'empty' };
    this.disposePanel();
  }

  async showBetweenRefs(
    repository: Repository,
    left: RefSelection,
    right: RefSelection,
    changes: readonly Change[]
  ): Promise<void> {
    this.state = {
      kind: 'between',
      repository,
      left,
      right,
      changes: [...changes]
    };
    this.revealPanel();
    this.refresh();
  }

  async showLoadingBetweenRefs(
    repository: Repository,
    left: RefSelection,
    right: RefSelection
  ): Promise<void> {
    this.showLoading(repository, left.label, right.label);
  }

  async showWithWorktree(
    repository: Repository,
    target: RefSelection,
    changes: readonly Change[]
  ): Promise<void> {
    this.state = {
      kind: 'worktree',
      repository,
      target,
      changes: [...changes]
    };
    this.revealPanel();
    this.refresh();
  }

  async showLoadingWithWorktree(
    repository: Repository,
    target: RefSelection
  ): Promise<void> {
    this.showLoading(repository, target.label, 'Worktree');
  }

  async hideLoading(): Promise<void> {
    if (this.state.kind !== 'loading') {
      return;
    }

    this.state = this.state.previousState;
    this.refresh();
    if (this.state.kind === 'empty') {
      this.disposePanel();
    }
  }

  async hideWithRevisionGraph(): Promise<void> {
    this.state = { kind: 'empty' };
    this.refresh();
    this.disposePanel();
  }

  async openItem(item: CompareResultItem): Promise<void> {
    await openCompareResultItem(item);
  }

  async compareWithBase(item: CompareResultItem): Promise<void> {
    await this.openItem(item);
  }

  async compareWithWorktree(item: CompareResultItem): Promise<void> {
    await compareCompareResultItemWithWorktree(item);
  }

  async revertToItem(item: CompareResultItem): Promise<void> {
    const restored = this.mutationCoordinator
      ? await this.runRestoreMutation(item)
      : await restoreCompareResultItemToWorktree(item);
    if (restored && item.worktreeRef) {
      await this.refreshWorktreeComparison(item.repository, item.worktreeRef);
    }
  }

  private async runRestoreMutation(item: CompareResultItem): Promise<boolean> {
    const outcome = await this.mutationCoordinator!.run(
      item.repository.rootUri.fsPath,
      (lease) => restoreCompareResultItemToWorktree(
        {
          ...item,
          repository: createMutationGuardedRepository(item.repository, lease)
        },
        undefined,
        () => lease.assertCurrent()
      )
    );
    if (outcome.status === 'rejected') {
      void vscode.window.showWarningMessage(
        'Another Git operation is already running for this repository.'
      );
      return false;
    }
    return outcome.value;
  }

  private showLoading(repository: Repository, sourceLabel: string, targetLabel: string): void {
    const previousState: CompareResultsCompletedState =
      this.state.kind === 'loading' ? this.state.previousState : this.state;
    this.state = {
      kind: 'loading',
      repository,
      sourceLabel,
      targetLabel,
      previousState
    };
    this.revealPanel();
    this.refresh();
  }

  private refresh(): void {
    this.postState();
  }

  private postUnifiedDiffProgress(isOpening: boolean): void {
    if (!this.panel) {
      return;
    }

    void this.panel.webview.postMessage({
      type: 'unifiedDiffProgress',
      isOpening
    });
  }

  private postState(): void {
    if (!this.panel) {
      return;
    }

    void this.panel.webview.postMessage({
      type: 'state',
      state: this.createWebviewState()
    });
  }

  private createWebviewState(): CompareResultsWebviewState {
    return createCompareResultsWebviewState(this.state);
  }

  private async handleMessage(rawMessage: unknown): Promise<void> {
    await dispatchCompareResultsWebviewMessage(rawMessage, this.messageHandlers);
  }

  private async compareItemWithBase(itemId: string): Promise<void> {
    const item = this.findItem(itemId);
    if (item) {
      await this.compareWithBase(item);
    }
  }

  private async compareItemWithWorktree(itemId: string): Promise<void> {
    const item = this.findItem(itemId);
    if (item) {
      await this.compareWithWorktree(item);
    }
  }

  private async revertItem(itemId: string): Promise<void> {
    const item = this.findItem(itemId);
    if (item) {
      await this.revertToItem(item);
    }
  }

  private async copyFileNames(itemIds: readonly string[]): Promise<void> {
    await copyCompareResultFileNames(this.state, itemIds);
  }

  private async copyFullPaths(itemIds: readonly string[]): Promise<void> {
    await copyCompareResultFullPaths(this.state, itemIds);
  }

  private async openUnifiedDiff(): Promise<void> {
    if (this.openingUnifiedDiff) {
      return;
    }

    if (this.state.kind !== 'between' && this.state.kind !== 'worktree') {
      return;
    }

    this.openingUnifiedDiff = true;
    this.postUnifiedDiffProgress(true);
    try {
      if (this.state.kind === 'between') {
        await openUnifiedDiffDocument(
          this.state.repository,
          this.state.left.refName,
          this.state.right.refName,
          this.backend
        );
      } else {
        const state = this.state;
        let preparation;
        try {
          preparation = await prepareCompareResultsWorktreeUnifiedDiff(
            state,
            () => this.state
          );
        } catch (error) {
          await vscode.window.showErrorMessage(
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

        this.state = preparation.nextState;
        if (!preparation.request) {
          this.refresh();
          this.disposePanel();
          if (preparation.infoMessage) {
            void vscode.window.showInformationMessage(preparation.infoMessage);
          }
          return;
        }

        this.refresh();
        await openUnifiedDiffWithWorktreeDocument(
          preparation.request.repository,
          preparation.request.refName,
          preparation.request.label,
          preparation.request.untrackedPaths,
          this.backend
        );
      }
    } finally {
      this.openingUnifiedDiff = false;
      this.postUnifiedDiffProgress(false);
    }
  }

  private findItem(itemId: string): CompareResultItem | undefined {
    return getCompareResultItems(this.state).find((item) => item.id === itemId);
  }

  private async refreshWorktreeComparison(repository: Repository, refName: string): Promise<void> {
    const state = this.state;
    const outcome = await refreshCompareResultsWorktreeComparison(
      state,
      repository,
      refName,
      () => this.state
    );
    if (!outcome) {
      return;
    }

    this.state = outcome.nextState;
    if (this.state.kind === 'empty') {
      this.refresh();
      this.disposePanel();
      if (outcome.infoMessage) {
        void vscode.window.showInformationMessage(outcome.infoMessage);
      }
      return;
    }
    this.refresh();

    if (outcome.infoMessage) {
      void vscode.window.showInformationMessage(outcome.infoMessage);
    }
  }

  private revealPanel(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      COMPARE_RESULTS_VIEW_ID,
      'Compare Results',
      vscode.ViewColumn.One,
      createRetainedScriptWebviewPanelOptions()
    );
    panel.iconPath = {
      light: vscode.Uri.joinPath(this.extensionUri, 'media', 'icon-source-light.svg'),
      dark: vscode.Uri.joinPath(this.extensionUri, 'media', 'icon-source-dark.svg')
    };
    panel.webview.html = renderCompareResultsWebviewHtml();
    this.panel = panel;
    this.panelDisposables.push(
      panel.onDidDispose(() => {
        if (this.panel === panel) {
          this.panel = undefined;
          this.state = { kind: 'empty' };
        }
        this.disposePanelDisposables();
      }),
      panel.webview.onDidReceiveMessage((message: unknown) => {
        void handleWebviewMessageSafely(
          () => this.handleMessage(message),
          {
            onUnexpectedError: async (error) => {
              const detail = toOperationError('Could not handle the Compare Results action.', error);
              console.error(detail);
              await vscode.window.showErrorMessage(detail);
            },
            reportBoundaryFailure: (error) => {
              console.error('Compare Results error reporting failed.', error);
            }
          }
        );
      })
    );
  }

  private disposePanel(): void {
    const panel = this.panel;
    this.panel = undefined;
    this.disposePanelDisposables();
    panel?.dispose();
  }

  private disposePanelDisposables(): void {
    while (this.panelDisposables.length > 0) {
      this.panelDisposables.pop()?.dispose();
    }
  }
}

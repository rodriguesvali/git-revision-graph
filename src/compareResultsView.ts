import * as vscode from 'vscode';
import * as path from 'node:path';

import { toOperationError } from './errorDetail';
import type { Change, Repository } from './git';
import {
  applyCompareResultsWorktreeRefresh,
  CompareResultItem,
  CompareResultsState
} from './compareResultsShared';
import {
  renderCompareResultsWebviewHtml,
  type CompareResultsWebviewState
} from './compareResultsWebview';
import {
  dispatchCompareResultsWebviewMessage,
  type CompareResultsMessageHandlers
} from './compareResults/messageHandler';
import {
  createCompareResultsWebviewState,
  getCompareResultItems
} from './compareResults/viewState';
import type { RefSelection } from './refActions';
import {
  openChangeDiffBetweenRefs,
  openChangeDiffWithWorktree,
  restoreWorktreeChangeFromRef
} from './workbenchRefActionServices';

export const COMPARE_RESULTS_VIEW_ID = 'gitRefs.compareResultsView';

export class CompareResultsViewProvider implements vscode.Disposable {
  private state: CompareResultsState = { kind: 'empty' };
  private panel: vscode.WebviewPanel | undefined;
  private readonly panelDisposables: vscode.Disposable[] = [];
  private readonly messageHandlers: CompareResultsMessageHandlers = {
    ready: () => {
      this.postState();
    },
    base: (itemId) => this.compareItemWithBase(itemId),
    copyFileName: (itemIds) => this.copyFileNames(itemIds),
    copyFullPath: (itemIds) => this.copyFullPaths(itemIds),
    worktree: (itemId) => this.compareItemWithWorktree(itemId),
    revert: (itemId) => this.revertItem(itemId)
  };

  constructor(private readonly extensionUri: vscode.Uri) {}

  dispose(): void {
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

  async hideWithRevisionGraph(): Promise<void> {
    this.state = { kind: 'empty' };
    this.refresh();
    this.disposePanel();
  }

  async openItem(item: CompareResultItem): Promise<void> {
    if (item.leftRef && item.rightRef) {
      await openChangeDiffBetweenRefs(item.repository, item.change, item.leftRef, item.rightRef);
      return;
    }

    if (item.worktreeRef) {
      await openChangeDiffWithWorktree(item.repository, item.change, item.worktreeRef);
    }
  }

  async compareWithBase(item: CompareResultItem): Promise<void> {
    await this.openItem(item);
  }

  async compareWithWorktree(item: CompareResultItem): Promise<void> {
    const ref = item.worktreeRef ?? item.rightRef ?? item.leftRef;
    if (!ref) {
      return;
    }

    await openChangeDiffWithWorktree(item.repository, item.change, ref);
  }

  async revertToItem(item: CompareResultItem): Promise<void> {
    if (!item.worktreeRef) {
      return;
    }

    const restoreSource = item.worktreeLabel ?? item.worktreeRef;
    const confirmationAction = 'Restore File';
    const confirmation = await vscode.window.showWarningMessage(
      `Restore ${item.label} in the worktree from ${restoreSource}?`,
      { modal: true },
      confirmationAction
    );
    if (confirmation !== confirmationAction) {
      return;
    }

    try {
      await restoreWorktreeChangeFromRef(item.repository, item.change, item.worktreeRef);
      await this.refreshWorktreeComparison(item.repository, item.worktreeRef);
    } catch (error) {
      await vscode.window.showErrorMessage(
        toOperationError('Could not revert the file to the selected revision.', error)
      );
    }
  }

  private refresh(): void {
    this.postState();
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
    const items = this.findItems(itemIds);
    if (items.length === 0) {
      return;
    }

    await vscode.env.clipboard.writeText(
      items.map((item) => path.basename(item.change.renameUri?.fsPath ?? item.change.uri.fsPath)).join('\n')
    );
  }

  private async copyFullPaths(itemIds: readonly string[]): Promise<void> {
    const items = this.findItems(itemIds);
    if (items.length === 0) {
      return;
    }

    await vscode.env.clipboard.writeText(
      items.map((item) => item.change.renameUri?.fsPath ?? item.change.uri.fsPath).join('\n')
    );
  }

  private findItem(itemId: string): CompareResultItem | undefined {
    return getCompareResultItems(this.state).find((item) => item.id === itemId);
  }

  private findItems(itemIds: readonly string[]): CompareResultItem[] {
    const selectedIds = new Set(itemIds);
    return getCompareResultItems(this.state).filter((item) => selectedIds.has(item.id));
  }

  private async refreshWorktreeComparison(repository: Repository, refName: string): Promise<void> {
    const changes = await repository.diffWith(refName);
    const outcome = applyCompareResultsWorktreeRefresh(this.state, repository, refName, changes);
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
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
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
      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        await this.handleMessage(message);
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

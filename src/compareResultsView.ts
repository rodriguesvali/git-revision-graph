import * as vscode from 'vscode';
import * as path from 'node:path';

import { toOperationError } from './errorDetail';
import type { Change, Repository } from './git';
import {
  applyCompareResultsWorktreeRefresh,
  buildCompareResultItems,
  buildCompareResultsMessage,
  CompareResultItem,
  CompareResultsState
} from './compareResultsShared';
import { renderCompareResultsWebviewHtml, CompareResultsWebviewItem, CompareResultsWebviewState } from './compareResultsWebview';
import type { RefSelection } from './refActions';
import {
  openChangeDiffBetweenRefs,
  openChangeDiffWithWorktree,
  restoreWorktreeChangeFromRef
} from './workbenchRefActionServices';

export const COMPARE_RESULTS_VIEW_ID = 'gitRefs.compareResultsView';
export const COMPARE_RESULTS_VISIBLE_CONTEXT = 'gitRefs.compareResultsVisible';

type CompareResultsWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'base'; readonly itemId: string }
  | { readonly type: 'copyFileName'; readonly itemIds: readonly string[] }
  | { readonly type: 'copyFullPath'; readonly itemIds: readonly string[] }
  | { readonly type: 'worktree'; readonly itemId: string }
  | { readonly type: 'revert'; readonly itemId: string };

export class CompareResultsViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private state: CompareResultsState = { kind: 'empty' };
  private view: vscode.WebviewView | undefined;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private isVisible: boolean | undefined;

  async initialize(): Promise<void> {
    await this.updateVisibility(false);
  }

  dispose(): void {
    this.disposeViewDisposables();
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.disposeViewDisposables();
    this.view = view;
    view.webview.options = {
      enableScripts: true
    };
    view.webview.html = renderCompareResultsWebviewHtml();
    this.viewDisposables.push(
      view.onDidDispose(() => {
        if (this.view === view) {
          this.view = undefined;
        }
        this.disposeViewDisposables();
      }),
      view.webview.onDidReceiveMessage(async (message: CompareResultsWebviewMessage) => {
        await this.handleMessage(message);
      })
    );
    this.postState();
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
    await this.updateVisibility(true);
    this.refresh();
    await this.focus();
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
    await this.updateVisibility(true);
    this.refresh();
    await this.focus();
  }

  async hide(): Promise<void> {
    this.state = { kind: 'empty' };
    this.refresh();
    await this.updateVisibility(false);
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
    if (!item.worktreeRef) {
      return;
    }

    await openChangeDiffWithWorktree(item.repository, item.change, item.worktreeRef);
  }

  async revertToItem(item: CompareResultItem): Promise<void> {
    if (!item.worktreeRef) {
      return;
    }

    const confirmation = await vscode.window.showWarningMessage(
      `Restore ${item.label} in the worktree to match ${item.worktreeLabel ?? item.worktreeRef}?`,
      { modal: true },
      'Revert to This'
    );
    if (confirmation !== 'Revert to This') {
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
    if (!this.view) {
      return;
    }

    void this.view.webview.postMessage({
      type: 'state',
      state: this.createWebviewState()
    });
  }

  private createWebviewState(): CompareResultsWebviewState {
    if (this.state.kind === 'empty') {
      return {
        kind: 'empty',
        summary: '',
        emptyMessage: buildCompareResultsMessage(this.state),
        items: []
      };
    }

    return {
      kind: 'results',
      summary: buildCompareResultsMessage(this.state),
      items: this.getItems().map((item) => this.toWebviewItem(item))
    };
  }

  private toWebviewItem(item: CompareResultItem): CompareResultsWebviewItem {
    return {
      id: item.id,
      path: item.label,
      fullPath: item.change.renameUri?.fsPath ?? item.change.uri.fsPath,
      status: item.detail,
      leftRef: item.leftRef,
      rightRef: item.rightRef,
      worktreeRef: item.worktreeRef,
      worktreeLabel: item.worktreeLabel
    };
  }

  private getItems(): CompareResultItem[] {
    switch (this.state.kind) {
      case 'empty':
        return [];
      case 'between':
        return buildCompareResultItems(
          this.state.repository,
          this.state.changes,
          this.state.left.refName,
          this.state.right.refName,
          undefined,
          undefined
        );
      case 'worktree':
        return buildCompareResultItems(
          this.state.repository,
          this.state.changes,
          undefined,
          undefined,
          this.state.target.refName,
          this.state.target.label
        );
    }
  }

  private async focus(): Promise<void> {
    await vscode.commands.executeCommand(`${COMPARE_RESULTS_VIEW_ID}.focus`);
  }

  private async handleMessage(message: CompareResultsWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.postState();
        return;
      case 'base':
        {
          const item = this.findItem(message.itemId);
          if (item) {
            await this.compareWithBase(item);
          }
        }
        return;
      case 'copyFileName':
        {
          const items = this.findItems(message.itemIds);
          if (items.length > 0) {
            await vscode.env.clipboard.writeText(
              items.map((item) => path.basename(item.change.renameUri?.fsPath ?? item.change.uri.fsPath)).join('\n')
            );
          }
        }
        return;
      case 'copyFullPath':
        {
          const items = this.findItems(message.itemIds);
          if (items.length > 0) {
            await vscode.env.clipboard.writeText(
              items.map((item) => item.change.renameUri?.fsPath ?? item.change.uri.fsPath).join('\n')
            );
          }
        }
        return;
      case 'worktree':
        {
          const item = this.findItem(message.itemId);
          if (item) {
            await this.compareWithWorktree(item);
          }
        }
        return;
      case 'revert':
        {
          const item = this.findItem(message.itemId);
          if (item) {
            await this.revertToItem(item);
          }
        }
        return;
    }
  }

  private findItem(itemId: string): CompareResultItem | undefined {
    return this.getItems().find((item) => item.id === itemId);
  }

  private findItems(itemIds: readonly string[]): CompareResultItem[] {
    const selectedIds = new Set(itemIds);
    return this.getItems().filter((item) => selectedIds.has(item.id));
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
      await this.updateVisibility(false);
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

  private disposeViewDisposables(): void {
    while (this.viewDisposables.length > 0) {
      this.viewDisposables.pop()?.dispose();
    }
  }

  private async updateVisibility(visible: boolean): Promise<void> {
    if (this.isVisible === visible) {
      return;
    }

    this.isVisible = visible;
    await vscode.commands.executeCommand('setContext', COMPARE_RESULTS_VISIBLE_CONTEXT, visible);
  }
}

import * as vscode from 'vscode';

import { getTargetUri } from './changePresentation';
import { toOperationError } from './errorDetail';
import type { Change, Repository } from './git';
import {
  applyCompareResultsWorktreeRefresh,
  buildCompareResultItems,
  buildCompareResultsMessage,
  CompareResultItem,
  CompareResultsState,
  getCompareResultContextValue,
  shouldOpenCompareResultOnClick
} from './compareResultsShared';
import type { RefSelection } from './refActions';
import {
  openChangeDiffBetweenRefs,
  openChangeDiffWithWorktree,
  restoreWorktreeChangeFromRef
} from './workbenchRefActionServices';

export const COMPARE_RESULTS_VIEW_ID = 'gitRefs.compareResultsView';

export class CompareResultsViewProvider implements vscode.TreeDataProvider<CompareResultItem>, vscode.Disposable {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<CompareResultItem | undefined | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private state: CompareResultsState = { kind: 'empty' };
  private view: vscode.TreeView<CompareResultItem> | undefined;

  attachView(view: vscode.TreeView<CompareResultItem>): void {
    this.view = view;
    this.syncViewState();
  }

  dispose(): void {
    this.onDidChangeTreeDataEmitter.dispose();
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
    this.refresh();
    await this.focus();
  }

  async clear(): Promise<void> {
    this.state = { kind: 'empty' };
    this.refresh();
  }

  getTreeItem(element: CompareResultItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    treeItem.description = element.detail;
    treeItem.tooltip = `${element.description}\n${element.detail}`;
    treeItem.resourceUri = getTargetUri(element.change);
    if (shouldOpenCompareResultOnClick(element)) {
      treeItem.command = {
        command: 'gitRefs.openCompareResult',
        title: 'Open Compare Result',
        arguments: [element]
      };
    }
    treeItem.contextValue = getCompareResultContextValue(element);
    return treeItem;
  }

  getChildren(element?: CompareResultItem): CompareResultItem[] {
    if (element) {
      return [];
    }

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
    this.syncViewState();
    this.onDidChangeTreeDataEmitter.fire();
  }

  private syncViewState(): void {
    if (!this.view) {
      return;
    }

    this.view.message = buildCompareResultsMessage(this.state);
  }

  private async focus(): Promise<void> {
    await vscode.commands.executeCommand(`${COMPARE_RESULTS_VIEW_ID}.focus`);
  }

  private async refreshWorktreeComparison(repository: Repository, refName: string): Promise<void> {
    const changes = await repository.diffWith(refName);
    const outcome = applyCompareResultsWorktreeRefresh(this.state, repository, refName, changes);
    if (!outcome) {
      return;
    }

    this.state = outcome.nextState;
    this.refresh();

    if (outcome.infoMessage) {
      void vscode.window.showInformationMessage(outcome.infoMessage);
    }
  }
}

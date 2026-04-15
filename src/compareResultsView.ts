import * as vscode from 'vscode';

import { getRepositoryRelativeChangePath, getStatusLabel, getTargetUri } from './changePresentation';
import { Change, Repository } from './git';
import { RefSelection } from './refActions';
import { openChangeDiffBetweenRefs, openChangeDiffWithWorktree } from './workbenchRefActionServices';

export const COMPARE_RESULTS_VIEW_ID = 'gitRefs.compareResultsView';

type CompareResultsState =
  | {
    readonly kind: 'empty';
  }
  | {
    readonly kind: 'between';
    readonly repository: Repository;
    readonly left: RefSelection;
    readonly right: RefSelection;
    readonly changes: readonly Change[];
  }
  | {
    readonly kind: 'worktree';
    readonly repository: Repository;
    readonly target: RefSelection;
    readonly changes: readonly Change[];
  };

type CompareResultItem = {
  readonly repository: Repository;
  readonly change: Change;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
  readonly leftRef: string | undefined;
  readonly rightRef: string | undefined;
  readonly worktreeRef: string | undefined;
};

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
    treeItem.command = {
      command: 'gitRefs.openCompareResult',
      title: 'Open Compare Result',
      arguments: [element]
    };
    treeItem.contextValue = 'compare-result-file';
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
          undefined
        );
      case 'worktree':
        return buildCompareResultItems(
          this.state.repository,
          this.state.changes,
          undefined,
          undefined,
          this.state.target.refName
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
}

function buildCompareResultItems(
  repository: Repository,
  changes: readonly Change[],
  leftRef: string | undefined,
  rightRef: string | undefined,
  worktreeRef: string | undefined
): CompareResultItem[] {
  return [...changes]
    .map<CompareResultItem>((change) => {
      const relativePath = getRepositoryRelativeChangePath(repository.rootUri.fsPath, change);
      return {
        repository,
        change,
        label: relativePath,
        description: relativePath,
        detail: getStatusLabel(change.status),
        leftRef,
        rightRef,
        worktreeRef
      };
    })
    .sort((left, right) => left.description.localeCompare(right.description));
}

function buildCompareResultsMessage(state: CompareResultsState): string {
  switch (state.kind) {
    case 'empty':
      return 'Run a compare from the revision graph or Command Palette to keep the changed files here.';
    case 'between':
      return `${state.left.label} <-> ${state.right.label} • ${formatFileCount(state.changes.length)}`;
    case 'worktree':
      return `${state.target.label} <-> worktree • ${formatFileCount(state.changes.length)}`;
  }
}

function formatFileCount(count: number): string {
  return count === 1 ? '1 file changed' : `${count} files changed`;
}

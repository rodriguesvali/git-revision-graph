import * as vscode from 'vscode';

import { API } from './git';
import { RefNode } from './refNodes';
import { getCategoryChildren, getRemoteChildren, getRepositoryChildren, getRootNodes } from './refTreeData';
import {
  getReferenceDescription,
  getReferenceIcon,
  getReferenceShortLabel,
  getReferenceTooltip
} from './refPresentation';

export class GitRefsTreeDataProvider implements vscode.TreeDataProvider<RefNode>, vscode.Disposable {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<RefNode | undefined>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private readonly git: API,
    private readonly onStateChanged: () => void
  ) {
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.handleStateChange();
      }),
      git.onDidCloseRepository((repository) => {
        this.detachRepository(repository);
        this.handleStateChange();
      })
    );
  }

  dispose(): void {
    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.onDidChangeTreeDataEmitter.dispose();
  }

  refresh(node?: RefNode): void {
    this.onDidChangeTreeDataEmitter.fire(node);
  }

  getTreeItem(node: RefNode): vscode.TreeItem {
    switch (node.kind) {
      case 'repository': {
        const item = new vscode.TreeItem(
          vscode.workspace.asRelativePath(node.repository.rootUri, false),
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.contextValue = 'git-repository';
        item.iconPath = new vscode.ThemeIcon('repo');
        item.tooltip = node.repository.rootUri.fsPath;
        return item;
      }
      case 'category': {
        const label = node.category === 'branches' ? 'Branches' : node.category === 'tags' ? 'Tags' : 'Remotes';
        const icon = node.category === 'branches' ? 'git-branch' : node.category === 'tags' ? 'tag' : 'cloud';
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Expanded);
        item.contextValue = `git-category-${node.category}`;
        item.iconPath = new vscode.ThemeIcon(icon);
        return item;
      }
      case 'remote': {
        const item = new vscode.TreeItem(node.remote, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'git-remote-group';
        item.iconPath = new vscode.ThemeIcon('cloud');
        return item;
      }
      case 'ref': {
        const item = new vscode.TreeItem(
          getReferenceShortLabel(node.ref),
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'git-ref';
        item.description = getReferenceDescription(node.repository, node.ref);
        item.tooltip = getReferenceTooltip(node.repository, node.ref);
        item.iconPath = new vscode.ThemeIcon(getReferenceIcon(node.ref));
        item.command = {
          command: 'gitRefs.compareWithWorktree',
          title: 'Compare With Worktree',
          arguments: [node]
        };
        return item;
      }
    }
  }

  async getChildren(node?: RefNode): Promise<RefNode[]> {
    if (!node) {
      return getRootNodes(this.git);
    }

    if (node.kind === 'repository') {
      return getRepositoryChildren(node.repository);
    }

    if (node.kind === 'category') {
      return getCategoryChildren(node.repository, node.category);
    }

    if (node.kind === 'remote') {
      return getRemoteChildren(node.repository, node.remote);
    }

    return [];
  }

  private attachToRepositories(repositories: readonly API['repositories'][number][]): void {
    for (const repository of repositories) {
      this.attachRepository(repository);
    }
  }

  private attachRepository(repository: API['repositories'][number]): void {
    const key = repository.rootUri.toString();
    if (this.repoSubscriptions.has(key)) {
      return;
    }

    this.repoSubscriptions.set(
      key,
      vscode.Disposable.from(
        repository.state.onDidChange(() => this.handleStateChange()),
        repository.onDidCheckout(() => this.handleStateChange())
      )
    );
  }

  private detachRepository(repository: API['repositories'][number]): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private handleStateChange(): void {
    this.refresh();
    this.onStateChanged();
  }
}

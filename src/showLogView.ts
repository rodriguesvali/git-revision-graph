import * as vscode from 'vscode';
import * as path from 'node:path';

import { toOperationError } from './errorDetail';
import type { Change, Repository } from './git';
import { openChangeDiffBetweenRefs, openChangeDiffWithWorktree } from './workbenchRefActionServices';
import type { RevisionGraphBackend, ShowLogBackend } from './revisionGraph/backend';
import { openCommitDetails as openRevisionCommitDetails } from './revisionGraph/repository/log';
import type { RevisionLogSource } from './revisionGraphTypes';
import { SHOW_LOG_VIEW_ID } from './revisionGraphTypes';
import {
  buildShowLogWebviewState,
  createHiddenShowLogState,
  ShowLogState
} from './showLogShared';
import { renderShowLogWebviewHtml } from './showLogWebview';
import { validateShowLogWebviewMessage } from './showLog/messageValidation';

export const SHOW_LOG_VISIBLE_CONTEXT = 'gitRefs.showLogVisible';
const SHOW_LOG_PAGE_SIZE = 50;
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export interface ShowLogPresenter {
  showSource(repository: Repository, source: RevisionLogSource): Promise<void>;
}

export class ShowLogViewProvider implements vscode.WebviewViewProvider, vscode.Disposable, ShowLogPresenter {
  private state: ShowLogState = createHiddenShowLogState();
  private view: vscode.WebviewView | undefined;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private isVisible: boolean | undefined;
  private loadRequestId = 0;
  private expandRequestId = 0;

  constructor(private readonly backend: RevisionGraphBackend & ShowLogBackend) {}

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
    view.webview.html = renderShowLogWebviewHtml();
    this.viewDisposables.push(
      view.onDidDispose(() => {
        if (this.view === view) {
          this.view = undefined;
        }
        this.disposeViewDisposables();
      }),
      view.webview.onDidReceiveMessage(async (message: unknown) => {
        await this.handleMessage(message);
      })
    );
    this.postState();
  }

  async showSource(repository: Repository, source: RevisionLogSource): Promise<void> {
    const requestId = ++this.loadRequestId;
    this.state = {
      kind: 'visible',
      repository,
      source,
      showAllBranches: source.kind === 'range',
      entries: [],
      hasMore: false,
      loading: true,
      loadingMore: false,
      errorMessage: undefined,
      expandedCommitHash: undefined,
      loadingCommitHash: undefined,
      expandedCommitError: undefined,
      cachedChanges: {}
    };
    await this.updateVisibility(true);
    this.postState();
    await this.focus();

    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        0,
        this.state.showAllBranches
      );
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        entries: [...result.entries],
        hasMore: result.hasMore
      };
      this.postState();
    } catch (error) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        errorMessage: toOperationError('Could not load the selected log.', error)
      };
      this.postState();
    }
  }

  async hide(): Promise<void> {
    this.loadRequestId += 1;
    this.expandRequestId += 1;
    this.state = createHiddenShowLogState();
    this.postState();
    await this.updateVisibility(false);
  }

  private async handleMessage(rawMessage: unknown): Promise<void> {
    const message = validateShowLogWebviewMessage(rawMessage);
    if (!message) {
      return;
    }

    switch (message.type) {
      case 'ready':
        this.postState();
        return;
      case 'toggleCommit':
        await this.toggleCommit(message.commitHash);
        return;
      case 'toggleShowAllBranches':
        await this.toggleShowAllBranches(message.value);
        return;
      case 'loadMore':
        await this.loadMore();
        return;
      case 'openFile':
        await this.openFileChange(message.commitHash, message.changeId);
        return;
      case 'compareWithWorktree':
        await this.compareFileChangeWithWorktree(message.commitHash, message.changeId);
        return;
      case 'copyFileName':
        await this.copyFileName(message.commitHash, message.changeId);
        return;
      case 'copyFullPath':
        await this.copyFullPath(message.commitHash, message.changeId);
        return;
      case 'openCommitDetails':
        await this.openCommitDetails(message.commitHash);
        return;
    }
  }

  private async toggleCommit(commitHash: string): Promise<void> {
    if (this.state.kind !== 'visible') {
      return;
    }

    if (!this.isLoadedCommitHash(commitHash)) {
      return;
    }

    if (this.state.expandedCommitHash === commitHash) {
      this.state = {
        ...this.state,
        expandedCommitHash: undefined,
        loadingCommitHash: undefined,
        expandedCommitError: undefined
      };
      this.postState();
      return;
    }

    this.state = {
      ...this.state,
      expandedCommitHash: commitHash,
      loadingCommitHash: undefined,
      expandedCommitError: undefined
    };
    this.postState();

    if (this.state.cachedChanges[commitHash]) {
      return;
    }

    const entry = this.state.entries.find((item) => item.hash === commitHash);
    const repository = this.state.repository;
    if (!entry || !repository) {
      return;
    }

    const requestId = ++this.expandRequestId;
    this.state = {
      ...this.state,
      loadingCommitHash: commitHash,
      expandedCommitError: undefined
    };
    this.postState();

    try {
      const changes = await this.backend.loadRevisionLogChanges(
        repository,
        commitHash,
        entry.parentHashes[0]
      );
      if (requestId !== this.expandRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loadingCommitHash: undefined,
        cachedChanges: {
          ...this.state.cachedChanges,
          [commitHash]: [...changes]
        }
      };
      this.postState();
    } catch (error) {
      if (requestId !== this.expandRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loadingCommitHash: undefined,
        expandedCommitError: toOperationError('Could not load the changed files for this commit.', error)
      };
      this.postState();
    }
  }

  private async toggleShowAllBranches(value: boolean): Promise<void> {
    if (this.state.kind !== 'visible' || this.state.source?.kind !== 'target' || this.state.loading || this.state.loadingMore) {
      return;
    }

    if (this.state.showAllBranches === value) {
      return;
    }

    const repository = this.state.repository;
    const source = this.state.source;
    if (!repository || !source) {
      return;
    }

    const requestId = ++this.loadRequestId;
    this.expandRequestId += 1;
    this.state = {
      ...this.state,
      showAllBranches: value,
      loading: true,
      loadingMore: false,
      errorMessage: undefined,
      entries: [],
      hasMore: false,
      expandedCommitHash: undefined,
      loadingCommitHash: undefined,
      expandedCommitError: undefined,
      cachedChanges: {}
    };
    this.postState();

    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        0,
        value
      );
      if (requestId !== this.loadRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        entries: [...result.entries],
        hasMore: result.hasMore
      };
      this.postState();
    } catch (error) {
      if (requestId !== this.loadRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        errorMessage: toOperationError('Could not update the log scope.', error)
      };
      this.postState();
    }
  }

  private async loadMore(): Promise<void> {
    if (this.state.kind !== 'visible' || this.state.loading || this.state.loadingMore || !this.state.repository || !this.state.source || !this.state.hasMore) {
      return;
    }

    const repository = this.state.repository;
    const source = this.state.source;
    const skip = this.state.entries.length;
    const requestId = ++this.loadRequestId;
    this.state = {
      ...this.state,
      loadingMore: true,
      errorMessage: undefined
    };
    this.postState();

    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        skip,
        this.state.showAllBranches
      );
      if (requestId !== this.loadRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loadingMore: false,
        entries: [...this.state.entries, ...result.entries],
        hasMore: result.hasMore
      };
      this.postState();
    } catch (error) {
      if (requestId !== this.loadRequestId || this.state.kind !== 'visible') {
        return;
      }

      this.state = {
        ...this.state,
        loadingMore: false,
        errorMessage: toOperationError('Could not load more commits.', error)
      };
      this.postState();
    }
  }

  private async openFileChange(commitHash: string, changeId: string): Promise<void> {
    const change = this.findChange(commitHash, changeId);
    if (!change) {
      return;
    }

    const repository = this.state.kind === 'visible' ? this.state.repository : undefined;
    if (!repository) {
      return;
    }

    const entry = this.state.entries.find((item) => item.hash === commitHash);
    const parentHash = entry?.parentHashes[0] ?? EMPTY_TREE_HASH;
    await openChangeDiffBetweenRefs(repository, change, parentHash, commitHash);
  }

  private async compareFileChangeWithWorktree(commitHash: string, changeId: string): Promise<void> {
    const change = this.findChange(commitHash, changeId);
    if (!change) {
      return;
    }

    const repository = this.state.kind === 'visible' ? this.state.repository : undefined;
    if (!repository) {
      return;
    }

    await openChangeDiffWithWorktree(repository, change, commitHash);
  }

  private async copyFileName(commitHash: string, changeId: string): Promise<void> {
    const change = this.findChange(commitHash, changeId);
    if (!change) {
      return;
    }

    await vscode.env.clipboard.writeText(
      path.basename(change.renameUri?.fsPath ?? change.uri.fsPath)
    );
  }

  private async copyFullPath(commitHash: string, changeId: string): Promise<void> {
    const change = this.findChange(commitHash, changeId);
    if (!change) {
      return;
    }

    await vscode.env.clipboard.writeText(change.renameUri?.fsPath ?? change.uri.fsPath);
  }

  private findChange(commitHash: string, changeId: string): Change | undefined {
    const repository = this.state.kind === 'visible' ? this.state.repository : undefined;
    if (!repository) {
      return undefined;
    }

    if (!this.isLoadedCommitHash(commitHash)) {
      return undefined;
    }

    const match = /^.+:(\d+)$/.exec(changeId);
    const index = match ? Number(match[1]) : -1;
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }

    const changes = this.state.cachedChanges[commitHash];
    const change = changes?.[index];
    if (!change) {
      return undefined;
    }

    return change;
  }

  private async openCommitDetails(commitHash: string): Promise<void> {
    const repository = this.state.kind === 'visible' ? this.state.repository : undefined;
    if (!repository) {
      return;
    }

    if (!this.isLoadedCommitHash(commitHash)) {
      return;
    }

    await openRevisionCommitDetails(repository, commitHash, this.backend);
  }

  private isLoadedCommitHash(commitHash: string): boolean {
    return this.state.kind === 'visible' && this.state.entries.some((entry) => entry.hash === commitHash);
  }

  private postState(): void {
    if (!this.view) {
      return;
    }

    void this.view.webview.postMessage({
      type: 'state',
      state: buildShowLogWebviewState(this.state)
    });
  }

  private async focus(): Promise<void> {
    await vscode.commands.executeCommand(`${SHOW_LOG_VIEW_ID}.focus`);
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
    await vscode.commands.executeCommand('setContext', SHOW_LOG_VISIBLE_CONTEXT, visible);
  }
}

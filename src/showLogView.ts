import * as vscode from 'vscode';
import * as path from 'node:path';

import { toOperationError } from './errorDetail';
import type { Change, Repository } from './git';
import { openChangeDiffBetweenRefs, openChangeDiffWithWorktree } from './workbenchRefActionServices';
import type { RevisionGraphDocumentBackend, RevisionGraphLogBackend, ShowLogBackend } from './revisionGraph/backend';
import { openCommitDetails as openRevisionCommitDetails } from './revisionGraph/repository/log';
import {
  resetCurrentBranchToCommit,
  type CompareResultsPresenter,
  type RefActionServices
} from './refActions';
import type { RevisionLogSource } from './revisionGraphTypes';
import { SHOW_LOG_VIEW_ID } from './revisionGraphTypes';
import { compareLoadedShowLogCommits, compareLoadedShowLogCommitWithWorktree } from './showLog/commitCompare';
import {
  dispatchShowLogWebviewMessage,
  type ShowLogMessageHandlers
} from './showLog/messageHandler';
import {
  isAbortError,
  ShowLogLoadRequests
} from './showLog/loadRequests';
import { buildGitHubCommitUrl } from './showLog/remoteCommitUrl';
import { buildShowLogWebviewState } from './showLog/viewState';
import {
  addShowLogCachedChanges,
  createHiddenShowLogState,
  ShowLogState
} from './showLogShared';
import { renderShowLogWebviewHtml } from './showLogWebview';

const SHOW_LOG_PAGE_SIZE = 50;
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export interface ShowLogPresenter {
  showSource(repository: Repository, source: RevisionLogSource): Promise<void>;
}

export class ShowLogViewProvider implements vscode.Disposable, ShowLogPresenter {
  private state: ShowLogState = createHiddenShowLogState();
  private panel: vscode.WebviewPanel | undefined;
  private readonly panelDisposables: vscode.Disposable[] = [];
  private expandRequestId = 0;
  private sourceTokenSeed = 0;
  private readonly logLoadRequests = new ShowLogLoadRequests();
  private readonly messageHandlers: ShowLogMessageHandlers = {
    ready: () => {
      this.postState();
    },
    toggleCommit: (commitHash) => this.toggleCommit(commitHash),
    toggleShowAllBranches: (value) => this.toggleShowAllBranches(value),
    setFilterText: (value, sourceToken) => this.setFilterText(value, sourceToken),
    loadMore: () => this.loadMore(),
    openFile: (commitHash, changeId) => this.openFileChange(commitHash, changeId),
    compareWithWorktree: (commitHash, changeId) => this.compareFileChangeWithWorktree(commitHash, changeId),
    copyFileName: (commitHash, changeId) => this.copyFileName(commitHash, changeId),
    copyFullPath: (commitHash, changeId) => this.copyFullPath(commitHash, changeId),
    copyCommitHash: (commitHash) => this.copyCommitHash(commitHash),
    openCommitOnGitHub: (commitHash) => this.openCommitOnGitHub(commitHash),
    openCommitDetails: (commitHash) => this.openCommitDetails(commitHash),
    compareCommits: (baseCommitHash, compareCommitHash) => this.compareCommits(baseCommitHash, compareCommitHash),
    compareCommitWithWorktree: (commitHash) => this.compareCommitWithWorktree(commitHash),
    resetToCommit: (commitHash) => this.resetToCommit(commitHash)
  };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backend: RevisionGraphLogBackend & RevisionGraphDocumentBackend & ShowLogBackend,
    private readonly compareResultsPresenter: CompareResultsPresenter,
    private readonly getRefActionServices: () => RefActionServices | undefined = () => undefined
  ) {}

  dispose(): void {
    this.logLoadRequests.cancelActive();
    this.disposePanel();
  }

  async showSource(repository: Repository, source: RevisionLogSource): Promise<void> {
    const request = this.logLoadRequests.start();
    this.state = {
      kind: 'visible',
      sourceToken: this.createSourceToken(),
      repository,
      source,
      showAllBranches: source.kind === 'range',
      filterText: '',
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
    this.revealPanel();
    this.postState();
    if (!this.logLoadRequests.isCurrent(request)) {
      return;
    }

    const activeRequest = this.logLoadRequests.activate(request);
    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        0,
        this.state.showAllBranches,
        this.state.filterText,
        activeRequest.signal
      );
      if (!this.logLoadRequests.isCurrent(activeRequest)) {
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
      if (!this.logLoadRequests.isCurrent(activeRequest)) {
        return;
      }
      if (isAbortError(error)) {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        errorMessage: toOperationError('Could not load the selected log.', error)
      };
      this.postState();
    } finally {
      this.logLoadRequests.finish(activeRequest);
    }
  }

  async hideWithRevisionGraph(): Promise<void> {
    this.logLoadRequests.invalidateAndCancel();
    this.expandRequestId += 1;
    this.state = createHiddenShowLogState();
    this.postState();
    this.disposePanel();
  }

  private async handleMessage(rawMessage: unknown): Promise<void> {
    await dispatchShowLogWebviewMessage(rawMessage, this.messageHandlers);
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

    const cachedChanges = this.state.cachedChanges[commitHash];
    if (cachedChanges) {
      this.state = {
        ...this.state,
        cachedChanges: addShowLogCachedChanges(this.state.cachedChanges, commitHash, cachedChanges)
      };
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
        cachedChanges: addShowLogCachedChanges(this.state.cachedChanges, commitHash, changes)
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

    const request = this.logLoadRequests.start();
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

    const activeRequest = this.logLoadRequests.activate(request);
    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        0,
        value,
        this.state.filterText,
        activeRequest.signal
      );
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
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
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
        return;
      }
      if (isAbortError(error)) {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        errorMessage: toOperationError('Could not update the log scope.', error)
      };
      this.postState();
    } finally {
      this.logLoadRequests.finish(activeRequest);
    }
  }

  private async setFilterText(value: string, sourceToken: string): Promise<void> {
    if (this.state.kind !== 'visible') {
      return;
    }

    if (this.state.sourceToken !== sourceToken) {
      return;
    }

    const filterText = value.trim();
    if (this.state.filterText === filterText) {
      return;
    }

    const repository = this.state.repository;
    const source = this.state.source;
    if (!repository || !source) {
      return;
    }

    const request = this.logLoadRequests.start();
    this.expandRequestId += 1;
    this.state = {
      ...this.state,
      filterText,
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

    const activeRequest = this.logLoadRequests.activate(request);
    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        0,
        this.state.showAllBranches,
        filterText,
        activeRequest.signal
      );
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
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
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
        return;
      }
      if (isAbortError(error)) {
        return;
      }

      this.state = {
        ...this.state,
        loading: false,
        errorMessage: toOperationError('Could not filter the selected log.', error)
      };
      this.postState();
    } finally {
      this.logLoadRequests.finish(activeRequest);
    }
  }

  private async loadMore(): Promise<void> {
    if (this.state.kind !== 'visible' || this.state.loading || this.state.loadingMore || !this.state.repository || !this.state.source || !this.state.hasMore) {
      return;
    }

    const repository = this.state.repository;
    const source = this.state.source;
    const skip = this.state.entries.length;
    const request = this.logLoadRequests.start();
    this.state = {
      ...this.state,
      loadingMore: true,
      errorMessage: undefined
    };
    this.postState();

    const activeRequest = this.logLoadRequests.activate(request);
    try {
      const result = await this.backend.loadRevisionLog(
        repository,
        source,
        SHOW_LOG_PAGE_SIZE,
        skip,
        this.state.showAllBranches,
        this.state.filterText,
        activeRequest.signal
      );
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
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
      if (!this.logLoadRequests.isCurrent(activeRequest) || this.state.kind !== 'visible') {
        return;
      }
      if (isAbortError(error)) {
        return;
      }

      this.state = {
        ...this.state,
        loadingMore: false,
        errorMessage: toOperationError('Could not load more commits.', error)
      };
      this.postState();
    } finally {
      this.logLoadRequests.finish(activeRequest);
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

  private async copyCommitHash(commitHash: string): Promise<void> {
    if (!this.isLoadedCommitHash(commitHash)) {
      return;
    }

    await vscode.env.clipboard.writeText(commitHash);
  }

  private async openCommitOnGitHub(commitHash: string): Promise<void> {
    const repository = this.state.kind === 'visible' ? this.state.repository : undefined;
    if (!repository || !this.isLoadedCommitHash(commitHash)) {
      return;
    }

    const url = buildGitHubCommitUrl(repository, commitHash);
    if (!url) {
      await vscode.window.showInformationMessage('No GitHub remote is configured for this repository.');
      return;
    }

    await vscode.env.openExternal(vscode.Uri.parse(url));
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

  private async compareCommits(baseCommitHash: string, compareCommitHash: string): Promise<void> {
    if (this.state.kind !== 'visible' || !this.state.repository) {
      return;
    }

    await compareLoadedShowLogCommits(
      this.state.repository,
      this.state.entries,
      baseCommitHash,
      compareCommitHash,
      this.compareResultsPresenter,
      {
        showInformationMessage(message) {
          void vscode.window.showInformationMessage(message);
        },
        async showErrorMessage(message) {
          await vscode.window.showErrorMessage(message);
        }
      }
    );
  }

  private async compareCommitWithWorktree(commitHash: string): Promise<void> {
    if (this.state.kind !== 'visible' || !this.state.repository) {
      return;
    }

    await compareLoadedShowLogCommitWithWorktree(
      this.state.repository,
      this.state.entries,
      commitHash,
      this.compareResultsPresenter,
      {
        showInformationMessage(message) {
          void vscode.window.showInformationMessage(message);
        },
        async showErrorMessage(message) {
          await vscode.window.showErrorMessage(message);
        }
      }
    );
  }

  private async resetToCommit(commitHash: string): Promise<void> {
    if (this.state.kind !== 'visible' || !this.state.repository) {
      return;
    }

    const entry = this.state.entries.find((item) => item.hash === commitHash);
    if (!entry) {
      return;
    }

    const services = this.getRefActionServices();
    if (!services) {
      await vscode.window.showErrorMessage('Could not reset the branch because Git actions are not ready yet.');
      return;
    }

    const commitLabel = entry.shortHash || commitHash.slice(0, 8);
    await resetCurrentBranchToCommit(
      this.state.repository,
      commitHash,
      commitLabel,
      services
    );
  }

  private isLoadedCommitHash(commitHash: string): boolean {
    return this.state.kind === 'visible' && this.state.entries.some((entry) => entry.hash === commitHash);
  }

  private postState(): void {
    if (!this.panel) {
      return;
    }

    void this.panel.webview.postMessage({
      type: 'state',
      state: buildShowLogWebviewState(this.state)
    });
  }

  private createSourceToken(): string {
    this.sourceTokenSeed += 1;
    return String(this.sourceTokenSeed);
  }

  private revealPanel(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SHOW_LOG_VIEW_ID,
      'Show Log',
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
    panel.webview.html = renderShowLogWebviewHtml();
    this.panel = panel;
    this.panelDisposables.push(
      panel.onDidDispose(() => {
        if (this.panel === panel) {
          this.panel = undefined;
          this.logLoadRequests.invalidateAndCancel();
          this.expandRequestId += 1;
          this.state = createHiddenShowLogState();
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

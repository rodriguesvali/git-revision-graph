import * as vscode from 'vscode';

import { CompareResultsPresenter } from './refActions';
import { API } from './git';
import { createRevisionGraphBackend, RevisionGraphBackend } from './revisionGraph/backend';
import { RevisionGraphController } from './revisionGraph/controller';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE, REVISION_GRAPH_VIEW_ID } from './revisionGraphTypes';
import { ShowLogPresenter } from './showLogView';
import { createRetainedScriptWebviewPanelOptions } from './webviewOptions';
import { RepositoryMutationCoordinator } from './repositoryMutationCoordinator';

export class RevisionGraphViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly controller: RevisionGraphController;

  constructor(
    git: API,
    compareResultsPresenter: CompareResultsPresenter,
    showLogPresenter: ShowLogPresenter,
    backend: RevisionGraphBackend = createRevisionGraphBackend(),
    viewId: string = REVISION_GRAPH_VIEW_ID,
    clearLayoutCache: () => PromiseLike<void> | void = () => undefined,
    mutationCoordinator?: RepositoryMutationCoordinator
  ) {
    this.controller = new RevisionGraphController(
      git,
      backend,
      compareResultsPresenter,
      showLogPresenter,
      viewId,
      undefined,
      clearLayoutCache,
      mutationCoordinator
    );
  }

  dispose(): void {
    this.controller.dispose();
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    await this.controller.resolveWebviewView(view);
  }

  async open(): Promise<void> {
    await this.controller.open();
  }

  async chooseRepository(): Promise<void> {
    await this.controller.chooseRepository();
  }

  async fetchCurrentRepository(): Promise<void> {
    await this.controller.fetchCurrentRepository();
  }

  async refresh(request?: RevisionGraphRefreshRequestLike): Promise<void> {
    await this.controller.refresh(request);
  }

  prepareRefresh(request?: RevisionGraphRefreshRequestLike) {
    return this.controller.prepareRefresh(request);
  }
}

export class RevisionGraphEditorPanel implements vscode.Disposable {
  private readonly controller: RevisionGraphController;
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    git: API,
    compareResultsPresenter: CompareResultsPresenter,
    showLogPresenter: ShowLogPresenter,
    private readonly closeDependentViews: () => Promise<void> | void = () => undefined,
    backend: RevisionGraphBackend = createRevisionGraphBackend(),
    clearLayoutCache: () => PromiseLike<void> | void = () => undefined,
    mutationCoordinator?: RepositoryMutationCoordinator
  ) {
    this.controller = new RevisionGraphController(
      git,
      backend,
      compareResultsPresenter,
      showLogPresenter,
      REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE,
      undefined,
      clearLayoutCache,
      mutationCoordinator
    );
  }

  dispose(): void {
    this.panel?.dispose();
    this.controller.dispose();
  }

  async open(options: RevisionGraphEditorPanelOpenOptions = {}): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      if (!options.preserveGraphState) {
        await this.controller.refresh();
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE,
      'Git Revision Graph',
      vscode.ViewColumn.One,
      createRetainedScriptWebviewPanelOptions()
    );
    panel.iconPath = {
      light: vscode.Uri.joinPath(this.extensionUri, 'media', 'icon-source-light.svg'),
      dark: vscode.Uri.joinPath(this.extensionUri, 'media', 'icon-source-dark.svg')
    };
    this.panel = panel;
    panel.onDidDispose(() => {
      if (this.panel === panel) {
        this.panel = undefined;
      }
      void this.closeDependentViews();
    });

    await this.controller.resolveWebviewPanel(panel);
  }

  async refresh(request?: RevisionGraphRefreshRequestLike): Promise<void> {
    await this.controller.refresh(request);
  }

  prepareRefresh(request?: RevisionGraphRefreshRequestLike) {
    return this.controller.prepareRefresh(request);
  }
}

export interface RevisionGraphEditorPanelOpenOptions {
  readonly preserveGraphState?: boolean;
}

export { REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE, REVISION_GRAPH_VIEW_ID };

import * as vscode from 'vscode';

import { CompareResultsPresenter } from './refActions';
import { API } from './git';
import { createRevisionGraphBackend, RevisionGraphBackend } from './revisionGraph/backend';
import { RevisionGraphController } from './revisionGraph/controller';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE } from './revisionGraphTypes';
import { ShowLogPresenter } from './showLogView';
import { createRetainedScriptWebviewPanelOptions } from './webviewOptions';
import { RepositoryMutationCoordinator } from './repositoryMutationCoordinator';
import type { FlowAiTextImprover } from './revisionGraph/flow/aiTextAssistant';

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
    mutationCoordinator?: RepositoryMutationCoordinator,
    flowAiTextImprover?: FlowAiTextImprover
  ) {
    this.controller = new RevisionGraphController(
      extensionUri,
      git,
      backend,
      compareResultsPresenter,
      showLogPresenter,
      REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE,
      undefined,
      clearLayoutCache,
      mutationCoordinator,
      flowAiTextImprover
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

export { REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE };

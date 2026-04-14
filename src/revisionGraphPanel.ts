import * as vscode from 'vscode';

import { CompareResultsPresenter } from './refActions';
import { API } from './git';
import { createRevisionGraphBackend, RevisionGraphBackend } from './revisionGraph/backend';
import { RevisionGraphController } from './revisionGraph/controller';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { REVISION_GRAPH_VIEW_ID } from './revisionGraphTypes';

export class RevisionGraphViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly controller: RevisionGraphController;

  constructor(
    git: API,
    compareResultsPresenter: CompareResultsPresenter,
    backend: RevisionGraphBackend = createRevisionGraphBackend()
  ) {
    this.controller = new RevisionGraphController(git, backend, compareResultsPresenter);
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

export { REVISION_GRAPH_VIEW_ID };

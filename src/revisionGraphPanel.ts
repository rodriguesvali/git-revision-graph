import * as vscode from 'vscode';

import { API } from './git';
import { createRevisionGraphBackend, RevisionGraphBackend } from './revisionGraph/backend';
import { RevisionGraphController } from './revisionGraph/controller';
import { RevisionGraphRefreshIntent } from './revisionGraphRefresh';
import { REVISION_GRAPH_VIEW_ID } from './revisionGraphTypes';

export class RevisionGraphViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly controller: RevisionGraphController;

  constructor(
    git: API,
    backend: RevisionGraphBackend = createRevisionGraphBackend()
  ) {
    this.controller = new RevisionGraphController(git, backend);
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

  async refresh(intent?: RevisionGraphRefreshIntent): Promise<void> {
    await this.controller.refresh(intent);
  }
}

export { REVISION_GRAPH_VIEW_ID };

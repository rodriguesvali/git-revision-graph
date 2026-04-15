import * as vscode from 'vscode';

import { COMPARE_RESULTS_VIEW_ID, CompareResultsViewProvider } from './compareResultsView';
import { RefCommandServices } from './refCommands';
import { API, GitExtension } from './git';
import { EMPTY_SCHEME, EmptyContentProvider, REF_SCHEME, RefContentProvider } from './refContentProvider';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference } from './refCommands';
import { RefNode } from './refNodes';
import { REVISION_GRAPH_VIEW_ID, RevisionGraphViewProvider } from './revisionGraphPanel';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { createWorkbenchRefActionServices } from './workbenchRefActionServices';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'GIT Revision Graph requires the built-in vscode.git extension to be active.'
    );
    return;
  }

  const compareResultsProvider = new CompareResultsViewProvider();
  const compareResultsView = vscode.window.createTreeView(COMPARE_RESULTS_VIEW_ID, {
    treeDataProvider: compareResultsProvider,
    showCollapseAll: false
  });
  compareResultsProvider.attachView(compareResultsView);

  const revisionGraphProvider = new RevisionGraphViewProvider(git, compareResultsProvider);
  const services = createCommandServices(revisionGraphProvider, compareResultsProvider);

  context.subscriptions.push(
    compareResultsProvider,
    compareResultsView,
    revisionGraphProvider,
    vscode.window.registerWebviewViewProvider(REVISION_GRAPH_VIEW_ID, revisionGraphProvider),
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, new EmptyContentProvider()),
    vscode.workspace.registerTextDocumentContentProvider(REF_SCHEME, new RefContentProvider(git)),
    vscode.commands.registerCommand('gitRefs.refresh', async () => {
      await revisionGraphProvider.refresh();
    }),
    vscode.commands.registerCommand('gitRefs.fetchCurrentRepository', async () => {
      await revisionGraphProvider.fetchCurrentRepository();
    }),
    vscode.commands.registerCommand('gitRefs.compareRefs', async (node?: RefNode) => {
      await compareRefs(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.compareWithWorktree', async (node?: RefNode) => {
      await compareWithWorktree(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.checkout', async (node?: RefNode) => {
      await checkoutReference(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.merge', async (node?: RefNode) => {
      await mergeReference(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraph', async () => {
      await revisionGraphProvider.open();
    }),
    vscode.commands.registerCommand('gitRefs.chooseRevisionGraphRepository', async () => {
      await revisionGraphProvider.chooseRepository();
    }),
    vscode.commands.registerCommand('gitRefs.openCompareResult', async (item) => {
      await compareResultsProvider.openItem(item);
    }),
    vscode.commands.registerCommand('gitRefs.compareResultCompareWithBase', async (item) => {
      await compareResultsProvider.compareWithBase(item);
    }),
    vscode.commands.registerCommand('gitRefs.compareResultCompareWithWorktree', async (item) => {
      await compareResultsProvider.compareWithWorktree(item);
    }),
    vscode.commands.registerCommand('gitRefs.compareResultRevertToThis', async (item) => {
      await compareResultsProvider.revertToItem(item);
    }),
    vscode.commands.registerCommand('gitRefs.clearCompareResults', async () => {
      await compareResultsProvider.clear();
    })
  );
}

export function deactivate(): void {}

async function getGitApi(): Promise<API | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  return gitExtension.getAPI(1);
}

function createCommandServices(
  revisionGraphProvider: RevisionGraphViewProvider,
  compareResultsProvider: CompareResultsViewProvider
): RefCommandServices {
  const baseServices = createWorkbenchRefActionServices(
    (request?: RevisionGraphRefreshRequestLike) => {
      void revisionGraphProvider.refresh(request);
    },
    (request?: RevisionGraphRefreshRequestLike) => {
      return revisionGraphProvider.prepareRefresh(request);
    },
    compareResultsProvider
  );

  return {
    ...baseServices,
    ui: {
      ...baseServices.ui,
      async pickRepository(items, placeHolder) {
        const picked = await vscode.window.showQuickPick(items, { placeHolder });
        return picked?.repository;
      },
      async pickReference(items, placeHolder) {
        return vscode.window.showQuickPick(items, { placeHolder });
      }
    }
  };
}

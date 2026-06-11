import * as vscode from 'vscode';

import { CompareResultsViewProvider } from './compareResultsView';
import { RefCommandServices } from './refCommands';
import { API, GitExtension } from './git';
import { configureGitExecutablePath } from './gitExec';
import { EMPTY_SCHEME, EmptyContentProvider, REF_SCHEME, RefContentProvider } from './refContentProvider';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference } from './refCommands';
import { RefNode } from './refNodes';
import { createRevisionGraphBackend } from './revisionGraph/backend';
import {
  onProjectedGraphLayoutCacheDidChange
} from './revisionGraph/layout/layeredLayout';
import { ProjectedGraphLayoutCachePersistence } from './revisionGraph/layout/cachePersistence';
import { RevisionGraphEditorPanel } from './revisionGraphPanel';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { ShowLogViewProvider } from './showLogView';
import { initializeRevisionGraphVisibility } from './viewLayout';
import { createWorkbenchRefActionServices } from './workbenchRefActionServices';

const GIT_EXTENSION_CONFIG_SECTION = 'git';
const GIT_PATH_CONFIG_KEY = 'path';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  syncConfiguredGitExecutablePath();
  await initializeRevisionGraphVisibility(vscode.commands);

  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'Git Revision Graph requires the built-in vscode.git extension to be active.'
    );
    return;
  }

  const layoutCachePersistence = new ProjectedGraphLayoutCachePersistence(context.workspaceState);
  layoutCachePersistence.restore();

  const compareResultsProvider = new CompareResultsViewProvider(context.extensionUri);
  const backend = createRevisionGraphBackend();
  let services: RefCommandServices | undefined;
  const showLogProvider = new ShowLogViewProvider(context.extensionUri, backend, compareResultsProvider, () => services);
  const revisionGraphEditorPanel = new RevisionGraphEditorPanel(
    context.extensionUri,
    git,
    compareResultsProvider,
    showLogProvider,
    async () => {
      await Promise.all([
        compareResultsProvider.hideWithRevisionGraph(),
        showLogProvider.hideWithRevisionGraph()
      ]);
    },
    backend,
    () => layoutCachePersistence.clear()
  );
  const commandServices = createCommandServices(revisionGraphEditorPanel, compareResultsProvider);
  services = commandServices;

  context.subscriptions.push(
    compareResultsProvider,
    showLogProvider,
    revisionGraphEditorPanel,
    layoutCachePersistence,
    onProjectedGraphLayoutCacheDidChange(() => layoutCachePersistence.schedulePersist()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${GIT_EXTENSION_CONFIG_SECTION}.${GIT_PATH_CONFIG_KEY}`)) {
        syncConfiguredGitExecutablePath();
      }
    }),
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, new EmptyContentProvider()),
    vscode.workspace.registerTextDocumentContentProvider(REF_SCHEME, new RefContentProvider(git)),
    vscode.commands.registerCommand('gitRefs.compareRefs', async (node?: RefNode) => {
      await compareRefs(git, node, commandServices);
    }),
    vscode.commands.registerCommand('gitRefs.compareWithWorktree', async (node?: RefNode) => {
      await compareWithWorktree(git, node, commandServices);
    }),
    vscode.commands.registerCommand('gitRefs.checkout', async (node?: RefNode) => {
      await checkoutReference(git, node, commandServices);
    }),
    vscode.commands.registerCommand('gitRefs.merge', async (node?: RefNode) => {
      await mergeReference(git, node, commandServices);
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraph', async () => {
      await revisionGraphEditorPanel.open();
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraphEditor', async (options?: { readonly preserveGraphState?: boolean }) => {
      await revisionGraphEditorPanel.open(options);
    })
  );
}

export function deactivate(): void {}

function syncConfiguredGitExecutablePath(): void {
  const gitPath = vscode.workspace
    .getConfiguration(GIT_EXTENSION_CONFIG_SECTION)
    .get<unknown>(GIT_PATH_CONFIG_KEY);
  configureGitExecutablePath(gitPath);
}

async function getGitApi(): Promise<API | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  return gitExtension.getAPI(1);
}

function createCommandServices(
  revisionGraphPanel: RevisionGraphEditorPanel,
  compareResultsProvider: CompareResultsViewProvider
): RefCommandServices {
  const baseServices = createWorkbenchRefActionServices(
    (request?: RevisionGraphRefreshRequestLike) => {
      void revisionGraphPanel.refresh(request);
    },
    (request?: RevisionGraphRefreshRequestLike) => {
      return revisionGraphPanel.prepareRefresh(request);
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

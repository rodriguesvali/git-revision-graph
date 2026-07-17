import * as vscode from 'vscode';
import * as path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import { CompareResultsViewProvider } from './compareResultsView';
import { createWorkbenchAiCompareBriefingGenerator } from './workbenchAiCompareBriefing';
import { createWorkbenchAiFlowTextImprover } from './workbenchAiFlowTextAssistant';
import { RefCommandServices } from './refCommands';
import { API, GitExtension } from './git';
import { configureGitExecutablePath } from './gitExec';
import { EMPTY_SCHEME, EmptyContentProvider, REF_SCHEME, RefContentProvider } from './refContentProvider';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference } from './refCommands';
import { RefNode } from './refNodes';
import { createRevisionGraphBackend } from './revisionGraph/backend';
import { createFlowGovernanceConfig, createFlowConfigCommandServices } from './revisionGraph/flow/flowConfigCommand';
import { DEFAULT_FLOW_CONFIG_PATH } from './revisionGraph/flow/flowConfig';
import { inspectRepositoryConfigPath } from './revisionGraph/flow/flowConfigPathSafety';
import {
  onProjectedGraphLayoutCacheDidChange
} from './revisionGraph/layout/layeredLayout';
import { ProjectedGraphLayoutCachePersistence } from './revisionGraph/layout/cachePersistence';
import { RevisionGraphEditorPanel } from './revisionGraphPanel';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { ShowLogViewProvider } from './showLogView';
import { createWorkbenchRefActionServices } from './workbenchRefActionServices';
import {
  RepositoryMutationCoordinator,
  runGuardedRepositoryMutation
} from './repositoryMutationCoordinator';
import { showConcurrentRepositoryMutationWarning } from './repositoryMutationWarning';

const GIT_EXTENSION_CONFIG_SECTION = 'git';
const GIT_PATH_CONFIG_KEY = 'path';
let activeLayoutCachePersistence: ProjectedGraphLayoutCachePersistence | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  syncConfiguredGitExecutablePath();

  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'Git Revision Graph requires the built-in vscode.git extension to be active.'
    );
    return;
  }

  const layoutCachePersistence = new ProjectedGraphLayoutCachePersistence(context.workspaceState);
  activeLayoutCachePersistence = layoutCachePersistence;
  layoutCachePersistence.restore();

  const backend = createRevisionGraphBackend();
  const mutationCoordinator = new RepositoryMutationCoordinator();
  const compareResultsProvider = new CompareResultsViewProvider(
    context.extensionUri,
    backend,
    mutationCoordinator,
    createWorkbenchAiCompareBriefingGenerator()
  );
  let services: RefCommandServices | undefined;
  const showLogProvider = new ShowLogViewProvider(
    context.extensionUri,
    backend,
    compareResultsProvider,
    () => services,
    mutationCoordinator
  );
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
    () => layoutCachePersistence.clear(),
    mutationCoordinator,
    createWorkbenchAiFlowTextImprover()
  );
  const commandServices = createCommandServices(
    revisionGraphEditorPanel,
    compareResultsProvider,
    mutationCoordinator
  );
  services = commandServices;

  context.subscriptions.push(
    compareResultsProvider,
    showLogProvider,
    revisionGraphEditorPanel,
    layoutCachePersistence,
    { dispose: () => mutationCoordinator.dispose() },
    onProjectedGraphLayoutCacheDidChange(() => layoutCachePersistence.schedulePersist()),
    git.onDidCloseRepository((repository) => {
      mutationCoordinator.invalidate(repository.rootUri.fsPath);
      compareResultsProvider.handleRepositoryClosed(repository);
      showLogProvider.handleRepositoryClosed(repository);
    }),
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
    vscode.commands.registerCommand('gitRefs.createFlowGovernanceConfig', async () => {
      await createFlowGovernanceConfig(git, createFlowConfigCommandServices({
        ui: {
          async pickRepository(items, placeHolder) {
            const picked = await vscode.window.showQuickPick(items, { placeHolder });
            return picked?.repository;
          },
          async confirmCreateConfig(message, actionLabel) {
            const confirmation = await vscode.window.showWarningMessage(
              message,
              { modal: true },
              actionLabel
            );
            return confirmation === actionLabel;
          },
          showInformationMessage(message) {
            void vscode.window.showInformationMessage(message);
          },
          showWarningMessage(message) {
            void vscode.window.showWarningMessage(message);
          }
        },
        formatPath: vscode.workspace.asRelativePath,
        getConfigPath(repository) {
          const value = vscode.workspace
            .getConfiguration('gitRevisionGraph.flowGovernance', repository.rootUri)
            .get<unknown>('configPath');
          return typeof value === 'string' ? value : DEFAULT_FLOW_CONFIG_PATH;
        },
        fileSystem: {
          inspectConfigPath: inspectRepositoryConfigPath,
          async createFile(filePath, content) {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
          },
          async openTextDocument(filePath) {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(document, { preview: false });
          }
        }
      }));
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraph', async () => {
      await revisionGraphEditorPanel.open();
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraphEditor', async (options?: { readonly preserveGraphState?: boolean }) => {
      await revisionGraphEditorPanel.open(options);
    })
  );
}

export async function deactivate(): Promise<void> {
  const layoutCachePersistence = activeLayoutCachePersistence;
  activeLayoutCachePersistence = undefined;
  await layoutCachePersistence?.flush();
}

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
  compareResultsProvider: CompareResultsViewProvider,
  mutationCoordinator: RepositoryMutationCoordinator
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
    async runRepositoryMutation(repository, action) {
      const outcome = await runGuardedRepositoryMutation(
        mutationCoordinator,
        repository,
        baseServices,
        action
      );
      if (outcome.status === 'rejected') {
        await showConcurrentRepositoryMutationWarning(vscode.window);
        return undefined;
      }
      return outcome.value;
    },
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

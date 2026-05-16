import * as vscode from 'vscode';

import { COMPARE_RESULTS_VIEW_ID, CompareResultsViewProvider } from './compareResultsView';
import { RefCommandServices } from './refCommands';
import { API, GitExtension } from './git';
import { EMPTY_SCHEME, EmptyContentProvider, REF_SCHEME, RefContentProvider } from './refContentProvider';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference } from './refCommands';
import { RefNode } from './refNodes';
import { createRevisionGraphBackend } from './revisionGraph/backend';
import {
  onProjectedGraphLayoutCacheDidChange,
  restoreProjectedGraphLayoutCache,
  serializeProjectedGraphLayoutCache
} from './revisionGraph/layout/layeredLayout';
import type { SerializedProjectedGraphLayoutCacheEntry } from './revisionGraph/layout/layeredLayout';
import { SHOW_LOG_VIEW_ID } from './revisionGraphTypes';
import { RevisionGraphEditorPanel } from './revisionGraphPanel';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { ShowLogViewProvider } from './showLogView';
import { initializeRevisionGraphVisibility } from './viewLayout';
import { createWorkbenchRefActionServices } from './workbenchRefActionServices';

const PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY = 'gitRevisionGraph.projectedGraphLayoutCache.v1';
const PROJECTED_GRAPH_LAYOUT_CACHE_SAVE_DELAY_MS = 500;
let lastPersistedProjectedGraphLayoutCacheJson: string | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await initializeRevisionGraphVisibility(vscode.commands);

  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'Git Revision Graph requires the built-in vscode.git extension to be active.'
    );
    return;
  }

  restorePersistedProjectedGraphLayoutCache(context);
  let layoutCacheSaveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveProjectedGraphLayoutCache = () => {
    if (layoutCacheSaveTimer) {
      clearTimeout(layoutCacheSaveTimer);
    }

    layoutCacheSaveTimer = setTimeout(() => {
      layoutCacheSaveTimer = undefined;
      void persistProjectedGraphLayoutCache(context);
    }, PROJECTED_GRAPH_LAYOUT_CACHE_SAVE_DELAY_MS);
  };

  const compareResultsProvider = new CompareResultsViewProvider();
  await compareResultsProvider.initialize();
  const backend = createRevisionGraphBackend();
  const showLogProvider = new ShowLogViewProvider(backend, compareResultsProvider);
  await showLogProvider.initialize();
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
    backend
  );
  const services = createCommandServices(revisionGraphEditorPanel, compareResultsProvider);

  context.subscriptions.push(
    compareResultsProvider,
    showLogProvider,
    revisionGraphEditorPanel,
    onProjectedGraphLayoutCacheDidChange(saveProjectedGraphLayoutCache),
    {
      dispose() {
        if (layoutCacheSaveTimer) {
          clearTimeout(layoutCacheSaveTimer);
          layoutCacheSaveTimer = undefined;
        }

        void persistProjectedGraphLayoutCache(context);
      }
    },
    vscode.window.registerWebviewViewProvider(COMPARE_RESULTS_VIEW_ID, compareResultsProvider),
    vscode.window.registerWebviewViewProvider(SHOW_LOG_VIEW_ID, showLogProvider),
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, new EmptyContentProvider()),
    vscode.workspace.registerTextDocumentContentProvider(REF_SCHEME, new RefContentProvider(git)),
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
      await revisionGraphEditorPanel.open();
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraphEditor', async () => {
      await revisionGraphEditorPanel.open();
    }),
    vscode.commands.registerCommand('gitRefs.hideCompareResults', async () => {
      await compareResultsProvider.hide();
    }),
    vscode.commands.registerCommand('gitRefs.hideShowLog', async () => {
      await showLogProvider.hide();
    })
  );
}

export function deactivate(): void {}

function restorePersistedProjectedGraphLayoutCache(context: vscode.ExtensionContext): void {
  try {
    const persistedCache = context.workspaceState.get<SerializedProjectedGraphLayoutCacheEntry[]>(
      PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY,
      []
    );
    restoreProjectedGraphLayoutCache(
      persistedCache
    );
    const restoredCache = serializeProjectedGraphLayoutCache();
    const persistedCacheJson = serializeProjectedGraphLayoutCacheForComparison(persistedCache ?? []);
    const restoredCacheJson = serializeProjectedGraphLayoutCacheForComparison(restoredCache);
    lastPersistedProjectedGraphLayoutCacheJson = persistedCacheJson;
    if (persistedCacheJson !== restoredCacheJson) {
      void persistProjectedGraphLayoutCache(context, true);
    }
  } catch (error) {
    console.warn('Failed to restore the persisted revision graph layout cache.', error);
    restoreProjectedGraphLayoutCache(undefined);
    lastPersistedProjectedGraphLayoutCacheJson = undefined;
    void context.workspaceState.update(PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, undefined);
  }
}

async function persistProjectedGraphLayoutCache(
  context: vscode.ExtensionContext,
  force = false
): Promise<void> {
  let serializedCache: SerializedProjectedGraphLayoutCacheEntry[];
  try {
    serializedCache = serializeProjectedGraphLayoutCache();
  } catch (error) {
    console.warn('Failed to serialize the revision graph layout cache.', error);
    await clearPersistedProjectedGraphLayoutCache(context);
    return;
  }

  const serializedCacheJson = serializeProjectedGraphLayoutCacheForComparison(serializedCache);
  if (!force && serializedCacheJson === lastPersistedProjectedGraphLayoutCacheJson) {
    return;
  }

  try {
    await context.workspaceState.update(
      PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY,
      serializedCache.length > 0 ? serializedCache : undefined
    );
    lastPersistedProjectedGraphLayoutCacheJson = serializedCacheJson;
  } catch (error) {
    console.warn('Failed to persist the revision graph layout cache.', error);
    await clearPersistedProjectedGraphLayoutCache(context);
  }
}

async function clearPersistedProjectedGraphLayoutCache(context: vscode.ExtensionContext): Promise<void> {
  try {
    await context.workspaceState.update(PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, undefined);
    lastPersistedProjectedGraphLayoutCacheJson = serializeProjectedGraphLayoutCacheForComparison([]);
  } catch (error) {
    console.warn('Failed to clear the persisted revision graph layout cache.', error);
  }
}

function serializeProjectedGraphLayoutCacheForComparison(
  cache: readonly SerializedProjectedGraphLayoutCacheEntry[]
): string {
  return JSON.stringify(cache);
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

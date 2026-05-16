import { REVISION_GRAPH_VISIBLE_CONTEXT } from './revisionGraphTypes';

export interface ViewCommandExecutor {
  executeCommand<T = unknown>(command: string, ...args: unknown[]): PromiseLike<T>;
}

const VIEW_RESIZE_STEPS = 24;
const INCREASE_HEIGHT_COMMANDS = [
  'workbench.action.increaseViewHeight',
  'workbench.action.increaseViewSize'
] as const;
const DECREASE_HEIGHT_COMMANDS = [
  'workbench.action.decreaseViewHeight',
  'workbench.action.decreaseViewSize'
] as const;

const visibleSecondaryViewIds = new Set<string>();

export async function initializeRevisionGraphVisibility(
  commands: ViewCommandExecutor
): Promise<void> {
  await updateRevisionGraphVisibility(commands);
}

export async function focusAndMaximizeSecondaryView(
  viewId: string,
  commands: ViewCommandExecutor
): Promise<void> {
  visibleSecondaryViewIds.add(viewId);
  await updateRevisionGraphVisibility(commands);
  await waitForWorkbenchLayout();
  await commands.executeCommand(`${viewId}.focus`);
  await waitForWorkbenchLayout();
  await maximizeFocusedViewHeight(commands);
}

export async function minimizeSecondaryViewThenMaximizeView(
  minimizedViewId: string,
  maximizedViewId: string,
  commands: ViewCommandExecutor
): Promise<void> {
  visibleSecondaryViewIds.add(minimizedViewId);
  visibleSecondaryViewIds.add(maximizedViewId);
  await updateRevisionGraphVisibility(commands);
  await waitForWorkbenchLayout();
  await commands.executeCommand(`${minimizedViewId}.focus`);
  await waitForWorkbenchLayout();
  await resizeFocusedViewHeight(commands, DECREASE_HEIGHT_COMMANDS);
  await focusAndMaximizeSecondaryView(maximizedViewId, commands);
}

export async function hideSecondaryView(
  viewId: string,
  commands: ViewCommandExecutor,
  restoreFocusViewId?: string
): Promise<void> {
  const wasVisible = visibleSecondaryViewIds.delete(viewId);
  await updateRevisionGraphVisibility(commands);
  await waitForWorkbenchLayout();

  if (restoreFocusViewId && visibleSecondaryViewIds.has(restoreFocusViewId)) {
    await commands.executeCommand(`${restoreFocusViewId}.focus`);
    await waitForWorkbenchLayout();
    await maximizeFocusedViewHeight(commands);
    return;
  }

  if (wasVisible && visibleSecondaryViewIds.size === 0) {
    await commands.executeCommand('gitRefs.openRevisionGraphEditor');
  }
}

export async function detachSecondaryView(
  viewId: string,
  commands: ViewCommandExecutor
): Promise<void> {
  visibleSecondaryViewIds.delete(viewId);
  await updateRevisionGraphVisibility(commands);
  await waitForWorkbenchLayout();
}

export function resetViewLayoutStateForTests(): void {
  visibleSecondaryViewIds.clear();
}

async function maximizeFocusedViewHeight(commands: ViewCommandExecutor): Promise<void> {
  await resizeFocusedViewHeight(commands, INCREASE_HEIGHT_COMMANDS);
}

async function resizeFocusedViewHeight(
  commands: ViewCommandExecutor,
  commandIds: readonly string[]
): Promise<void> {
  for (let step = 0; step < VIEW_RESIZE_STEPS; step += 1) {
    for (const commandId of commandIds) {
      await tryExecuteResizeCommand(commands, commandId);
    }
  }
}

async function tryExecuteResizeCommand(
  commands: ViewCommandExecutor,
  commandId: string
): Promise<boolean> {
  try {
    await commands.executeCommand(commandId);
    return true;
  } catch {
    // Older VS Code builds may not expose every resize command. Focus still succeeds,
    // and supported commands in the same sequence continue to apply the layout intent.
    return false;
  }
}

function waitForWorkbenchLayout(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function updateRevisionGraphVisibility(commands: ViewCommandExecutor): Promise<void> {
  await commands.executeCommand(
    'setContext',
    REVISION_GRAPH_VISIBLE_CONTEXT,
    false
  );
}

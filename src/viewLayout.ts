import { REVISION_GRAPH_VISIBLE_CONTEXT } from './revisionGraphTypes';

export interface ViewCommandExecutor {
  executeCommand<T = unknown>(command: string, ...args: unknown[]): PromiseLike<T>;
}

export async function initializeRevisionGraphVisibility(
  commands: ViewCommandExecutor
): Promise<void> {
  await updateRevisionGraphVisibility(commands);
}

export function resetViewLayoutStateForTests(): void {
  // Kept as a no-op for tests that reset shared view-layout state between cases.
}

async function updateRevisionGraphVisibility(commands: ViewCommandExecutor): Promise<void> {
  await commands.executeCommand(
    'setContext',
    REVISION_GRAPH_VISIBLE_CONTEXT,
    false
  );
}

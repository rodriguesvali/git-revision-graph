import { handleAsyncTaskSafely, type AsyncTaskBoundaryOptions } from './asyncTaskBoundary';

export type WebviewMessageBoundaryOptions = AsyncTaskBoundaryOptions;

/**
 * Runs an asynchronous webview handler without allowing a rejection to escape
 * the synchronous VS Code event callback that invoked it.
 */
export async function handleWebviewMessageSafely(
  handler: () => PromiseLike<void> | void,
  options: WebviewMessageBoundaryOptions
): Promise<void> {
  await handleAsyncTaskSafely(handler, options);
}

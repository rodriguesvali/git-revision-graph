import { isAbortError } from './errors';

export interface WebviewMessageBoundaryOptions {
  readonly onUnexpectedError: (error: unknown) => PromiseLike<void> | void;
  readonly reportBoundaryFailure?: (error: unknown) => void;
}

/**
 * Runs an asynchronous webview handler without allowing a rejection to escape
 * the synchronous VS Code event callback that invoked it.
 */
export async function handleWebviewMessageSafely(
  handler: () => PromiseLike<void> | void,
  options: WebviewMessageBoundaryOptions
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }

    try {
      await options.onUnexpectedError(error);
    } catch (boundaryError) {
      options.reportBoundaryFailure?.(boundaryError);
    }
  }
}

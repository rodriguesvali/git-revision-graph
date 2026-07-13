import { isAbortError } from './errors';

export interface AsyncTaskBoundaryOptions {
  readonly onUnexpectedError: (error: unknown) => PromiseLike<void> | void;
  readonly reportBoundaryFailure?: (error: unknown) => void;
}

/** Runs an asynchronous task without allowing its rejection to escape the callback that started it. */
export async function handleAsyncTaskSafely(
  task: () => PromiseLike<void> | void,
  options: AsyncTaskBoundaryOptions
): Promise<void> {
  try {
    await task();
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

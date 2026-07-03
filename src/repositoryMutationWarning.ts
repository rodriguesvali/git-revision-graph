export const CONCURRENT_REPOSITORY_MUTATION_MESSAGE =
  'Another Git operation is already running for this repository.';

export interface ConcurrentRepositoryMutationWarningPresenter {
  showWarningMessage(message: string, options: { readonly modal: true }): PromiseLike<unknown>;
}

export async function showConcurrentRepositoryMutationWarning(
  presenter: ConcurrentRepositoryMutationWarningPresenter
): Promise<void> {
  await presenter.showWarningMessage(
    CONCURRENT_REPOSITORY_MUTATION_MESSAGE,
    { modal: true }
  );
}

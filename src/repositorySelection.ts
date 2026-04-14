interface RepositoryLike {
  readonly rootUri: {
    readonly fsPath: string;
  };
}

export function sortRepositoriesByPath<T extends RepositoryLike>(repositories: readonly T[]): T[] {
  return [...repositories].sort((left, right) => left.rootUri.fsPath.localeCompare(right.rootUri.fsPath));
}

export function reconcileCurrentRepository<T extends RepositoryLike>(
  repositories: readonly T[],
  currentRepository: T | undefined
): T | undefined {
  if (currentRepository) {
    const matchingRepository = repositories.find(
      (repository) => repository.rootUri.fsPath === currentRepository.rootUri.fsPath
    );
    if (matchingRepository) {
      return matchingRepository;
    }
  }

  return repositories.length === 1 ? repositories[0] : undefined;
}

export function shouldPromptForGraphRepositoryOnOpen<T extends RepositoryLike>(
  repositories: readonly T[],
  currentRepository: T | undefined,
  hadResolvedView: boolean
): boolean {
  return (
    hadResolvedView
    && repositories.length > 0
    && reconcileCurrentRepository(repositories, currentRepository) === undefined
  );
}

export function shouldRefreshGraphForRepositorySetChange<T extends RepositoryLike>(
  previousRepository: T | undefined,
  nextRepository: T | undefined,
  previousHasRepositories: boolean,
  nextHasRepositories: boolean
): boolean {
  return (
    previousHasRepositories !== nextHasRepositories
    || !isSameRepositoryPath(previousRepository, nextRepository)
  );
}

export function isSameRepositoryPath(
  left: RepositoryLike | undefined,
  right: RepositoryLike | undefined
): boolean {
  return left?.rootUri.fsPath === right?.rootUri.fsPath;
}

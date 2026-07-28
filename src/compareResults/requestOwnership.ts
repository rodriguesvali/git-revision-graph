import type { Repository } from '../git';

export interface CompareResultsRequest {
  isCurrentFor(repository: Repository): boolean;
}

export class CompareResultsRequestOwner {
  private generation = 0;
  private repositoryPath: string | undefined;

  start(repository: Repository): CompareResultsRequest {
    const generation = ++this.generation;
    const repositoryPath = repository.rootUri.fsPath;
    this.repositoryPath = repositoryPath;
    return {
      isCurrentFor: (candidate) =>
        this.generation === generation
        && candidate.rootUri.fsPath === repositoryPath
    };
  }

  accept(
    repository: Repository,
    request: CompareResultsRequest | undefined
  ): boolean {
    if (request) {
      return request.isCurrentFor(repository);
    }
    this.generation += 1;
    this.repositoryPath = repository.rootUri.fsPath;
    return true;
  }

  invalidate(): void {
    this.generation += 1;
    this.repositoryPath = undefined;
  }

  invalidateFor(repository: Repository): void {
    if (this.repositoryPath === repository.rootUri.fsPath) {
      this.invalidate();
    }
  }
}

export function isCompareResultsRequestCurrent(
  request: CompareResultsRequest | undefined,
  repository: Repository
): boolean {
  return !request || request.isCurrentFor(repository);
}

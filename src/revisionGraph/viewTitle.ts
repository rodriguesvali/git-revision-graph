import type { Repository } from '../git';

export function getRevisionGraphViewTitle(repository: Repository | undefined): string {
  if (!repository) {
    return 'Branch: No Repository';
  }

  const branchName = repository.state.HEAD?.name?.trim();
  return `Branch: ${branchName && branchName.length > 0 ? branchName : 'Detached HEAD'}`;
}

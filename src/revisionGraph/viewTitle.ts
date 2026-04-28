import * as path from 'node:path';

import type { Repository } from '../git';

export function getRevisionGraphViewTitle(repository: Repository | undefined): string {
  if (!repository) {
    return 'No Repository';
  }

  const repositoryName = path.basename(repository.rootUri.fsPath) || repository.rootUri.fsPath;
  const branchName = repository.state.HEAD?.name?.trim();
  return `${repositoryName}: Branch: ${branchName && branchName.length > 0 ? branchName : 'Detached HEAD'}`;
}

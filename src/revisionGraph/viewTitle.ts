import * as path from 'node:path';

import { RefType, type Repository } from '../git';
import { getCurrentBranch } from '../gitState';

export function getRevisionGraphViewTitle(repository: Repository | undefined): string {
  if (!repository) {
    return 'No Repository';
  }

  const repositoryName = path.basename(repository.rootUri.fsPath) || repository.rootUri.fsPath;
  const branchName = getCurrentBranch(repository)?.name?.trim();
  if (branchName) return `${repositoryName}: Branch: ${branchName}`;
  const head = repository.state.HEAD;
  const tag = head?.type === RefType.Tag && head.name ? ` (Tag: ${head.name})` : '';
  return `${repositoryName}: Detached HEAD${tag}`;
}

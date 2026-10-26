import type { Repository } from '../git';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../gitExec';

export async function resolveComparisonRevision(repository: Repository, revision: string): Promise<string> {
  const hash = (await execGit(repository.rootUri.fsPath,
    ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`], GIT_EXEC_METADATA_PROFILE)).trim();
  if (!/^[0-9a-f]{40,64}$/i.test(hash)) throw new Error('Git did not resolve the comparison revision to a commit.');
  return hash;
}

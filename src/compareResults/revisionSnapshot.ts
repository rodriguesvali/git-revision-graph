import type { Repository } from '../git';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../gitExec';

export async function resolveComparisonRevision(repository: Repository, revision: string): Promise<string> {
  // A fully qualified name can otherwise fall back to another namespace in Git's
  // revision parser when the selected ref has disappeared.
  const object = revision.startsWith('refs/')
    ? (await execGit(repository.rootUri.fsPath,
      ['show-ref', '--verify', '--hash', '--', revision], GIT_EXEC_METADATA_PROFILE)).trim()
    : revision;
  const hash = (await execGit(repository.rootUri.fsPath,
    ['rev-parse', '--verify', '--end-of-options', `${object}^{commit}`], GIT_EXEC_METADATA_PROFILE)).trim();
  if (!/^[0-9a-f]{40,64}$/i.test(hash)) throw new Error('Git did not resolve the comparison revision to a commit.');
  return hash;
}

import { throwIfAborted } from '../../errors';
import { execGit, GIT_EXEC_METADATA_PROFILE } from '../../gitExec';

const BRANCH_CONFIG_PREFIX = 'branch.';
const DESCRIPTION_CONFIG_SUFFIX = '.description';

export async function loadGitBranchDescriptions(
  repositoryPath: string,
  signal?: AbortSignal
): Promise<ReadonlyMap<string, string>> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
  try {
    const output = await execGit(
      repositoryPath,
      ['config', '--local', '--null', '--get-regexp', '^branch\\..*\\.description$'],
      { ...GIT_EXEC_METADATA_PROFILE, signal, allowedExitCodes: [0, 1] }
    );
    throwIfAborted(signal, 'The revision graph load was aborted.');
    return parseGitBranchDescriptions(output);
  } catch {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    return new Map();
  }
}

export function parseGitBranchDescriptions(output: string): ReadonlyMap<string, string> {
  const descriptions = new Map<string, string>();
  for (const record of output.split('\0')) {
    const separatorIndex = record.indexOf('\n');
    if (separatorIndex < 0) {
      continue;
    }

    const key = record.slice(0, separatorIndex);
    if (!key.startsWith(BRANCH_CONFIG_PREFIX) || !key.endsWith(DESCRIPTION_CONFIG_SUFFIX)) {
      continue;
    }

    const branchName = key.slice(BRANCH_CONFIG_PREFIX.length, -DESCRIPTION_CONFIG_SUFFIX.length);
    const description = record.slice(separatorIndex + 1).trim();
    if (branchName && description) {
      descriptions.set(branchName, description);
    }
  }
  return descriptions;
}

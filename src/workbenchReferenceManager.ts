import {
  hasGitExitCode
} from './errorDetail';
import {
  execGitWithResult,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE
} from './gitExec';
import { Repository } from './git';
import { AncestryInspector, ReferenceManager } from './refActions';
import { pushCurrentBranchWithMode } from './refActions/currentBranchPushAdapter';
import {
  buildRemoteBranchDeleteRefspec,
  buildRemoteTagDeleteRefspec,
  getRepositoryRemoteNames,
  isMissingUpstreamConfigurationError
} from './refActions/shared';
import { buildTagPushRefspec } from './refActions/tagRefspec';
import { isRefAncestorOfHead } from './revisionGraphRepository';

export function createWorkbenchReferenceManager(): ReferenceManager {
  return {
    async createTag(repository, tagName, refName) {
      await execGitWithResult(repository.rootUri.fsPath, ['tag', tagName, refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async resetBranch(repository, branchName, refName) {
      await execGitWithResult(repository.rootUri.fsPath, ['branch', '--force', branchName, refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async resetCurrentBranch(repository, refName) {
      await execGitWithResult(repository.rootUri.fsPath, ['reset', '--hard', refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async resetWorkspace(repository, includeUntracked) {
      await execGitWithResult(repository.rootUri.fsPath, ['reset', '--hard', 'HEAD'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      if (includeUntracked) {
        await execGitWithResult(repository.rootUri.fsPath, ['clean', '-fd'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      }
    },
    async getRemoteNames(repository) {
      return getRepositoryRemoteNames(repository);
    },
    async pushCurrentBranch(repository, remoteName, branchName, mode) {
      return pushCurrentBranchWithMode(repository, remoteName, branchName, mode, getCurrentBranchAhead);
    },
    async pushTag(repository, remoteName, tagName) {
      await repository.push(remoteName, buildTagPushRefspec(tagName), false);
    },
    async deleteRemoteTag(repository, remoteName, tagName) {
      await repository.push(remoteName, buildRemoteTagDeleteRefspec(tagName), false);
    },
    async deleteRemoteBranch(repository, remoteName, branchName) {
      await repository.push(remoteName, buildRemoteBranchDeleteRefspec(branchName), false);
    },
    async unsetBranchUpstream(repository, branchName) {
      try {
        await execGitWithResult(repository.rootUri.fsPath, ['branch', '--unset-upstream', branchName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      } catch (error) {
        if (!isMissingUpstreamConfigurationError(error)) {
          throw error;
        }
      }
    },
    async abortMerge(repository) {
      await execGitWithResult(repository.rootUri.fsPath, ['merge', '--abort'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async stashSave(repository) {
      await execGitWithResult(repository.rootUri.fsPath, ['stash', 'push', '--include-untracked', '-m', 'stash'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async stashApply(repository, stashRefName) {
      await execGitWithResult(repository.rootUri.fsPath, ['stash', 'apply', normalizeStashRefName(stashRefName)], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async stashPop(repository, stashRefName) {
      await execGitWithResult(repository.rootUri.fsPath, ['stash', 'pop', normalizeStashRefName(stashRefName)], GIT_EXEC_LOCAL_MUTATION_PROFILE);
    },
    async stashDrop(repository, stashRefName) {
      const normalizedStashRefName = normalizeStashRefName(stashRefName);
      const droppedHash = await resolveGitCommit(repository.rootUri.fsPath, normalizedStashRefName);
      await execGitWithResult(repository.rootUri.fsPath, ['stash', 'drop', normalizedStashRefName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      const currentHash = await resolveGitCommit(repository.rootUri.fsPath, normalizedStashRefName);
      if (droppedHash && currentHash === droppedHash) {
        throw new Error(`Git reported that ${normalizedStashRefName} was dropped, but the stash reference still points to the same commit.`);
      }
    }
  };
}

export function createWorkbenchAncestryInspector(): AncestryInspector {
  return {
    async isRefAncestorOfHead(repository, refName, headRefName) {
      return isRefAncestorOfHead(repository, refName, headRefName);
    }
  };
}

function normalizeStashRefName(stashRefName: string): string {
  return stashRefName === 'stash' ? 'stash@{0}' : stashRefName;
}

async function resolveGitCommit(repositoryPath: string, refName: string): Promise<string | undefined> {
  try {
    const { stdout } = await execGitWithResult(
      repositoryPath,
      ['rev-parse', '--verify', '--quiet', `${refName}^{commit}`],
      GIT_EXEC_METADATA_PROFILE
    );
    const hash = stdout.trim();
    return hash.length > 0 ? hash : undefined;
  } catch (error) {
    if (hasGitExitCode(error, 1)) {
      return undefined;
    }

    throw error;
  }
}

async function getCurrentBranchAhead(repository: Repository): Promise<number | undefined> {
  try {
    const { stdout } = await execGitWithResult(repository.rootUri.fsPath, [
      'rev-list',
      '--left-right',
      '--count',
      'HEAD...@{upstream}'
    ], GIT_EXEC_METADATA_PROFILE);
    const [ahead] = stdout.trim().split(/\s+/);
    const parsedAhead = Number(ahead);
    return Number.isFinite(parsedAhead) ? parsedAhead : undefined;
  } catch {
    return undefined;
  }
}

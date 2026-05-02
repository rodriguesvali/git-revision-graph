import * as fs from 'node:fs';
import * as path from 'node:path';

import { Branch, Repository, UpstreamRef } from './git';

export function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}

export function isBranchTrackingMatchingUpstream(
  branchName: string,
  upstream: UpstreamRef
): boolean {
  return formatUpstreamLabel(upstream.remote, upstream.name) === formatUpstreamLabel(upstream.remote, branchName);
}

export function isPublishedLocalBranch(branch: Branch): boolean {
  return !!branch.name && !!branch.upstream && isBranchTrackingMatchingUpstream(branch.name, branch.upstream);
}

export function hasMergeConflicts(repository: Repository): boolean {
  return repository.state.mergeChanges.length > 0;
}

export function hasConflictedMerge(repository: Repository): boolean {
  return hasMergeConflicts(repository) && isMergeInProgress(repository);
}

export function isMergeInProgress(repository: Repository): boolean {
  const gitDirPath = getRepositoryGitDirPath(repository.rootUri.fsPath);
  return !!gitDirPath && fs.existsSync(path.join(gitDirPath, 'MERGE_HEAD'));
}

export function hasWorkspaceChanges(repository: Repository): boolean {
  return (
    repository.state.mergeChanges.length > 0
    || repository.state.indexChanges.length > 0
    || repository.state.workingTreeChanges.length > 0
    || repository.state.untrackedChanges.length > 0
  );
}

function getRepositoryGitDirPath(repositoryPath: string): string | undefined {
  const dotGitPath = path.join(repositoryPath, '.git');
  try {
    const dotGitStats = fs.statSync(dotGitPath);
    if (dotGitStats.isDirectory()) {
      return dotGitPath;
    }

    if (!dotGitStats.isFile()) {
      return undefined;
    }

    const gitDir = parseGitDirFile(fs.readFileSync(dotGitPath, 'utf8'));
    if (!gitDir) {
      return undefined;
    }

    return path.isAbsolute(gitDir) ? gitDir : path.resolve(repositoryPath, gitDir);
  } catch {
    return undefined;
  }
}

function parseGitDirFile(contents: string): string | undefined {
  const firstLine = contents.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine?.toLowerCase().startsWith('gitdir:')) {
    return undefined;
  }

  const gitDir = firstLine.slice('gitdir:'.length).trim();
  return gitDir.length > 0 ? gitDir : undefined;
}

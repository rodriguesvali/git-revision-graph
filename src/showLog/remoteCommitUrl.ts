import type { Remote, Repository } from '../git';

export function buildGitHubCommitUrl(repository: Repository, commitHash: string): string | undefined {
  const orderedRemotes = getPreferredRemotes(repository.state.remotes);
  for (const remote of orderedRemotes) {
    for (const remoteUrl of [remote.fetchUrl, remote.pushUrl]) {
      const commitUrl = buildGitHubCommitUrlFromRemoteUrl(remoteUrl, commitHash);
      if (commitUrl) {
        return commitUrl;
      }
    }
  }

  return undefined;
}

export function buildGitHubCommitUrlFromRemoteUrl(remoteUrl: string | undefined, commitHash: string): string | undefined {
  const trimmedUrl = remoteUrl?.trim();
  if (!trimmedUrl || !commitHash) {
    return undefined;
  }

  const scpStyleMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(trimmedUrl);
  if (scpStyleMatch) {
    return formatGitHubCommitUrl(scpStyleMatch[1], scpStyleMatch[2], commitHash);
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.hostname.toLowerCase() !== 'github.com') {
      return undefined;
    }

    const pathParts = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    if (pathParts.length !== 2) {
      return undefined;
    }

    return formatGitHubCommitUrl(pathParts[0], pathParts[1], commitHash);
  } catch {
    return undefined;
  }
}

function getPreferredRemotes(remotes: readonly Remote[]): readonly Remote[] {
  const origin = remotes.filter((remote) => remote.name === 'origin');
  const others = remotes.filter((remote) => remote.name !== 'origin');
  return [...origin, ...others];
}

function formatGitHubCommitUrl(owner: string, repositoryName: string, commitHash: string): string | undefined {
  const normalizedOwner = owner.trim();
  const normalizedRepository = repositoryName.trim().replace(/\.git$/i, '');
  if (!normalizedOwner || !normalizedRepository) {
    return undefined;
  }

  return `https://github.com/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepository)}/commit/${encodeURIComponent(commitHash)}`;
}

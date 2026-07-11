import type { Remote, Repository } from '../../git';

export interface FlowPullRequestContext {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly body: string;
  readonly text: string;
}

interface GitHubRepositoryRemote {
  readonly owner: string;
  readonly repositoryName: string;
}

export function createFlowPullRequestContext(sourceRefName: string, targetRefName: string): FlowPullRequestContext {
  const title = `Merge ${sourceRefName} into ${targetRefName}`;
  const body = [
    `Source: ${sourceRefName}`,
    `Target: ${targetRefName}`,
    '',
    'Flow Governance requires final integration through a Pull Request.'
  ].join('\n');

  return {
    sourceRefName,
    targetRefName,
    title,
    body,
    text: [
      `Title: ${title}`,
      '',
      body
    ].join('\n')
  };
}

export function buildGitHubPullRequestUrl(
  repository: Repository,
  sourceRefName: string,
  targetRefName: string
): string | undefined {
  const remote = findGitHubRepositoryRemote(repository.state.remotes);
  if (!remote) {
    return undefined;
  }

  const compare = `${encodeURIComponent(targetRefName)}...${encodeURIComponent(sourceRefName)}`;
  return buildGitHubPullRequestCreationUrl(remote, compare, sourceRefName, targetRefName);
}

export function buildGitHubPullRequestUrlFromRemoteUrl(
  remoteUrl: string | undefined,
  sourceRefName: string,
  targetRefName: string
): string | undefined {
  const remote = parseGitHubRepositoryRemote(remoteUrl);
  if (!remote || !sourceRefName || !targetRefName) {
    return undefined;
  }

  const compare = `${encodeURIComponent(targetRefName)}...${encodeURIComponent(sourceRefName)}`;
  return buildGitHubPullRequestCreationUrl(remote, compare, sourceRefName, targetRefName);
}

function buildGitHubPullRequestCreationUrl(
  remote: GitHubRepositoryRemote,
  compare: string,
  sourceRefName: string,
  targetRefName: string
): string {
  const context = createFlowPullRequestContext(sourceRefName, targetRefName);
  const query = new URLSearchParams({
    quick_pull: '1',
    title: context.title,
    body: context.body
  });
  return `https://github.com/${encodeURIComponent(remote.owner)}/${encodeURIComponent(remote.repositoryName)}/compare/${compare}?${query.toString()}`;
}

function findGitHubRepositoryRemote(remotes: readonly Remote[]): GitHubRepositoryRemote | undefined {
  const orderedRemotes = [
    ...remotes.filter((remote) => remote.name === 'origin'),
    ...remotes.filter((remote) => remote.name !== 'origin')
  ];
  for (const remote of orderedRemotes) {
    for (const remoteUrl of [remote.fetchUrl, remote.pushUrl]) {
      const parsed = parseGitHubRepositoryRemote(remoteUrl);
      if (parsed) {
        return parsed;
      }
    }
  }

  return undefined;
}

function parseGitHubRepositoryRemote(remoteUrl: string | undefined): GitHubRepositoryRemote | undefined {
  const trimmedUrl = remoteUrl?.trim();
  if (!trimmedUrl) {
    return undefined;
  }

  const scpStyleMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(trimmedUrl);
  if (scpStyleMatch) {
    return normalizeGitHubRepositoryRemote(scpStyleMatch[1], scpStyleMatch[2]);
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

    return normalizeGitHubRepositoryRemote(pathParts[0], pathParts[1]);
  } catch {
    return undefined;
  }
}

function normalizeGitHubRepositoryRemote(owner: string, repositoryName: string): GitHubRepositoryRemote | undefined {
  const normalizedOwner = owner.trim();
  const normalizedRepositoryName = repositoryName.trim().replace(/\.git$/i, '');
  return normalizedOwner && normalizedRepositoryName
    ? { owner: normalizedOwner, repositoryName: normalizedRepositoryName }
    : undefined;
}

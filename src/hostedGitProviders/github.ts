import {
  createRepositoryIdentity,
  decodeRemoteComponents,
  encodePath,
  normalizePathComponents,
  normalizeRepositoryName,
  parsePathParts,
  parseRemoteUrl
} from './shared';
import type { HostedGitProviderAdapter, HostedGitProviderMatch } from './types';

const GITHUB_REMOTE_PROTOCOLS = new Set(['git:', 'http:', 'https:', 'ssh:']);

export const githubAdapter: HostedGitProviderAdapter = {
  id: 'github',
  label: 'GitHub',
  parseRemoteUrl(remoteUrl) {
    const scpMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remoteUrl);
    if (scpMatch) {
      const parts = decodeRemoteComponents(scpMatch.slice(1));
      return parts ? createGitHubMatch(parts[0], parts[1]) : undefined;
    }

    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed || parsed.hostname.toLowerCase() !== 'github.com' || !GITHUB_REMOTE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return undefined;
    }
    const parts = parsePathParts(parsed.pathname);
    return parts?.length === 2 ? createGitHubMatch(parts[0], parts[1]) : undefined;
  },
  buildCommitUrl(remote, commitHash) {
    return `${remote.repositoryWebUrl}/commit/${encodeURIComponent(commitHash)}`;
  },
  buildPullRequestUrl(remote, context) {
    const compare = `${encodeURIComponent(context.targetRefName)}...${encodeURIComponent(context.sourceRefName)}`;
    const query = new URLSearchParams({ quick_pull: '1', title: context.title, body: context.body });
    return `${remote.repositoryWebUrl}/compare/${compare}?${query.toString()}`;
  }
};

function createGitHubMatch(owner: string, repositoryName: string): HostedGitProviderMatch | undefined {
  const namespace = normalizePathComponents([owner]);
  const repository = normalizeRepositoryName(repositoryName);
  if (!namespace || !repository) {
    return undefined;
  }
  return {
    repositoryWebUrl: `https://github.com/${encodePath([...namespace, repository])}`,
    repositoryIdentity: createRepositoryIdentity('github', [...namespace, repository])
  };
}

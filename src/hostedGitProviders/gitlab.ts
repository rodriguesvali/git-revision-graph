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

const GITLAB_REMOTE_PROTOCOLS = new Set(['git:', 'http:', 'https:', 'ssh:']);

export const gitlabAdapter: HostedGitProviderAdapter = {
  id: 'gitlab',
  label: 'GitLab',
  parseRemoteUrl(remoteUrl) {
    const scpMatch = /^git@gitlab\.com:([^\s]+)$/i.exec(remoteUrl);
    if (scpMatch) {
      const parts = decodeRemoteComponents(scpMatch[1].split('/'));
      return parts ? createGitLabMatch(parts) : undefined;
    }
    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed || parsed.hostname.toLowerCase() !== 'gitlab.com' || !GITLAB_REMOTE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return undefined;
    }
    const parts = parsePathParts(parsed.pathname);
    return parts ? createGitLabMatch(parts) : undefined;
  },
  buildCommitUrl(remote, commitHash) {
    return `${remote.repositoryWebUrl}/-/commit/${encodeURIComponent(commitHash)}`;
  },
  buildPullRequestUrl(remote, context) {
    const query = new URLSearchParams({
      'merge_request[source_branch]': context.sourceRefName,
      'merge_request[target_branch]': context.targetRefName,
      'merge_request[title]': context.title,
      'merge_request[description]': context.body
    });
    return `${remote.repositoryWebUrl}/-/merge_requests/new?${query.toString()}`;
  }
};

function createGitLabMatch(pathParts: readonly string[]): HostedGitProviderMatch | undefined {
  if (pathParts.length < 2) {
    return undefined;
  }
  const namespace = normalizePathComponents(pathParts.slice(0, -1));
  const repository = normalizeRepositoryName(pathParts[pathParts.length - 1]);
  if (!namespace || !repository) {
    return undefined;
  }
  const parts = [...namespace, repository];
  return {
    repositoryWebUrl: `https://gitlab.com/${encodePath(parts)}`,
    repositoryIdentity: createRepositoryIdentity('gitlab', parts)
  };
}

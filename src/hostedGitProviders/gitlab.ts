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
const GITLAB_HOSTNAME = 'gitlab.com';

export const gitlabAdapter: HostedGitProviderAdapter = {
  id: 'gitlab',
  label: 'GitLab',
  parseRemoteUrl(remoteUrl) {
    const scpMatch = /^git@([^:\s]+):([^\s]+)$/i.exec(remoteUrl);
    if (scpMatch && isGitLabSshHost(scpMatch[1])) {
      const parts = decodeRemoteComponents(scpMatch[2].split('/'));
      return parts ? createGitLabMatch(parts) : undefined;
    }
    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed || !GITLAB_REMOTE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return undefined;
    }
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== GITLAB_HOSTNAME && (protocol !== 'ssh:' || !isGitLabSshHost(hostname))) {
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

function isGitLabSshHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === GITLAB_HOSTNAME || normalized.endsWith(`.${GITLAB_HOSTNAME}`);
}

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

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

const SSM_HOST_PATTERN = /^(.+)-(git|ssh)\.([a-z0-9-]+)\.sourcemanager\.dev$/i;

export const googleSecureSourceManagerAdapter: HostedGitProviderAdapter = {
  id: 'google-secure-source-manager',
  label: 'Google Secure Source Manager',
  parseRemoteUrl(remoteUrl) {
    const scpMatch = /^[^@\s]+@([^:\s]+):([^\s]+)$/i.exec(remoteUrl);
    if (scpMatch) {
      const hostMatch = SSM_HOST_PATTERN.exec(scpMatch[1].toLowerCase());
      const parts = decodeRemoteComponents(scpMatch[2].split('/'));
      return hostMatch?.[2].toLowerCase() === 'ssh' && parts
        ? createSecureSourceManagerMatch(hostMatch[1], hostMatch[3], parts)
        : undefined;
    }

    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed) {
      return undefined;
    }
    const hostMatch = SSM_HOST_PATTERN.exec(parsed.hostname.toLowerCase());
    const endpointKind = hostMatch?.[2].toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    if (!hostMatch || (endpointKind === 'git' && protocol !== 'https:') || (endpointKind === 'ssh' && protocol !== 'ssh:')) {
      return undefined;
    }
    const parts = parsePathParts(parsed.pathname);
    return parts ? createSecureSourceManagerMatch(hostMatch[1], hostMatch[3], parts) : undefined;
  },
  buildPullRequestUrl(remote) {
    return remote.repositoryWebUrl;
  }
};

function createSecureSourceManagerMatch(
  instanceProjectPrefix: string,
  location: string,
  pathParts: readonly string[]
): HostedGitProviderMatch | undefined {
  if (pathParts.length !== 2) {
    return undefined;
  }
  const project = normalizePathComponents([pathParts[0]]);
  const repository = normalizeRepositoryName(pathParts[1]);
  if (!project || !repository) {
    return undefined;
  }
  const normalizedPrefix = instanceProjectPrefix.toLowerCase();
  const normalizedLocation = location.toLowerCase();
  return {
    repositoryWebUrl: `https://${normalizedPrefix}.${normalizedLocation}.sourcemanager.dev/${encodePath([project[0], repository])}`,
    repositoryIdentity: createRepositoryIdentity(
      'google-secure-source-manager',
      [normalizedPrefix, normalizedLocation, project[0], repository]
    )
  };
}

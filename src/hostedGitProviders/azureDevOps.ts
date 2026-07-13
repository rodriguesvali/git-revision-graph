import {
  createRepositoryIdentity,
  decodeRemoteComponents,
  encodePath,
  normalizePathComponent,
  normalizePathComponents,
  normalizeRepositoryName,
  parsePathParts,
  parseRemoteUrl
} from './shared';
import type { HostedGitProviderAdapter, HostedGitProviderMatch } from './types';

const AZURE_DEVOPS_SSH_HOSTS = new Set(['ssh.dev.azure.com', 'vs-ssh.visualstudio.com']);

export const azureDevOpsAdapter: HostedGitProviderAdapter = {
  id: 'azure-devops',
  label: 'Azure DevOps',
  parseRemoteUrl(remoteUrl) {
    const scpMatch = /^git@(ssh\.dev\.azure\.com|vs-ssh\.visualstudio\.com):v3\/([^/\s]+)\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remoteUrl);
    if (scpMatch) {
      const parts = decodeRemoteComponents(scpMatch.slice(2));
      return parts ? createCurrentAzureMatch(parts[0], parts[1], parts[2]) : undefined;
    }

    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed) {
      return undefined;
    }
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const pathParts = parsePathParts(parsed.pathname);
    if (!pathParts) {
      return undefined;
    }
    if (AZURE_DEVOPS_SSH_HOSTS.has(hostname)) {
      return protocol === 'ssh:' && pathParts.length === 4 && pathParts[0].toLowerCase() === 'v3'
        ? createCurrentAzureMatch(pathParts[1], pathParts[2], pathParts[3])
        : undefined;
    }
    if (hostname === 'dev.azure.com' || /^[^.]+\.visualstudio\.com$/i.test(hostname)) {
      return protocol === 'https:' ? createAzureHttpsMatch(hostname, pathParts) : undefined;
    }
    return undefined;
  },
  buildCommitUrl(remote, commitHash) {
    return `${remote.repositoryWebUrl}/commit/${encodeURIComponent(commitHash)}`;
  },
  buildPullRequestUrl(remote, context) {
    const query = new URLSearchParams({
      sourceRef: `refs/heads/${context.sourceRefName}`,
      targetRef: `refs/heads/${context.targetRefName}`
    });
    return `${remote.repositoryWebUrl}/pullrequestcreate?${query.toString()}`;
  }
};

function createAzureHttpsMatch(
  hostname: string,
  pathParts: readonly string[]
): HostedGitProviderMatch | undefined {
  const gitMarkerIndex = pathParts.findIndex((part) => part.toLowerCase() === '_git');
  if (gitMarkerIndex < 1 || gitMarkerIndex !== pathParts.length - 2) {
    return undefined;
  }
  const repository = normalizeRepositoryName(pathParts[gitMarkerIndex + 1]);
  const prefix = normalizePathComponents(pathParts.slice(0, gitMarkerIndex));
  if (!repository || !prefix || prefix.length < 1 || prefix.length > 2) {
    return undefined;
  }
  const identityParts = hostname === 'dev.azure.com'
    ? prefix
    : [hostname.slice(0, -'.visualstudio.com'.length), ...withoutDefaultCollection(prefix)];
  return {
    repositoryWebUrl: `https://${hostname}/${encodePath([...prefix, '_git', repository])}`,
    repositoryIdentity: createRepositoryIdentity('azure-devops', [...identityParts, repository])
  };
}

function createCurrentAzureMatch(
  organization: string,
  project: string,
  repositoryName: string
): HostedGitProviderMatch | undefined {
  const normalizedOrganization = normalizePathComponent(organization);
  const normalizedProject = normalizePathComponent(project);
  const repository = normalizeRepositoryName(repositoryName);
  if (!normalizedOrganization || !normalizedProject || !repository) {
    return undefined;
  }
  const parts = [normalizedOrganization, normalizedProject, repository];
  return {
    repositoryWebUrl: `https://dev.azure.com/${encodePath([normalizedOrganization, normalizedProject, '_git', repository])}`,
    repositoryIdentity: createRepositoryIdentity('azure-devops', parts)
  };
}

function withoutDefaultCollection(parts: readonly string[]): readonly string[] {
  return parts[0]?.toLowerCase() === 'defaultcollection' ? parts.slice(1) : parts;
}

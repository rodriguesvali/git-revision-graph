import type { Remote, Repository } from './git';

export type HostedGitProvider = 'github' | 'azure-devops';

export interface HostedGitRemote {
  readonly provider: HostedGitProvider;
  readonly providerLabel: 'GitHub' | 'Azure DevOps';
  readonly name: string;
  readonly isReadOnly: boolean;
  readonly repositoryWebUrl: string;
}

interface ParsedHostedGitRemote {
  readonly provider: HostedGitProvider;
  readonly providerLabel: 'GitHub' | 'Azure DevOps';
  readonly repositoryWebUrl: string;
  readonly repositoryIdentity: string;
}

const AZURE_DEVOPS_SSH_HOSTS = new Set(['ssh.dev.azure.com', 'vs-ssh.visualstudio.com']);
const GITHUB_REMOTE_PROTOCOLS = new Set(['git:', 'http:', 'https:', 'ssh:']);

export function resolveHostedGitRemote(repository: Repository): HostedGitRemote | undefined {
  for (const remote of getPreferredRemotes(repository.state.remotes)) {
    for (const remoteUrl of [remote.fetchUrl, remote.pushUrl]) {
      const parsed = parseHostedGitRemoteUrl(remoteUrl);
      if (parsed) {
        return withRemoteState(parsed, remote);
      }
    }
  }

  return undefined;
}

export function resolveHostedPullRequestRemote(repository: Repository): HostedGitRemote | undefined {
  for (const remote of getPreferredRemotes(repository.state.remotes)) {
    const fetchRemote = parseHostedGitRemoteUrl(remote.fetchUrl);
    if (!fetchRemote) {
      continue;
    }

    const pushUrl = remote.pushUrl?.trim();
    if (pushUrl) {
      const pushRemote = parseHostedGitRemoteUrl(pushUrl);
      if (!pushRemote || !isSameHostedRepository(fetchRemote, pushRemote)) {
        continue;
      }
    }

    return withRemoteState(fetchRemote, remote);
  }

  return undefined;
}

export function parseHostedGitRemoteUrl(remoteUrl: string | undefined): ParsedHostedGitRemote | undefined {
  const trimmedUrl = remoteUrl?.trim();
  if (!trimmedUrl) {
    return undefined;
  }

  return parseScpStyleRemote(trimmedUrl) ?? parseUrlStyleRemote(trimmedUrl);
}

export function buildHostedCommitUrl(repository: Repository, commitHash: string): string | undefined {
  const remote = resolveHostedGitRemote(repository);
  return remote ? buildHostedCommitUrlForRemote(remote, commitHash) : undefined;
}

export function buildHostedCommitUrlFromRemoteUrl(
  remoteUrl: string | undefined,
  commitHash: string
): string | undefined {
  const remote = parseHostedGitRemoteUrl(remoteUrl);
  return remote ? buildHostedCommitUrlForRemote(remote, commitHash) : undefined;
}

export function buildHostedCommitUrlForRemote(
  remote: Pick<HostedGitRemote, 'repositoryWebUrl'>,
  commitHash: string
): string | undefined {
  const normalizedCommitHash = normalizeValue(commitHash);
  return normalizedCommitHash
    ? `${remote.repositoryWebUrl}/commit/${encodeURIComponent(normalizedCommitHash)}`
    : undefined;
}

export function buildHostedPullRequestUrlFromRemoteUrl(
  remoteUrl: string | undefined,
  sourceRefName: string,
  targetRefName: string,
  title: string,
  body: string
): string | undefined {
  const remote = parseHostedGitRemoteUrl(remoteUrl);
  return remote
    ? buildHostedPullRequestUrlForRemote(remote, sourceRefName, targetRefName, title, body)
    : undefined;
}

export function buildHostedPullRequestUrlForRemote(
  remote: Pick<HostedGitRemote, 'provider' | 'repositoryWebUrl'>,
  sourceRefName: string,
  targetRefName: string,
  title: string,
  body: string
): string | undefined {
  const source = normalizeValue(sourceRefName);
  const target = normalizeValue(targetRefName);
  if (!source || !target) {
    return undefined;
  }

  if (remote.provider === 'github') {
    const compare = `${encodeURIComponent(target)}...${encodeURIComponent(source)}`;
    const query = new URLSearchParams({ quick_pull: '1', title, body });
    return `${remote.repositoryWebUrl}/compare/${compare}?${query.toString()}`;
  }

  const query = new URLSearchParams({
    sourceRef: `refs/heads/${source}`,
    targetRef: `refs/heads/${target}`
  });
  return `${remote.repositoryWebUrl}/pullrequestcreate?${query.toString()}`;
}

function parseScpStyleRemote(remoteUrl: string): ParsedHostedGitRemote | undefined {
  const githubMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remoteUrl);
  if (githubMatch) {
    const parts = decodeRemoteComponents(githubMatch.slice(1));
    return parts ? createGitHubRemote(parts[0], parts[1]) : undefined;
  }

  const azureMatch = /^git@(ssh\.dev\.azure\.com|vs-ssh\.visualstudio\.com):v3\/([^/\s]+)\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remoteUrl);
  if (!azureMatch) {
    return undefined;
  }
  const parts = decodeRemoteComponents(azureMatch.slice(2));
  return parts ? createAzureDevOpsRemote(parts[0], parts[1], parts[2]) : undefined;
}

function parseUrlStyleRemote(remoteUrl: string): ParsedHostedGitRemote | undefined {
  let parsed: URL;
  try {
    parsed = new URL(remoteUrl);
  } catch {
    return undefined;
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();
  const pathParts = parsePathParts(parsed.pathname);
  if (!pathParts) {
    return undefined;
  }

  if (hostname === 'github.com') {
    return GITHUB_REMOTE_PROTOCOLS.has(protocol) && pathParts.length === 2
      ? createGitHubRemote(pathParts[0], pathParts[1])
      : undefined;
  }

  if (AZURE_DEVOPS_SSH_HOSTS.has(hostname)) {
    return protocol === 'ssh:' && pathParts.length === 4 && pathParts[0].toLowerCase() === 'v3'
      ? createAzureDevOpsRemote(pathParts[1], pathParts[2], pathParts[3])
      : undefined;
  }

  if (hostname === 'dev.azure.com') {
    return protocol === 'https:' ? createAzureDevOpsHttpsRemote(hostname, pathParts) : undefined;
  }

  if (/^[^.]+\.visualstudio\.com$/i.test(hostname)) {
    return protocol === 'https:' ? createAzureDevOpsHttpsRemote(hostname, pathParts) : undefined;
  }

  return undefined;
}

function createAzureDevOpsHttpsRemote(
  hostname: string,
  pathParts: readonly string[]
): ParsedHostedGitRemote | undefined {
  const gitMarkerIndex = pathParts.findIndex((part) => part.toLowerCase() === '_git');
  if (gitMarkerIndex < 1 || gitMarkerIndex !== pathParts.length - 2) {
    return undefined;
  }

  const repositoryName = normalizeRepositoryName(pathParts[gitMarkerIndex + 1]);
  const prefix = normalizePathComponents(pathParts.slice(0, gitMarkerIndex));
  if (!repositoryName || !prefix) {
    return undefined;
  }

  if (prefix.length < 1 || prefix.length > 2) {
    return undefined;
  }

  const encodedPath = [...prefix, '_git', repositoryName].map(encodeURIComponent).join('/');
  const identityParts = hostname === 'dev.azure.com'
    ? prefix
    : [hostname.slice(0, -'.visualstudio.com'.length), ...withoutDefaultCollection(prefix)];
  return createAzureDevOpsParsedRemote(
    `https://${hostname}/${encodedPath}`,
    createRepositoryIdentity('azure-devops', [...identityParts, repositoryName])
  );
}

function createGitHubRemote(owner: string, repositoryName: string): ParsedHostedGitRemote | undefined {
  const normalizedOwner = normalizePathComponent(owner);
  const normalizedRepository = normalizeRepositoryName(repositoryName);
  if (!normalizedOwner || !normalizedRepository) {
    return undefined;
  }

  return {
    provider: 'github',
    providerLabel: 'GitHub',
    repositoryWebUrl: `https://github.com/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepository)}`,
    repositoryIdentity: createRepositoryIdentity('github', [normalizedOwner, normalizedRepository])
  };
}

function createAzureDevOpsRemote(
  organization: string,
  project: string,
  repositoryName: string
): ParsedHostedGitRemote | undefined {
  const normalizedOrganization = normalizePathComponent(organization);
  const normalizedProject = normalizePathComponent(project);
  const normalizedRepository = normalizeRepositoryName(repositoryName);
  if (!normalizedOrganization || !normalizedProject || !normalizedRepository) {
    return undefined;
  }

  const repositoryWebUrl = 'https://dev.azure.com/' + [
    normalizedOrganization,
    normalizedProject,
    '_git',
    normalizedRepository
  ].map(encodeURIComponent).join('/');
  return createAzureDevOpsParsedRemote(
    repositoryWebUrl,
    createRepositoryIdentity('azure-devops', [normalizedOrganization, normalizedProject, normalizedRepository])
  );
}

function createAzureDevOpsParsedRemote(
  repositoryWebUrl: string,
  repositoryIdentity: string
): ParsedHostedGitRemote {
  return {
    provider: 'azure-devops',
    providerLabel: 'Azure DevOps',
    repositoryWebUrl,
    repositoryIdentity
  };
}

function parsePathParts(pathname: string): readonly string[] | undefined {
  const rawParts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const parts: string[] = [];
  for (const part of rawParts) {
    try {
      parts.push(decodeURIComponent(part));
    } catch {
      return undefined;
    }
  }
  return parts;
}

function decodeRemoteComponents(values: readonly string[]): readonly string[] | undefined {
  const decoded: string[] = [];
  for (const value of values) {
    try {
      decoded.push(decodeURIComponent(value));
    } catch {
      return undefined;
    }
  }
  return decoded;
}

function normalizeRepositoryName(repositoryName: string): string | undefined {
  return normalizePathComponent(repositoryName.replace(/\.git$/i, ''));
}

function normalizePathComponents(values: readonly string[]): readonly string[] | undefined {
  const normalized: string[] = [];
  for (const value of values) {
    const component = normalizePathComponent(value);
    if (!component) {
      return undefined;
    }
    normalized.push(component);
  }
  return normalized;
}

function normalizePathComponent(value: string): string | undefined {
  const normalized = normalizeValue(value);
  return normalized && normalized !== '.' && normalized !== '..' && !/[\\/\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : undefined;
}

function normalizeValue(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function withoutDefaultCollection(parts: readonly string[]): readonly string[] {
  return parts[0]?.toLowerCase() === 'defaultcollection' ? parts.slice(1) : parts;
}

function createRepositoryIdentity(provider: HostedGitProvider, parts: readonly string[]): string {
  return `${provider}:${parts.map((part) => part.toLowerCase()).join('\u0000')}`;
}

function getPreferredRemotes(remotes: readonly Remote[]): readonly Remote[] {
  return [
    ...remotes.filter((remote) => remote.name === 'origin'),
    ...remotes.filter((remote) => remote.name !== 'origin')
  ];
}

function withRemoteState(parsed: ParsedHostedGitRemote, remote: Remote): HostedGitRemote {
  return {
    provider: parsed.provider,
    providerLabel: parsed.providerLabel,
    repositoryWebUrl: parsed.repositoryWebUrl,
    name: remote.name,
    isReadOnly: remote.isReadOnly
  };
}

function isSameHostedRepository(left: ParsedHostedGitRemote, right: ParsedHostedGitRemote): boolean {
  return left.repositoryIdentity === right.repositoryIdentity;
}

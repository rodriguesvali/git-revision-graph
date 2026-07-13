import type { Remote, Repository } from './git';
import {
  getHostedGitProviderAdapter,
  hostedGitProviderAdapters,
  type HostedGitProvider,
  type HostedGitProviderMatch,
  type HostedGitRepository,
  type HostedGitPullRequestContext
} from './hostedGitProviders';
import { normalizeValue } from './hostedGitProviders/shared';

export type { HostedGitProvider } from './hostedGitProviders';

export interface HostedGitRemote {
  readonly provider: HostedGitProvider;
  readonly providerLabel: string;
  readonly name: string;
  readonly isReadOnly: boolean;
  readonly repositoryWebUrl: string;
}

export interface ParsedHostedGitRemote extends HostedGitProviderMatch {
  readonly provider: HostedGitProvider;
  readonly providerLabel: string;
}

export function resolveHostedGitRemote(repository: Repository): HostedGitRemote | undefined {
  return resolveHostedGitRemoteWithCapability(repository, () => true);
}

export function resolveHostedPullRequestRemote(repository: Repository): HostedGitRemote | undefined {
  for (const remote of getPreferredRemotes(repository.state.remotes)) {
    const fetchRemote = parseHostedGitRemoteUrl(remote.fetchUrl);
    if (!fetchRemote || !getHostedGitProviderAdapter(fetchRemote.provider).buildPullRequestUrl) {
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
  for (const adapter of hostedGitProviderAdapters) {
    const match = adapter.parseRemoteUrl(trimmedUrl);
    if (match) {
      return {
        provider: adapter.id,
        providerLabel: adapter.label,
        ...match
      };
    }
  }
  return undefined;
}

export function buildHostedCommitUrl(repository: Repository, commitHash: string): string | undefined {
  const remote = resolveHostedGitRemoteWithCapability(
    repository,
    (provider) => Boolean(getHostedGitProviderAdapter(provider).buildCommitUrl)
  );
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
  remote: Pick<HostedGitRemote, 'provider' | 'repositoryWebUrl'>,
  commitHash: string
): string | undefined {
  const normalizedCommitHash = normalizeValue(commitHash);
  const adapter = getHostedGitProviderAdapter(remote.provider);
  return normalizedCommitHash && adapter.buildCommitUrl
    ? adapter.buildCommitUrl(toHostedRepository(remote), normalizedCommitHash)
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
  const adapter = getHostedGitProviderAdapter(remote.provider);
  if (!source || !target || !adapter.buildPullRequestUrl) {
    return undefined;
  }
  const context: HostedGitPullRequestContext = {
    sourceRefName: source,
    targetRefName: target,
    title,
    body
  };
  return adapter.buildPullRequestUrl(toHostedRepository(remote), context);
}

function resolveHostedGitRemoteWithCapability(
  repository: Repository,
  supports: (provider: HostedGitProvider) => boolean
): HostedGitRemote | undefined {
  for (const remote of getPreferredRemotes(repository.state.remotes)) {
    for (const remoteUrl of [remote.fetchUrl, remote.pushUrl]) {
      const parsed = parseHostedGitRemoteUrl(remoteUrl);
      if (parsed && supports(parsed.provider)) {
        return withRemoteState(parsed, remote);
      }
    }
  }
  return undefined;
}

function toHostedRepository(
  remote: Pick<HostedGitRemote, 'repositoryWebUrl'>
): HostedGitRepository {
  return {
    repositoryWebUrl: remote.repositoryWebUrl
  };
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

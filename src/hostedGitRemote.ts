import type { Remote, Repository } from './git';
import {
  getHostedGitProviderAdapter,
  hostedGitProviderAdapters,
  isCodeCommitRemoteHelperUrl,
  type HostedGitProvider,
  type HostedGitProviderMatch,
  type HostedGitRepository
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

export function getHostedRemoteConfigurationMessage(
  repository: Repository
): string | undefined {
  const usesCodeCommitHelper = repository.state.remotes.some((remote) =>
    isCodeCommitRemoteHelperUrl(remote.fetchUrl) || isCodeCommitRemoteHelperUrl(remote.pushUrl)
  );
  return usesCodeCommitHelper
    ? 'CodeCommit git-remote-codecommit remotes do not include an AWS Region. Configure a regional HTTPS or SSH CodeCommit remote to open commit link.'
    : undefined;
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

export type HostedGitProvider =
  | 'github'
  | 'azure-devops'
  | 'gitlab'
  | 'aws-codecommit'
  | 'google-secure-source-manager';

export interface HostedGitRepository {
  readonly repositoryWebUrl: string;
}

export interface HostedGitProviderMatch extends HostedGitRepository {
  readonly repositoryIdentity: string;
}

export interface HostedGitPullRequestContext {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly body: string;
}

export interface HostedGitProviderAdapter {
  readonly id: HostedGitProvider;
  readonly label: string;
  parseRemoteUrl(remoteUrl: string): HostedGitProviderMatch | undefined;
  buildCommitUrl?(remote: HostedGitRepository, commitHash: string): string;
  buildPullRequestUrl?(
    remote: HostedGitRepository,
    context: HostedGitPullRequestContext
  ): string;
}

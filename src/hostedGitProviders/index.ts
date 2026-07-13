import { awsCodeCommitAdapter } from './awsCodeCommit';
import { azureDevOpsAdapter } from './azureDevOps';
import { githubAdapter } from './github';
import { gitlabAdapter } from './gitlab';
import { googleSecureSourceManagerAdapter } from './googleSecureSourceManager';
import type { HostedGitProvider, HostedGitProviderAdapter } from './types';

export type {
  HostedGitProvider,
  HostedGitProviderAdapter,
  HostedGitProviderMatch,
  HostedGitRepository,
  HostedGitPullRequestContext
} from './types';

export const hostedGitProviderAdapters: readonly HostedGitProviderAdapter[] = [
  githubAdapter,
  azureDevOpsAdapter,
  gitlabAdapter,
  awsCodeCommitAdapter,
  googleSecureSourceManagerAdapter
];

export function getHostedGitProviderAdapter(provider: HostedGitProvider): HostedGitProviderAdapter {
  const adapter = hostedGitProviderAdapters.find((candidate) => candidate.id === provider);
  if (!adapter) {
    throw new Error(`Missing hosted Git provider adapter: ${provider}`);
  }
  return adapter;
}

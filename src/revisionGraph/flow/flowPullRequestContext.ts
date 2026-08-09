import type { Repository } from '../../git';
import type { HostedGitRemote } from '../../hostedGitRemote';
import {
  buildHostedPullRequestUrlFromRemoteUrl,
  buildHostedPullRequestUrlForRemote,
  resolveHostedPullRequestRemote
} from '../../hostedGitRemote';

export interface FlowPullRequestContext {
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly body: string;
  readonly text: string;
}

export interface FlowPullRequestHandoffPresentation {
  readonly providerLabel: string;
  readonly mode: 'prefilled' | 'manual' | 'unavailable';
  readonly actionLabel: string;
  readonly description: string;
}

export function resolveFlowPullRequestHandoffPresentation(repository: Repository): FlowPullRequestHandoffPresentation {
  const remote = resolveFlowPullRequestRemote(repository);
  if (!remote) {
    return { providerLabel: 'Git provider', mode: 'unavailable', actionLabel: 'Configure a supported remote', description: 'Configure a supported Git hosting remote before opening this review.' };
  }
  if (remote.provider === 'aws-codecommit') {
    return { providerLabel: remote.providerLabel, mode: 'manual', actionLabel: 'Open Pull Requests', description: 'AWS CodeCommit opens its Pull Requests area. Select the source and target branches manually.' };
  }
  if (remote.provider === 'google-secure-source-manager') {
    return { providerLabel: remote.providerLabel, mode: 'manual', actionLabel: 'Open repository', description: 'Google Secure Source Manager opens the repository. Navigate to Pull Requests and select the branches manually.' };
  }
  return { providerLabel: remote.providerLabel, mode: 'prefilled', actionLabel: remote.provider === 'gitlab' ? 'Open Merge Request' : 'Open Pull Request', description: `${remote.providerLabel} will open a prefilled review form with the selected branches and text.` };
}

export function createFlowPullRequestContext(sourceRefName: string, targetRefName: string): FlowPullRequestContext {
  const title = `Merge ${sourceRefName} into ${targetRefName}`;
  const body = [
    `Source: ${sourceRefName}`,
    `Target: ${targetRefName}`,
    '',
    'Flow Governance requires final integration through a Pull Request.'
  ].join('\n');

  return {
    sourceRefName,
    targetRefName,
    title,
    body,
    text: [
      `Title: ${title}`,
      '',
      body
    ].join('\n')
  };
}

export function buildFlowPullRequestUrl(
  repository: Repository,
  sourceRefName: string,
  targetRefName: string,
  contextOverride?: Pick<FlowPullRequestContext, 'title' | 'body'>
): string | undefined {
  const remote = resolveFlowPullRequestRemote(repository);
  return remote
    ? buildFlowPullRequestUrlForRemote(remote, sourceRefName, targetRefName, contextOverride)
    : undefined;
}

export function buildFlowPullRequestUrlForRemote(
  remote: Pick<HostedGitRemote, 'provider' | 'repositoryWebUrl'>,
  sourceRefName: string,
  targetRefName: string,
  contextOverride?: Pick<FlowPullRequestContext, 'title' | 'body'>
): string | undefined {
  const context = contextOverride ?? createFlowPullRequestContext(sourceRefName, targetRefName);
  return buildHostedPullRequestUrlForRemote(
    remote,
    sourceRefName,
    targetRefName,
    context.title,
    context.body
  );
}

export function resolveFlowPullRequestRemote(repository: Repository): HostedGitRemote | undefined {
  return resolveHostedPullRequestRemote(repository);
}

export function buildFlowPullRequestUrlFromRemoteUrl(
  remoteUrl: string | undefined,
  sourceRefName: string,
  targetRefName: string,
  contextOverride?: Pick<FlowPullRequestContext, 'title' | 'body'>
): string | undefined {
  const context = contextOverride ?? createFlowPullRequestContext(sourceRefName, targetRefName);
  return buildHostedPullRequestUrlFromRemoteUrl(
    remoteUrl,
    sourceRefName,
    targetRefName,
    context.title,
    context.body
  );
}

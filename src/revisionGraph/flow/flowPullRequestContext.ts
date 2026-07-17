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

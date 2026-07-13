import {
  createRepositoryIdentity,
  encodePath,
  normalizePathComponent,
  parsePathParts,
  parseRemoteUrl
} from './shared';
import type { HostedGitProviderAdapter } from './types';

const AWS_HOST_PATTERN = /^(?:git-)?codecommit(-fips)?\.([a-z0-9-]+)\.(amazonaws\.com(?:\.cn)?)$/i;

export const awsCodeCommitAdapter: HostedGitProviderAdapter = {
  id: 'aws-codecommit',
  label: 'AWS CodeCommit',
  parseRemoteUrl(remoteUrl) {
    const parsed = parseRemoteUrl(remoteUrl);
    if (!parsed) {
      return undefined;
    }
    const hostname = parsed.hostname.toLowerCase();
    const hostMatch = AWS_HOST_PATTERN.exec(hostname);
    const protocol = parsed.protocol.toLowerCase();
    if (!hostMatch || (protocol !== 'https:' && protocol !== 'ssh:') || (hostMatch[1] && protocol !== 'https:')) {
      return undefined;
    }
    const pathParts = parsePathParts(parsed.pathname);
    if (!pathParts || pathParts.length !== 3 || pathParts[0].toLowerCase() !== 'v1' || pathParts[1].toLowerCase() !== 'repos') {
      return undefined;
    }
    const repository = normalizePathComponent(pathParts[2]);
    if (!repository) {
      return undefined;
    }
    const region = hostMatch[2].toLowerCase();
    const partition = hostMatch[3].toLowerCase();
    const consoleHost = partition.endsWith('.cn')
      ? `${region}.console.amazonaws.cn`
      : `${region}.console.aws.amazon.com`;
    return {
      repositoryWebUrl: `https://${consoleHost}/codesuite/codecommit/repositories/${encodePath([repository])}`,
      repositoryIdentity: createRepositoryIdentity('aws-codecommit', [partition, region, repository], true)
    };
  },
  buildCommitUrl(remote, commitHash) {
    const region = getConsoleRegion(remote.repositoryWebUrl);
    return `${remote.repositoryWebUrl}/commit/${encodeURIComponent(commitHash)}?region=${encodeURIComponent(region)}`;
  },
  buildPullRequestUrl(remote) {
    const region = getConsoleRegion(remote.repositoryWebUrl);
    return `${remote.repositoryWebUrl}/pull-requests?region=${encodeURIComponent(region)}`;
  }
};

function getConsoleRegion(repositoryWebUrl: string): string {
  return new URL(repositoryWebUrl).hostname.split('.')[0];
}

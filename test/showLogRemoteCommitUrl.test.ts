import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGitHubCommitUrl, buildGitHubCommitUrlFromRemoteUrl } from '../src/showLog/remoteCommitUrl';
import { createRepository } from './fakes';

test('buildGitHubCommitUrlFromRemoteUrl supports common GitHub remote URL formats', () => {
  assert.equal(
    buildGitHubCommitUrlFromRemoteUrl('https://github.com/microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
  assert.equal(
    buildGitHubCommitUrlFromRemoteUrl('git@github.com:microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
  assert.equal(
    buildGitHubCommitUrlFromRemoteUrl('ssh://git@github.com/microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
});

test('buildGitHubCommitUrl ignores non-GitHub remotes and prefers origin', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [
      { name: 'upstream', fetchUrl: 'https://github.com/other/project.git', pushUrl: undefined, isReadOnly: false },
      { name: 'origin', fetchUrl: 'https://github.com/owner/project.git', pushUrl: undefined, isReadOnly: false },
      { name: 'internal', fetchUrl: 'https://example.com/owner/project.git', pushUrl: undefined, isReadOnly: false }
    ]
  });

  assert.equal(
    buildGitHubCommitUrl(repository, 'abc123'),
    'https://github.com/owner/project/commit/abc123'
  );
});

test('buildGitHubCommitUrlFromRemoteUrl rejects unsupported remote URLs', () => {
  assert.equal(buildGitHubCommitUrlFromRemoteUrl('https://example.com/microsoft/vscode.git', 'abc123'), undefined);
  assert.equal(buildGitHubCommitUrlFromRemoteUrl('not a remote', 'abc123'), undefined);
  assert.equal(buildGitHubCommitUrlFromRemoteUrl('https://github.com/microsoft.git', 'abc123'), undefined);
});

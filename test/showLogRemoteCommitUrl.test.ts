import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRemoteCommitUrl, buildRemoteCommitUrlFromRemoteUrl } from '../src/showLog/remoteCommitUrl';
import { createRepository } from './fakes';

test('buildRemoteCommitUrlFromRemoteUrl supports common GitHub remote URL formats', () => {
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('https://github.com/microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('git@github.com:microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('ssh://git@github.com/microsoft/vscode.git', 'abc123'),
    'https://github.com/microsoft/vscode/commit/abc123'
  );
});

test('buildRemoteCommitUrlFromRemoteUrl supports Azure DevOps HTTPS and SSH remotes', () => {
  const expected = 'https://dev.azure.com/fabrikam/Project%20One/_git/My%20Repo/commit/abc123';
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://user:secret@dev.azure.com/fabrikam/Project%20One/_git/My%20Repo.git?ignored=1#ignored',
      'abc123'
    ),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('git@ssh.dev.azure.com:v3/fabrikam/Project%20One/My%20Repo', 'abc123'),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('ssh://git@ssh.dev.azure.com/v3/fabrikam/Project%20One/My%20Repo', 'abc123'),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('git@vs-ssh.visualstudio.com:v3/fabrikam/Project%20One/My%20Repo', 'abc123'),
    expected
  );
});

test('buildRemoteCommitUrlFromRemoteUrl supports hosted Azure DevOps legacy and projectless URLs', () => {
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('https://fabrikam.visualstudio.com/Project/_git/Repo.git', 'abc123'),
    'https://fabrikam.visualstudio.com/Project/_git/Repo/commit/abc123'
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('https://dev.azure.com/fabrikam/_git/Repo.git', 'abc123'),
    'https://dev.azure.com/fabrikam/_git/Repo/commit/abc123'
  );
});

test('buildRemoteCommitUrl prefers origin across supported hosting providers', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [
      { name: 'upstream', fetchUrl: 'https://github.com/other/project.git', pushUrl: undefined, isReadOnly: false },
      { name: 'origin', fetchUrl: 'https://github.com/owner/project.git', pushUrl: undefined, isReadOnly: false },
      { name: 'internal', fetchUrl: 'https://example.com/owner/project.git', pushUrl: undefined, isReadOnly: false }
    ]
  });

  assert.equal(
    buildRemoteCommitUrl(repository, 'abc123'),
    'https://github.com/owner/project/commit/abc123'
  );
});

test('buildRemoteCommitUrlFromRemoteUrl rejects unsupported or unsafe remote URLs', () => {
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://example.com/microsoft/vscode.git', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('not a remote', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://github.com/microsoft.git', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://dev.azure.com/org/project/_git/a%2Frepo', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('ftp://dev.azure.com/org/project/_git/repo', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://ssh.dev.azure.com/v3/org/project/repo', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://dev.azure.com/org/project/_git/repo', '   '), undefined);
});

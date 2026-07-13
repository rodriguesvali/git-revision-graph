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

test('buildRemoteCommitUrlFromRemoteUrl supports GitLab.com nested namespaces', () => {
  const expected = 'https://gitlab.com/platform/payments/service/-/commit/abc123';
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://user:token@gitlab.com/platform/payments/service.git?ignored=1#ignored',
      'abc123'
    ),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('git@gitlab.com:platform/payments/service.git', 'abc123'),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl('ssh://git@gitlab.com/platform/payments/service.git', 'abc123'),
    expected
  );
});

test('buildRemoteCommitUrlFromRemoteUrl supports regional AWS CodeCommit remotes', () => {
  const expected = 'https://us-east-2.console.aws.amazon.com/codesuite/codecommit/repositories/MyRepo/' +
    'commit/abc123?region=us-east-2';
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://user:secret@git-codecommit.us-east-2.amazonaws.com/v1/repos/MyRepo?ignored=1#ignored',
      'abc123'
    ),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'ssh://key@git-codecommit.us-east-2.amazonaws.com/v1/repos/MyRepo',
      'abc123'
    ),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://git-codecommit-fips.us-east-2.amazonaws.com/v1/repos/MyRepo',
      'abc123'
    ),
    expected
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://git-codecommit.cn-north-1.amazonaws.com.cn/v1/repos/MyRepo',
      'abc123'
    ),
    'https://cn-north-1.console.amazonaws.cn/codesuite/codecommit/repositories/MyRepo/' +
      'commit/abc123?region=cn-north-1'
  );
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://git-codecommit.us-east-2.amazonaws.com/v1/repos/MyRepo.git',
      'abc123'
    ),
    'https://us-east-2.console.aws.amazon.com/codesuite/codecommit/repositories/MyRepo.git/' +
      'commit/abc123?region=us-east-2'
  );
});

test('buildRemoteCommitUrlFromRemoteUrl does not invent Secure Source Manager commit routes', () => {
  assert.equal(
    buildRemoteCommitUrlFromRemoteUrl(
      'https://example-123456789012-git.us-central1.sourcemanager.dev/my-project/my-repo.git',
      'abc123'
    ),
    undefined
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
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://gitlab.example.com/group/repo.git', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('ssh://git-codecommit-fips.us-east-2.amazonaws.com/v1/repos/repo', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('codecommit://MyRepo', 'abc123'), undefined);
  assert.equal(buildRemoteCommitUrlFromRemoteUrl('https://dev.azure.com/org/project/_git/repo', '   '), undefined);
});

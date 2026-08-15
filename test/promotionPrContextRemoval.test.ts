import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(__dirname, '..', '..');

test('the shipped webview does not expose Promotion PR Context', () => {
  const html = [
    readFileSync(join(repositoryRoot, 'out', 'revisionGraphWebview.js'), 'utf8'),
    readFileSync(join(repositoryRoot, 'out', 'webview', 'revisionGraph.js'), 'utf8')
  ].join('\n');

  assert.doesNotMatch(html, /Promotion PR Context/);
  assert.doesNotMatch(html, /copy-flow-pr-context/);
  assert.doesNotMatch(html, /open-flow-pr-url/);
  assert.doesNotMatch(html, /show-flow-pr-context/);
});

test('the webview protocol rejects removed Promotion PR Context messages', async () => {
  const { validateRevisionGraphMessage } = await import('../src/revisionGraph/messageValidation');

  assert.equal(validateRevisionGraphMessage({
    type: 'copy-flow-pr-context',
    sourceRefName: 'feature/demo',
    targetRefName: 'develop'
  }), undefined);
  assert.equal(validateRevisionGraphMessage({
    type: 'open-flow-pr-url',
    sourceRefName: 'feature/demo',
    targetRefName: 'develop'
  }), undefined);
});

test('hosted Git adapters do not retain Pull Request URL capabilities', () => {
  const productionSources = [
    'src/hostedGitRemote.ts',
    'src/hostedGitProviders/types.ts',
    'src/hostedGitProviders/index.ts',
    'src/hostedGitProviders/github.ts',
    'src/hostedGitProviders/azureDevOps.ts',
    'src/hostedGitProviders/gitlab.ts',
    'src/hostedGitProviders/awsCodeCommit.ts',
    'src/hostedGitProviders/googleSecureSourceManager.ts'
  ].map((path) => readFileSync(join(repositoryRoot, path), 'utf8')).join('\n');

  assert.doesNotMatch(productionSources, /HostedGitPullRequestContext/);
  assert.doesNotMatch(productionSources, /buildPullRequestUrl/);
  assert.doesNotMatch(productionSources, /resolveHostedPullRequestRemote/);
  assert.doesNotMatch(productionSources, /buildHostedPullRequestUrl/);
});

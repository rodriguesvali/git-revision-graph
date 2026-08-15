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

test('the active Extension Host smoke matrix does not require removed Pull Request handoff', () => {
  const smokeMatrix = readFileSync(
    join(repositoryRoot, 'project-context/3.deliver/extension-host-smoke-matrix.md'),
    'utf8'
  );

  assert.doesNotMatch(smokeMatrix, /Open Pull Request/);
  assert.doesNotMatch(smokeMatrix, /PR handoff/);
  assert.doesNotMatch(smokeMatrix, /Pull Request handoff/);
});

test('active UI styles, AI consent, and README omit removed Promotion PR Context concepts', () => {
  const styles = readFileSync(
    join(repositoryRoot, 'src/revisionGraph/webview/styles.ts'),
    'utf8'
  );
  const aiAdapter = readFileSync(
    join(repositoryRoot, 'src/workbenchAiFlowTextAssistant.ts'),
    'utf8'
  );
  const readme = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');

  assert.doesNotMatch(styles, /flow-pr-context|flow-pr-handoff/);
  assert.doesNotMatch(aiAdapter, /Pull Request or release form/);
  assert.doesNotMatch(readme, /promotion target/);
});

test('Flow Governance state loading does not retain Pull Request target loader parameters', () => {
  const stateLoader = readFileSync(
    join(repositoryRoot, 'src/revisionGraph/flow/flowViewState.ts'),
    'utf8'
  );

  assert.doesNotMatch(stateLoader, /_signal|_services|loadPullRequestTargets|loadBranchTargets/);
  assert.match(
    stateLoader,
    /settings: FlowGovernanceSettings \| undefined\s*\)\s*:\s*Promise<FlowGovernanceViewState \| undefined>/
  );
});

test('feature governance marks removed Pull Request scope as historical', () => {
  const featureIndex = readFileSync(
    join(repositoryRoot, 'project-context/2.build/features/README.md'),
    'utf8'
  );
  const frd = readFileSync(
    join(repositoryRoot, 'project-context/docs/git-revision-graph-flow-governance-frd.md'),
    'utf8'
  );
  const currentFeatures = featureIndex.split('## Current Active Features')[1]
    ?.split('## Published Baseline Retained For Integration')[0] ?? '';

  assert.match(currentFeatures, /1\.6\.7-remove-promotion-pr-context\.md/);
  assert.doesNotMatch(currentFeatures, /1\.6\.4-azure-devops-pr-handoff/);
  assert.doesNotMatch(currentFeatures, /1\.6\.0-feature-pr-target-preflight/);
  assert.doesNotMatch(currentFeatures, /1\.6\.0-sync-promotion-pr-context/);
  assert.match(frd, /Feature status:\*\* Historical requirements baseline/);
  assert.match(frd, /References below to PR[\s>]+creation or handoff are historical/);
});

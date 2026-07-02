import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  classifyFlowBranch,
  classifyFlowBranches,
  applyFlowGovernanceOptionsUpdate,
  checkFlowPromotionReadiness,
  createDefaultFlowConfigFile,
  createFlowPromotionReadinessDiagnostic,
  createFlowTransitionDiagnostics,
  createFlowGovernanceViewState,
  createFlowReferenceDecoration,
  evaluateFlowTransition,
  interpretFlowPromotionAncestorExitCode,
  normalizeFlowConfig,
  resolveFlowConfigForRepository,
  isFlowGovernedTransition,
  updateRepositoryFlowConfigOptions
} from '../src/revisionGraph/flow';

test('Flow Governance normalizes Phase 1 defaults and ignores future fields inertly', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true,
    branchCreation: {
      task: { template: 'task/{taskId}-{label}' }
    },
    githubPullRequests: {
      enabled: true
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.config.enabled, true);
  assert.deepEqual(result.config.mainBranches, ['main', 'master']);
  assert.equal(result.config.patterns.package, '^package(?:/.+)?$');
  assert.deepEqual(result.config.ignoredFields, ['branchCreation', 'githubPullRequests']);
});

test('Flow Governance rejects invalid schema and invalid regex without throwing', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 2,
    enabled: true,
    patterns: {
      feature: '['
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.source, 'invalid');
  assert.equal(result.config.enabled, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ['schemaVersion', 'patterns.feature']
  );
});

test('Flow Governance classifies defaults with main precedence and unknown fallback', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true,
    mainBranches: ['feature/main'],
    patterns: {
      feature: '^feature/.+'
    }
  });

  const branches = classifyFlowBranches(
    ['feature/main', 'feature/demo', 'release/1.0.0', 'sync/release-from-main', 'package/core', 'bug/fix', 'hotfix/prod', 'other/demo'],
    result.config
  );

  assert.deepEqual(
    branches.map((branch) => branch.kind),
    ['main', 'feature', 'release', 'sync', 'package', 'bug', 'hotfix', 'unknown']
  );
  assert.equal(branches[3].isEphemeral, true);
  assert.equal(branches[7].diagnostics[0]?.code, 'unknown-branch');
});

test('Flow Governance supports custom deterministic pattern order', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true,
    patterns: {
      release: '^shared/.+',
      feature: '^shared/.+'
    }
  });

  assert.equal(classifyFlowBranch('shared/demo', result.config).kind, 'release');
});

test('Flow Governance creates serializable view state and compact decorations', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true
  });
  const branches = classifyFlowBranches(['main', 'sync/demo'], result.config);
  const viewState = createFlowGovernanceViewState(result, branches);
  const decoration = createFlowReferenceDecoration(branches[0]);

  assert.equal(viewState.enabled, true);
  assert.equal(viewState.configSource, 'repository');
  assert.equal(viewState.references.length, 2);
  assert.equal(decoration.badge, 'main');
  assert.doesNotThrow(() => JSON.stringify(viewState));
});

test('Flow Governance applies option updates without rebuilding metadata', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true
  });
  const branches = classifyFlowBranches(['main', 'sync/demo'], result.config);
  const viewState = createFlowGovernanceViewState(result, branches);

  const updated = applyFlowGovernanceOptionsUpdate(viewState, {
    enabled: false
  });

  assert.equal(updated.enabled, false);
  assert.equal(updated.references, viewState.references);
  assert.equal(updated.diagnostics, viewState.diagnostics);
});

test('Flow Governance keeps classified refs while disabled so re-enable is immediate', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: false
  });
  const branches = classifyFlowBranches(['main', 'feature/demo'], result.config);
  const viewState = createFlowGovernanceViewState(result, branches);

  const updated = applyFlowGovernanceOptionsUpdate(viewState, {
    enabled: true
  });

  assert.equal(viewState.enabled, false);
  assert.deepEqual(viewState.references.map((ref) => [ref.refName, ref.kind]), [
    ['main', 'main'],
    ['feature/demo', 'feature']
  ]);
  assert.equal(updated.enabled, true);
  assert.equal(updated.references, viewState.references);
});

test('Flow Governance transition policy marks governed integrations as PR-required', () => {
  const governedPairs = [
    ['release', 'main', 'release-to-main'],
    ['task', 'feature', 'task-to-feature'],
    ['package', 'feature', 'package-to-feature'],
    ['hotfix', 'main', 'hotfix-to-main'],
    ['bug', 'main', 'bug-to-main'],
    ['bug', 'release', 'bug-to-release'],
    ['bug', 'feature', 'bug-to-feature'],
    ['sync', 'release', 'sync-to-release']
  ] as const;

  for (const [sourceKind, targetKind, ruleId] of governedPairs) {
    const result = evaluateFlowTransition(sourceKind, targetKind);

    assert.equal(result.ruleId, ruleId);
    assert.equal(result.requiresPullRequest, true);
    assert.equal(result.directMergePolicy, 'warn');
    assert.equal(result.directMergeAction, 'warn');
    assert.match(result.message ?? '', /requires a Pull Request/);
    assert.equal(isFlowGovernedTransition(sourceKind, targetKind), true);
  }
});

test('Flow Governance transition policy leaves non-governed integrations unblocked', () => {
  const result = evaluateFlowTransition('feature', 'main');

  assert.equal(result.ruleId, undefined);
  assert.equal(result.requiresPullRequest, false);
  assert.equal(result.directMergePolicy, 'warn');
  assert.equal(result.directMergeAction, 'allow');
  assert.equal(result.message, undefined);
  assert.equal(isFlowGovernedTransition('feature', 'main'), false);
});

test('Flow Governance direct merge policy supports off, warn, and block', () => {
  assert.equal(evaluateFlowTransition('release', 'main', {
    directMergePolicy: 'off'
  }).directMergeAction, 'allow');

  assert.equal(evaluateFlowTransition('release', 'main', {
    directMergePolicy: 'warn'
  }).directMergeAction, 'warn');

  assert.equal(evaluateFlowTransition('release', 'main', {
    directMergePolicy: 'block'
  }).directMergeAction, 'block');
});

test('Flow Governance promotion readiness interprets ancestry exit codes', () => {
  assert.equal(
    interpretFlowPromotionAncestorExitCode(0, 'main', 'release/1.0.0').status,
    'ready'
  );
  assert.equal(
    interpretFlowPromotionAncestorExitCode(1, 'main', 'release/1.0.0').status,
    'blocked'
  );
  assert.equal(
    interpretFlowPromotionAncestorExitCode(128, 'main', 'release/1.0.0').status,
    'inconclusive'
  );
});

test('Flow Governance promotion readiness runs merge-base ancestry checks', async () => {
  const calls: string[][] = [];
  const ready = await checkFlowPromotionReadiness({
    repositoryPath: '/repo',
    productionBranch: 'main',
    releaseBranch: 'release/1.0.0',
    async execGit(_repositoryPath, args) {
      (calls as string[][]).push([...args]);
      return { stdout: '', stderr: '' };
    }
  });

  assert.equal(ready.status, 'ready');
  assert.match(ready.message, /promotion-ready/);
  assert.deepEqual(calls[0], [
    'merge-base',
    '--is-ancestor',
    '--end-of-options',
    'main',
    'release/1.0.0'
  ]);
});

test('Flow Governance promotion readiness reports blocked and inconclusive states', async () => {
  const blocked = await checkFlowPromotionReadiness({
    repositoryPath: '/repo',
    productionBranch: 'main',
    releaseBranch: 'release/1.0.0',
    async execGit() {
      throw Object.assign(new Error('not ancestor'), {
        code: 1,
        stderr: ''
      });
    }
  });
  const inconclusive = await checkFlowPromotionReadiness({
    repositoryPath: '/repo',
    productionBranch: 'main',
    releaseBranch: 'release/1.0.0',
    async execGit() {
      throw Object.assign(new Error('fatal: ambiguous argument'), {
        code: 128,
        stderr: 'fatal: ambiguous argument'
      });
    }
  });

  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.message, /Equalize production/);
  assert.equal(inconclusive.status, 'inconclusive');
  assert.match(inconclusive.detail ?? '', /ambiguous argument/);
});

test('Flow Governance creates PR-required transition diagnostics', () => {
  const diagnostics = createFlowTransitionDiagnostics(
    evaluateFlowTransition('release', 'main'),
    'release/1.0.0',
    'main'
  );
  const blockedDiagnostics = createFlowTransitionDiagnostics(
    evaluateFlowTransition('release', 'main', { directMergePolicy: 'block' }),
    'release/1.0.0',
    'main'
  );
  const ignoredDiagnostics = createFlowTransitionDiagnostics(
    evaluateFlowTransition('feature', 'main'),
    'feature/demo',
    'main'
  );

  assert.equal(diagnostics[0]?.code, 'pr-required');
  assert.equal(diagnostics[0]?.severity, 'warning');
  assert.equal(diagnostics[0]?.sourceRefName, 'release/1.0.0');
  assert.equal(diagnostics[0]?.targetRefName, 'main');
  assert.equal(blockedDiagnostics[0]?.code, 'direct-merge-blocked');
  assert.equal(blockedDiagnostics[0]?.severity, 'error');
  assert.equal(ignoredDiagnostics.length, 0);
});

test('Flow Governance creates release promotion readiness diagnostics', () => {
  const ready = createFlowPromotionReadinessDiagnostic(
    interpretFlowPromotionAncestorExitCode(0, 'main', 'release/1.0.0')
  );
  const blocked = createFlowPromotionReadinessDiagnostic(
    interpretFlowPromotionAncestorExitCode(1, 'main', 'release/1.0.0')
  );
  const inconclusive = createFlowPromotionReadinessDiagnostic({
    ...interpretFlowPromotionAncestorExitCode(128, 'main', 'release/1.0.0'),
    detail: 'fatal: ambiguous argument'
  });

  assert.equal(ready.code, 'release-promotion-ready');
  assert.equal(ready.severity, 'info');
  assert.equal(blocked.code, 'release-promotion-blocked');
  assert.equal(blocked.severity, 'warning');
  assert.match(blocked.message, /Equalize production/);
  assert.equal(inconclusive.code, 'release-promotion-inconclusive');
  assert.match(inconclusive.message, /ambiguous argument/);
});

test('Flow Governance default file contains only Phase 1 fields', () => {
  const generated = JSON.parse(createDefaultFlowConfigFile()) as Record<string, unknown>;

  assert.deepEqual(Object.keys(generated).sort(), [
    'enabled',
    'mainBranches',
    'patterns',
    'schemaVersion'
  ]);
});

test('Flow Governance resolves repository file before fallback settings', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));
  await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({
    schemaVersion: 1,
    enabled: true,
    mainBranches: ['production']
  }));

  const result = await resolveFlowConfigForRepository(root, {
    enabled: false
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'repository');
  assert.equal(result.config.enabled, true);
  assert.deepEqual(result.config.mainBranches, ['production']);
});

test('Flow Governance persists repository option updates while preserving other config fields', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  await writeFile(configPath, JSON.stringify({
    schemaVersion: 1,
    enabled: true,
    patterns: {
      feature: '^feature/.+'
    },
    hideSyncBranchesByDefault: true,
    highlightProductionTrunk: true,
    showUnknownBranches: true,
    futureField: {
      enabled: true
    }
  }));

  const result = await updateRepositoryFlowConfigOptions(root, undefined, {
    enabled: false
  });

  assert.equal(result.ok, true);
  const persisted = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
  assert.equal(persisted.enabled, false);
  assert.equal(persisted.hideSyncBranchesByDefault, undefined);
  assert.equal(persisted.highlightProductionTrunk, undefined);
  assert.equal(persisted.showUnknownBranches, undefined);
  assert.deepEqual(persisted.patterns, { feature: '^feature/.+' });
  assert.deepEqual(persisted.futureField, { enabled: true });
});

test('Flow Governance rejects repository option persistence outside the repository', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));

  const result = await updateRepositoryFlowConfigOptions(root, {
    configPath: '../outside.json'
  }, {
    enabled: false
  });

  assert.equal(result.ok, false);
  assert.equal(result.issue.path, 'configPath');
});

test('Flow Governance uses fallback settings when repository file is missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));

  const result = await resolveFlowConfigForRepository(root, {
    enabled: true,
    configPath: '.missing-flow.json'
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'workspace');
  assert.equal(result.config.enabled, true);
});

test('Flow Governance rejects config paths outside the repository', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));

  const result = await resolveFlowConfigForRepository(root, {
    enabled: true,
    configPath: '../outside.json'
  });

  assert.equal(result.ok, false);
  assert.equal(result.source, 'invalid');
  assert.equal(result.config.enabled, false);
  assert.equal(result.issues[0]?.path, 'configPath');
});

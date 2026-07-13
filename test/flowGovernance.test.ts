import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  classifyFlowBranch,
  classifyFlowBranches,
  applyFlowGovernanceOptionsUpdate,
  buildFlowPullRequestUrl,
  buildFlowPullRequestUrlFromRemoteUrl,
  checkFlowPullRequestTarget,
  checkFlowPullRequestSourcePublication,
  classifyFlowPullRequestSourcePublication,
  createDefaultFlowConfigFile,
  createFlowPullRequestContext,
  createFlowTransitionDiagnostics,
  createFlowGovernanceViewState,
  createFlowReferenceDecoration,
  evaluateFlowTransition,
  loadFlowPullRequestTargets,
  normalizeFlowConfig,
  resolveFlowConfigForRepository,
  resolveFlowPullRequestRemote,
  suggestFlowEqualizationBranchName,
  isFlowGovernedTransition,
  updateRepositoryFlowConfigOptions
} from '../src/revisionGraph/flow';
import { createRepository } from './fakes';

test('Flow Governance suggests local sync branch names for release and feature equalization', () => {
  assert.equal(suggestFlowEqualizationBranchName('release/2.0.0'), 'sync/2.0.0');
  assert.equal(suggestFlowEqualizationBranchName('feature/payment-summary'), 'sync/payment-summary');
  assert.equal(suggestFlowEqualizationBranchName('release/2026 Q3'), 'sync/2026-Q3');
  assert.equal(suggestFlowEqualizationBranchName('release/'), 'sync/release');
});

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
    ['feature', 'release', 'feature-to-release'],
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

test('Flow Governance resolves Pull Request targets and ahead status for release, hotfix, and feature branches', async () => {
  const references = [
    { refName: 'main', kind: 'main' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.0.0', kind: 'release' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.1.0', kind: 'release' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'hotfix/INC-482-login', kind: 'hotfix' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'feature/payment', kind: 'feature' as const, isEphemeral: false, diagnostics: [] }
  ];
  const ranges: string[] = [];
  const ancestryChecks: string[] = [];

  const targets = await loadFlowPullRequestTargets('/workspace/repo', references, undefined, async (_path, args) => {
    if (args[0] === 'merge-base') {
      ancestryChecks.push(`${args.at(-2)}..${args.at(-1)}`);
      return { stdout: '', stderr: '' };
    }
    const range = args.at(-1) ?? '';
    ranges.push(range);
    return { stdout: range === 'release/2.0.0..feature/payment' ? '0\n' : '1\n', stderr: '' };
  });

  assert.deepEqual([...ancestryChecks].sort(), [
    'main..hotfix/INC-482-login',
    'main..release/2.0.0',
    'main..release/2.1.0'
  ].sort());
  assert.deepEqual([...ranges].sort(), [
    'main..release/2.0.0',
    'main..release/2.1.0',
    'main..hotfix/INC-482-login',
    'release/2.0.0..feature/payment',
    'release/2.1.0..feature/payment'
  ].sort());
  assert.deepEqual(targets.map((target) => [target.sourceRefName, target.targetRefName, target.status]), [
    ['release/2.0.0', 'main', 'ahead'],
    ['release/2.1.0', 'main', 'ahead'],
    ['hotfix/INC-482-login', 'main', 'ahead'],
    ['feature/payment', 'release/2.0.0', 'not-ahead'],
    ['feature/payment', 'release/2.1.0', 'ahead']
  ]);
});

test('Flow Governance blocks release and hotfix promotion when production is not an ancestor', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] },
    { refName: 'hotfix/INC-482-login', kind: 'hotfix', isEphemeral: false, diagnostics: [] }
  ], undefined, async (_path, args) => {
    if (args[0] === 'merge-base') {
      throw Object.assign(new Error('not an ancestor'), { code: 1 });
    }
    return { stdout: '1\n', stderr: '' };
  });

  assert.equal(targets.find((target) => target.sourceRefName === 'release/2.0.0')?.status, 'production-not-ancestor');
  assert.equal(targets.find((target) => target.sourceRefName === 'hotfix/INC-482-login')?.status, 'production-not-ancestor');
});

test('Flow Governance blocks production promotion when local main is behind remote main', async () => {
  const calls: readonly string[][] = [];
  const result = await checkFlowPullRequestTarget(
    '/workspace/repo',
    'hotfix/INC-482-login',
    'main',
    {
      requireTargetAncestor: true,
      requireTargetSynchronized: true,
      targetCommitish: '0123456789abcdef'
    },
    undefined,
    async (_path, args) => {
      (calls as string[][]).push([...args]);
      return { stdout: '0\t3\n', stderr: '' };
    }
  );

  assert.equal(result.status, 'production-out-of-sync');
  assert.equal(result.targetLocalAhead, 0);
  assert.equal(result.targetRemoteAhead, 3);
  assert.deepEqual(calls, [[
    'rev-list',
    '--left-right',
    '--count',
    '--end-of-options',
    'main...0123456789abcdef'
  ]]);
});

test('Flow Governance fails closed when release promotion ancestry is inconclusive', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] }
  ], undefined, async () => {
    throw Object.assign(new Error('ambiguous revision'), { code: 128 });
  });

  assert.equal(targets[0]?.status, 'unknown');
  assert.match(targets[0]?.detail ?? '', /ambiguous revision/);
});

test('Flow Governance marks Pull Request ahead checks as unknown when Git fails', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] },
    { refName: 'hotfix/INC-482-login', kind: 'hotfix', isEphemeral: false, diagnostics: [] }
  ], undefined, async () => {
    throw new Error('missing ref');
  });

  assert.equal(targets[0]?.status, 'unknown');
  assert.match(targets[0]?.detail ?? '', /missing ref/);
});

test('Flow Governance classifies Pull Request source synchronization states', () => {
  assert.equal(classifyFlowPullRequestSourcePublication(0, 0), 'ready');
  assert.equal(classifyFlowPullRequestSourcePublication(2, 0), 'unpushed');
  assert.equal(classifyFlowPullRequestSourcePublication(0, 3), 'remote-ahead');
  assert.equal(classifyFlowPullRequestSourcePublication(1, 1), 'diverged');
});

test('Flow Governance detects unpublished Pull Request sources without fetching', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const result = await checkFlowPullRequestSourcePublication(
    repository,
    'origin',
    'hotfix/INC-482-login',
    async (_path, args) => {
      assert.deepEqual(args, [
        'ls-remote',
        '--heads',
        '--refs',
        'origin',
        'refs/heads/hotfix/INC-482-login'
      ]);
      return { stdout: '', stderr: '' };
    }
  );

  assert.equal(result.status, 'unpublished');
  assert.deepEqual(repository.calls.fetch, []);
});

test('Flow Governance fetches and compares a published Pull Request source', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const calls: readonly string[][] = [];
  const result = await checkFlowPullRequestSourcePublication(
    repository,
    'origin',
    'hotfix/INC-482-login',
    async (_path, args) => {
      (calls as string[][]).push([...args]);
      return calls.length === 1
        ? { stdout: '0123456789abcdef\trefs/heads/hotfix/INC-482-login\n', stderr: '' }
        : { stdout: '2\t0\n', stderr: '' };
    }
  );

  assert.equal(result.status, 'unpushed');
  assert.equal(result.localAhead, 2);
  assert.equal(result.remoteAhead, 0);
  assert.deepEqual(repository.calls.fetch, [{ remote: 'origin', ref: 'hotfix/INC-482-login' }]);
  assert.deepEqual(calls[1], [
    'rev-list',
    '--left-right',
    '--count',
    '--end-of-options',
    'hotfix/INC-482-login...0123456789abcdef'
  ]);
});

test('Flow Governance fails closed when Pull Request source verification fails', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const result = await checkFlowPullRequestSourcePublication(
    repository,
    'origin',
    'release/2.0.0',
    async () => {
      throw new Error('authentication failed');
    }
  );

  assert.equal(result.status, 'unknown');
  assert.match(result.detail ?? '', /authentication failed/);
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

test('Flow Governance creates Pull Request context and hosted provider URLs', () => {
  const context = createFlowPullRequestContext('release/1.0.0', 'main');
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [
      { name: 'origin', fetchUrl: 'https://github.com/owner/project.git', pushUrl: undefined, isReadOnly: false }
    ]
  });

  assert.equal(context.title, 'Merge release/1.0.0 into main');
  assert.match(context.text, /Flow Governance requires final integration through a Pull Request/);
  assert.equal(
    buildFlowPullRequestUrl(repository, 'release/1.0.0', 'main'),
    'https://github.com/owner/project/compare/main...release%2F1.0.0?quick_pull=1&title=Merge+release%2F1.0.0+into+main&body=Source%3A+release%2F1.0.0%0ATarget%3A+main%0A%0AFlow+Governance+requires+final+integration+through+a+Pull+Request.'
  );
  assert.deepEqual(resolveFlowPullRequestRemote(repository), {
    provider: 'github',
    providerLabel: 'GitHub',
    name: 'origin',
    isReadOnly: false,
    repositoryWebUrl: 'https://github.com/owner/project'
  });
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl('git@github.com:owner/project.git', 'sync/release-from-main', 'release/1.0.0'),
    'https://github.com/owner/project/compare/release%2F1.0.0...sync%2Frelease-from-main?quick_pull=1&title=Merge+sync%2Frelease-from-main+into+release%2F1.0.0&body=Source%3A+sync%2Frelease-from-main%0ATarget%3A+release%2F1.0.0%0A%0AFlow+Governance+requires+final+integration+through+a+Pull+Request.'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl('https://example.com/owner/project.git', 'release/1.0.0', 'main'),
    undefined
  );
});

test('Flow Governance builds Azure DevOps Pull Request deep links', () => {
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'git@ssh.dev.azure.com:v3/fabrikam/Project%20One/My%20Repo',
      'feature/payment summary',
      'release/2.0.0'
    ),
    'https://dev.azure.com/fabrikam/Project%20One/_git/My%20Repo/pullrequestcreate?' +
      'sourceRef=refs%2Fheads%2Ffeature%2Fpayment+summary&targetRef=refs%2Fheads%2Frelease%2F2.0.0'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'https://fabrikam.visualstudio.com/Project/_git/Repo',
      'feature/demo',
      'main'
    ),
    'https://fabrikam.visualstudio.com/Project/_git/Repo/pullrequestcreate?' +
      'sourceRef=refs%2Fheads%2Ffeature%2Fdemo&targetRef=refs%2Fheads%2Fmain'
  );
});

test('Flow Governance rejects Pull Request handoff when fetch and push repositories differ', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://github.com/owner/project.git',
      pushUrl: 'https://dev.azure.com/owner/project/_git/project',
      isReadOnly: false
    }]
  });

  assert.equal(resolveFlowPullRequestRemote(repository), undefined);
  assert.equal(buildFlowPullRequestUrl(repository, 'feature/demo', 'main'), undefined);
});

test('Flow Governance accepts equivalent legacy fetch and current SSH push URLs', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://fabrikam.visualstudio.com/Project/_git/Repo',
      pushUrl: 'git@ssh.dev.azure.com:v3/fabrikam/Project/Repo',
      isReadOnly: false
    }]
  });

  assert.equal(
    buildFlowPullRequestUrl(repository, 'feature/demo', 'main'),
    'https://fabrikam.visualstudio.com/Project/_git/Repo/pullrequestcreate?' +
      'sourceRef=refs%2Fheads%2Ffeature%2Fdemo&targetRef=refs%2Fheads%2Fmain'
  );
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

test('Flow Governance rejects symbolic-link configuration files without modifying their targets', async (context) => {
  if (process.platform === 'win32') {
    context.skip('Symlink creation requires platform-specific privileges on Windows.');
    return;
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-outside-'));
  const outsidePath = path.join(outsideRoot, 'config.json');
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const outsideContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'outside' });
  await writeFile(outsidePath, outsideContent);
  await symlink(outsidePath, configPath);

  try {
    const resolved = await resolveFlowConfigForRepository(root);
    const updated = await updateRepositoryFlowConfigOptions(root, undefined, { enabled: false });

    assert.equal(resolved.ok, false);
    assert.equal(resolved.source, 'invalid');
    assert.match(resolved.issues[0]?.message ?? '', /symbolic link or junction/i);
    assert.equal(updated.ok, false);
    assert.match(updated.issue.message, /symbolic link or junction/i);
    assert.equal(await readFile(outsidePath, 'utf8'), outsideContent);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test('Flow Governance rejects symbolic-link configuration ancestors without modifying their targets', async (context) => {
  if (process.platform === 'win32') {
    context.skip('Symlink creation requires platform-specific privileges on Windows.');
    return;
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-outside-'));
  const outsidePath = path.join(outsideRoot, 'config.json');
  const outsideContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'outside' });
  await writeFile(outsidePath, outsideContent);
  await symlink(outsideRoot, path.join(root, 'config'));

  try {
    const settings = { configPath: 'config/config.json' };
    const resolved = await resolveFlowConfigForRepository(root, settings);
    const updated = await updateRepositoryFlowConfigOptions(root, settings, { enabled: false });

    assert.equal(resolved.ok, false);
    assert.match(resolved.issues[0]?.message ?? '', /symbolic-link or junction ancestor/i);
    assert.equal(updated.ok, false);
    assert.match(updated.issue.message, /symbolic-link or junction ancestor/i);
    assert.equal(await readFile(outsidePath, 'utf8'), outsideContent);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
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

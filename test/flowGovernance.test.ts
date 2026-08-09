import test from 'node:test';
import assert from 'node:assert/strict';
import {
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  classifyFlowBranch,
  classifyFlowBranches,
  applyFlowBranchTargets,
  applyFlowEqualizationTargets,
  applyFlowGovernanceOptionsUpdate,
  analyzeFlowPatternCanonicalPrefix,
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
  DEFAULT_FLOW_CONFIG,
  evaluateFlowTransition,
  FLOW_CONFIG_MAX_BRANCH_NAME_LENGTH,
  FLOW_CONFIG_MAX_FILE_BYTES,
  FLOW_CONFIG_MAX_JSON_DEPTH,
  FLOW_CONFIG_MAX_MAIN_BRANCHES,
  FLOW_CONFIG_MAX_PATH_LENGTH,
  FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS,
  FLOW_PATTERN_MAX_LENGTH,
  loadFlowPullRequestRemoteBranchCommit,
  loadFlowPullRequestTargets,
  loadFlowGovernanceViewState,
  normalizeFlowConfig,
  parseFlowBranchTargets,
  parseFlowEqualizationTargets,
  resolveFlowConfigForRepository,
  resolveFlowPullRequestRemote,
  suggestFlowEqualizationBranchName,
  isFlowGovernedTransition,
  updateRepositoryFlowConfigOptions
} from '../src/revisionGraph/flow';
import { createRepository } from './fakes';
import {
  FLOW_REMOTE_FETCH_LOADING_LABEL,
  withFlowRemoteFetchLoading
} from '../src/revisionGraph/flow/remoteFetchLoading';

test('Flow Governance remote fetch loading always clears after success and failure', async () => {
  const events: string[] = [];
  const host = {
    postActionLoading(label: string) {
      events.push(`show:${label}`);
    },
    postCurrentState() {
      events.push('hide');
    }
  };

  const result = await withFlowRemoteFetchLoading(host, async () => {
    events.push('success');
    return 42;
  });
  await assert.rejects(
    withFlowRemoteFetchLoading(host, async () => {
      events.push('failure');
      throw new Error('fetch failed');
    }),
    /fetch failed/
  );

  assert.equal(result, 42);
  assert.deepEqual(events, [
    `show:${FLOW_REMOTE_FETCH_LOADING_LABEL}`,
    'success',
    'hide',
    `show:${FLOW_REMOTE_FETCH_LOADING_LABEL}`,
    'failure',
    'hide'
  ]);
});

test('disabled Flow Governance skips branch-target and Pull Request Git metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-disabled-load-'));
  let branchTargetLoads = 0;
  let pullRequestTargetLoads = 0;
  const services = {
    async loadBranchTargets() {
      branchTargetLoads += 1;
      return new Map<string, string>();
    },
    async loadPullRequestTargets() {
      pullRequestTargetLoads += 1;
      return [];
    }
  };

  const fallbackState = await loadFlowGovernanceViewState(
    root,
    ['main', 'feature/demo'],
    { enabled: false },
    undefined,
    services
  );
  assert.equal(fallbackState, undefined);

  await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({
    schemaVersion: 1,
    enabled: false
  }));
  const repositoryState = await loadFlowGovernanceViewState(
    root,
    ['main', 'feature/demo'],
    undefined,
    undefined,
    services
  );

  assert.equal(repositoryState?.enabled, false);
  assert.equal(repositoryState?.configSource, 'repository');
  assert.deepEqual(repositoryState?.pullRequestTargets, []);
  assert.equal(branchTargetLoads, 0);
  assert.equal(pullRequestTargetLoads, 0);
});

test('Flow Governance suggests local sync branch names for release and feature equalization', () => {
  assert.equal(suggestFlowEqualizationBranchName('release/2.0.0'), 'sync/2.0.0');
  assert.equal(suggestFlowEqualizationBranchName('feature/payment-summary'), 'sync/payment-summary');
  assert.equal(suggestFlowEqualizationBranchName('release/2026 Q3'), 'sync/2026-Q3');
  assert.equal(suggestFlowEqualizationBranchName('release/'), 'sync/release');
});

test('Flow Governance recognizes both cases and derives canonical prefixes for all patterns', () => {
  const patterns = {
    release: '^Latam/[rR]elease/.+$',
    sync: '^Latam/[sS]ync/.+$',
    package: '^Latam/[pP]ackage(?:/.+)?$',
    feature: '^Latam/[fF]eature/.+$',
    task: '^Latam/[tT]ask/.+$',
    bug: '^Latam/[bB]ug/.+$',
    hotfix: '^Latam/[Hh]otfix/.+$'
  };
  const config = {
    ...DEFAULT_FLOW_CONFIG,
    enabled: true,
    patterns
  };
  const cases = [
    ['release', 'Latam/release/2.0.0', 'Latam/Release/2.0.0', 'Latam/release/'],
    ['sync', 'Latam/sync/2.0.0', 'Latam/Sync/2.0.0', 'Latam/sync/'],
    ['package', 'Latam/package/2.0.0', 'Latam/Package/2.0.0', 'Latam/package'],
    ['feature', 'Latam/feature/payment', 'Latam/Feature/payment', 'Latam/feature/'],
    ['task', 'Latam/task/4312-payment', 'Latam/Task/4312-payment', 'Latam/task/'],
    ['bug', 'Latam/bug/731-payment', 'Latam/Bug/731-payment', 'Latam/bug/'],
    ['hotfix', 'Latam/Hotfix/INC-482', 'Latam/hotfix/INC-482', 'Latam/Hotfix/']
  ] as const;

  for (const [kind, firstName, secondName, canonicalPrefix] of cases) {
    assert.equal(classifyFlowBranch(firstName, config).kind, kind);
    assert.equal(classifyFlowBranch(secondName, config).kind, kind);
    assert.equal(
      analyzeFlowPatternCanonicalPrefix(patterns[kind])?.canonicalPrefix,
      canonicalPrefix
    );
  }
});

test('Flow Governance derives configured canonical sync names from either target case', () => {
  const config = {
    patterns: {
      ...DEFAULT_FLOW_CONFIG.patterns,
      release: '^Latam/[rR]elease/.+$',
      feature: '^Latam/[fF]eature/.+$',
      sync: '^Latam/[sS]ync/.+$'
    }
  };

  assert.equal(
    suggestFlowEqualizationBranchName('Latam/Release/2.0.0', config),
    'Latam/sync/2.0.0'
  );
  assert.equal(
    suggestFlowEqualizationBranchName('Latam/feature/payment', config),
    'Latam/sync/payment'
  );
});

test('Flow Governance does not treat quantified case pairs as deterministic prefixes', () => {
  assert.equal(analyzeFlowPatternCanonicalPrefix('^[fF]+/.+$'), undefined);
  assert.equal(
    analyzeFlowPatternCanonicalPrefix('^Latam/[fF]{1,2}/.+$')?.canonicalPrefix,
    'Latam/'
  );
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

test('Flow Governance rejects resource-heavy config collections and strings', () => {
  const acceptedBoundary = normalizeFlowConfig({
    schemaVersion: 1,
    mainBranches: Array.from(
      { length: FLOW_CONFIG_MAX_MAIN_BRANCHES },
      (_, index) => `branch-${index}`
    ),
    patterns: {
      feature: 'a'.repeat(FLOW_PATTERN_MAX_LENGTH)
    }
  });
  const tooManyMainBranches = normalizeFlowConfig({
    schemaVersion: 1,
    mainBranches: Array.from(
      { length: FLOW_CONFIG_MAX_MAIN_BRANCHES + 1 },
      (_, index) => `branch-${index}`
    )
  });
  const tooLongMainBranch = normalizeFlowConfig({
    schemaVersion: 1,
    mainBranches: ['a'.repeat(FLOW_CONFIG_MAX_BRANCH_NAME_LENGTH + 1)]
  });
  const tooLongPattern = normalizeFlowConfig({
    schemaVersion: 1,
    patterns: {
      feature: 'a'.repeat(FLOW_PATTERN_MAX_LENGTH + 1)
    }
  });
  const tooManyFields = Object.fromEntries([
    ['schemaVersion', 1],
    ...Array.from(
      { length: FLOW_CONFIG_MAX_TOP_LEVEL_FIELDS },
      (_, index) => [`futureField${index}`, true]
    )
  ]);

  assert.equal(acceptedBoundary.ok, true);
  assert.equal(tooManyMainBranches.ok, false);
  assert.match(tooManyMainBranches.issues[0]?.message ?? '', /32 entries/);
  assert.equal(tooLongMainBranch.ok, false);
  assert.match(tooLongMainBranch.issues[0]?.message ?? '', /256 characters/);
  assert.equal(tooLongPattern.ok, false);
  assert.match(tooLongPattern.issues[0]?.message ?? '', /256 characters/);
  const tooManyTopLevelFields = normalizeFlowConfig(tooManyFields);
  assert.equal(tooManyTopLevelFields.ok, false);
  assert.match(tooManyTopLevelFields.issues[0]?.message ?? '', /64 top-level fields/);
});

test('Flow Governance rejects unsafe regex features before branch classification', () => {
  const result = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true,
    patterns: {
      release: '^(a+)+$',
      sync: '^a*a*a*b$',
      package: `^${'a?'.repeat(17)}$`,
      feature: '^(a|aa)+$',
      task: '^(a+)\\1$',
      bug: '^a{1001}$'
    }
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      'patterns.release',
      'patterns.sync',
      'patterns.package',
      'patterns.feature',
      'patterns.task',
      'patterns.bug'
    ]
  );
  assert.match(result.issues[0]?.message ?? '', /nested or ambiguous repeated groups/);
  assert.match(result.issues[1]?.message ?? '', /adjacent repetitions/);
  assert.match(result.issues[2]?.message ?? '', /more than 16 repetition operators/);
  assert.match(result.issues[3]?.message ?? '', /nested or ambiguous repeated groups/);
  assert.match(result.issues[4]?.message ?? '', /backreferences/);
  assert.match(result.issues[5]?.message ?? '', /more than 1000 times/);
});

test('Flow Governance retains safe custom regex and rejects an unsafe config at runtime', () => {
  const safe = normalizeFlowConfig({
    schemaVersion: 1,
    enabled: true,
    patterns: {
      feature: '^(?:feature|feat)/[a-z0-9._-]+$',
      package: '^package(?:/.+)?$',
      task: '^[a-z]+/[0-9]+$'
    }
  });
  const bypassedConfig = {
    ...DEFAULT_FLOW_CONFIG,
    enabled: true,
    patterns: {
      ...DEFAULT_FLOW_CONFIG.patterns,
      feature: '^(a+)+$'
    }
  };

  assert.equal(safe.ok, true);
  assert.equal(classifyFlowBranch('feat/safe-pattern', safe.config).kind, 'feature');
  assert.equal(classifyFlowBranch('alpha/123', safe.config).kind, 'task');
  assert.equal(
    classifyFlowBranch(`${'a'.repeat(128)}!`, bypassedConfig).kind,
    'unknown'
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
    ['sync', 'release', 'sync-to-release'],
    ['sync', 'feature', 'sync-to-feature']
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

test('Flow Governance persists and applies equalization targets to sync branches', () => {
  const parsed = parseFlowEqualizationTargets(
    'branch.sync/payment.git-revision-graph-flow-target\nfeature/payment\0' +
    'branch.sync/2.0.0.git-revision-graph-flow-target\nrelease/2.0.0\0' +
    'branch.feature/payment.description\nignored\0'
  );
  const references = applyFlowEqualizationTargets([
    { refName: 'sync/payment', kind: 'sync', isEphemeral: true, diagnostics: [] },
    { refName: 'feature/payment', kind: 'feature', isEphemeral: false, diagnostics: [] }
  ], parsed);

  assert.deepEqual([...parsed], [
    ['sync/payment', 'feature/payment'],
    ['sync/2.0.0', 'release/2.0.0']
  ]);
  assert.equal(references[0].equalizationTargetRefName, 'feature/payment');
  assert.equal(references[1].equalizationTargetRefName, undefined);
});

test('Flow Governance applies persisted promotion targets only to eligible branch kinds', () => {
  const parsed = parseFlowBranchTargets(
    'branch.package/payment-validation.git-revision-graph-flow-target\nfeature/payment\0' +
    'branch.task/4312-adjust-timeout.git-revision-graph-flow-target\nfeature/payment\0' +
    'branch.bug/BUG-731-payment-rounding.git-revision-graph-flow-target\nrelease/2.0.0\0' +
    'branch.release/2.0.0.git-revision-graph-flow-target\nmain\0'
  );
  const references = applyFlowBranchTargets([
    { refName: 'package/payment-validation', kind: 'package', isEphemeral: false, diagnostics: [] },
    { refName: 'task/4312-adjust-timeout', kind: 'task', isEphemeral: false, diagnostics: [] },
    { refName: 'bug/BUG-731-payment-rounding', kind: 'bug', isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] }
  ], parsed);

  assert.equal(references[0].promotionTargetRefName, 'feature/payment');
  assert.equal(references[1].promotionTargetRefName, 'feature/payment');
  assert.equal(references[2].promotionTargetRefName, 'release/2.0.0');
  assert.equal(references[3].promotionTargetRefName, undefined);
});

test('Flow Governance resolves Pull Request targets for release, hotfix, feature, package, task, bug, and mapped sync branches', async () => {
  const references = [
    { refName: 'main', kind: 'main' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.0.0', kind: 'release' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'release/2.1.0', kind: 'release' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'hotfix/INC-482-login', kind: 'hotfix' as const, isEphemeral: false, diagnostics: [] },
    { refName: 'feature/payment', kind: 'feature' as const, isEphemeral: false, diagnostics: [] },
    {
      refName: 'package/payment-validation',
      kind: 'package' as const,
      isEphemeral: false,
      diagnostics: [],
      promotionTargetRefName: 'feature/payment'
    },
    {
      refName: 'task/4312-adjust-timeout',
      kind: 'task' as const,
      isEphemeral: false,
      diagnostics: [],
      promotionTargetRefName: 'feature/payment'
    },
    {
      refName: 'bug/BUG-731-payment-rounding',
      kind: 'bug' as const,
      isEphemeral: false,
      diagnostics: [],
      promotionTargetRefName: 'release/2.0.0'
    },
    {
      refName: 'sync/payment',
      kind: 'sync' as const,
      isEphemeral: true,
      diagnostics: [],
      equalizationTargetRefName: 'feature/payment'
    },
    {
      refName: 'sync/2.0.0',
      kind: 'sync' as const,
      isEphemeral: true,
      diagnostics: [],
      equalizationTargetRefName: 'release/2.0.0'
    }
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
    'release/2.1.0..feature/payment',
    'feature/payment..package/payment-validation',
    'feature/payment..task/4312-adjust-timeout',
    'release/2.0.0..bug/BUG-731-payment-rounding',
    'feature/payment..sync/payment',
    'release/2.0.0..sync/2.0.0'
  ].sort());
  assert.deepEqual(targets.map((target) => [target.sourceRefName, target.targetRefName, target.status]), [
    ['release/2.0.0', 'main', 'ahead'],
    ['release/2.1.0', 'main', 'ahead'],
    ['hotfix/INC-482-login', 'main', 'ahead'],
    ['feature/payment', 'release/2.0.0', 'not-ahead'],
    ['feature/payment', 'release/2.1.0', 'ahead'],
    ['package/payment-validation', 'feature/payment', 'ahead'],
    ['task/4312-adjust-timeout', 'feature/payment', 'ahead'],
    ['bug/BUG-731-payment-rounding', 'release/2.0.0', 'ahead'],
    ['sync/payment', 'feature/payment', 'ahead'],
    ['sync/2.0.0', 'release/2.0.0', 'ahead']
  ]);
});

test('Flow Governance does not invent a Pull Request target for an unmapped package branch', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'feature/payment', kind: 'feature', isEphemeral: false, diagnostics: [] },
    { refName: 'package/payment-validation', kind: 'package', isEphemeral: false, diagnostics: [] }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }));

  assert.equal(targets.some((target) => target.sourceRefName === 'package/payment-validation'), false);
});

test('Flow Governance rejects a mapped package target that is not a feature', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] },
    {
      refName: 'package/payment-validation',
      kind: 'package',
      isEphemeral: false,
      diagnostics: [],
      promotionTargetRefName: 'release/2.0.0'
    }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }));

  assert.equal(targets.some((target) => target.sourceRefName === 'package/payment-validation'), false);
});

test('Flow Governance does not invent a Pull Request target for an unmapped task branch', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'feature/payment', kind: 'feature', isEphemeral: false, diagnostics: [] },
    { refName: 'task/4312-adjust-timeout', kind: 'task', isEphemeral: false, diagnostics: [] }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }));

  assert.equal(targets.some((target) => target.sourceRefName === 'task/4312-adjust-timeout'), false);
});

test('Flow Governance does not invent a Pull Request target for an unmapped bug branch', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] },
    { refName: 'bug/BUG-731-payment-rounding', kind: 'bug', isEphemeral: false, diagnostics: [] }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }));

  assert.equal(targets.some((target) => target.sourceRefName === 'bug/BUG-731-payment-rounding'), false);
});

test('Flow Governance recovers one unambiguous legacy sync target from deterministic branch names', async () => {
  const ranges: string[] = [];
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'release/2.0.0', kind: 'release', isEphemeral: false, diagnostics: [] },
    { refName: 'feature/teste-01', kind: 'feature', isEphemeral: false, diagnostics: [] },
    { refName: 'sync/teste-01', kind: 'sync', isEphemeral: true, diagnostics: [] }
  ], undefined, async (_path, args) => {
    ranges.push(args.at(-1) ?? '');
    return { stdout: '1\n', stderr: '' };
  });

  assert.deepEqual(ranges, [
    'release/2.0.0..feature/teste-01',
    'feature/teste-01..sync/teste-01'
  ]);
  assert.deepEqual(targets.map((target) => [target.sourceRefName, target.targetRefName]), [
    ['feature/teste-01', 'release/2.0.0'],
    ['sync/teste-01', 'feature/teste-01']
  ]);
});

test('Flow Governance infers legacy sync targets with configured canonical prefixes', async () => {
  const config = {
    patterns: {
      ...DEFAULT_FLOW_CONFIG.patterns,
      release: '^Latam/[rR]elease/.+$',
      feature: '^Latam/[fF]eature/.+$',
      sync: '^Latam/[sS]ync/.+$'
    }
  };
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    {
      refName: 'Latam/Release/2.0.0',
      kind: 'release',
      isEphemeral: false,
      diagnostics: []
    },
    {
      refName: 'Latam/sync/2.0.0',
      kind: 'sync',
      isEphemeral: true,
      diagnostics: []
    }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }), config);

  assert.deepEqual(
    targets.map((target) => [target.sourceRefName, target.targetRefName]),
    [['Latam/sync/2.0.0', 'Latam/Release/2.0.0']]
  );
});

test('Flow Governance does not infer a legacy sync target when feature and release names collide', async () => {
  const targets = await loadFlowPullRequestTargets('/workspace/repo', [
    { refName: 'release/teste-01', kind: 'release', isEphemeral: false, diagnostics: [] },
    { refName: 'feature/teste-01', kind: 'feature', isEphemeral: false, diagnostics: [] },
    { refName: 'sync/teste-01', kind: 'sync', isEphemeral: true, diagnostics: [] }
  ], undefined, async () => ({ stdout: '1\n', stderr: '' }));

  assert.equal(targets.some((target) => target.sourceRefName === 'sync/teste-01'), false);
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

test('Flow Governance fetches a remote Pull Request target without modifying local branches', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const result = await loadFlowPullRequestRemoteBranchCommit(
    repository,
    'origin',
    'release/2.0.0',
    async (_path, args) => {
      assert.deepEqual(args, [
        'ls-remote',
        '--heads',
        '--refs',
        'origin',
        'refs/heads/release/2.0.0'
      ]);
      return { stdout: '0123456789abcdef\trefs/heads/release/2.0.0\n', stderr: '' };
    }
  );

  assert.deepEqual(result, { status: 'found', commit: '0123456789abcdef' });
  assert.deepEqual(repository.calls.fetch, [{ remote: 'origin', ref: 'release/2.0.0' }]);
  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.merge, []);
  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(repository.calls.createBranch, []);
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
  assert.equal(
    buildFlowPullRequestUrl(repository, 'release/1.0.0', 'main', {
      title: 'Promote release 1.0.0',
      body: 'Reviewed promotion context'
    }),
    'https://github.com/owner/project/compare/main...release%2F1.0.0?quick_pull=1&title=Promote+release+1.0.0&body=Reviewed+promotion+context'
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
      'sourceRef=feature%2Fpayment+summary&targetRef=release%2F2.0.0'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'https://fabrikam.visualstudio.com/Project/_git/Repo',
      'feature/demo',
      'main'
    ),
    'https://fabrikam.visualstudio.com/Project/_git/Repo/pullrequestcreate?' +
      'sourceRef=feature%2Fdemo&targetRef=main'
  );
});

test('Flow Governance builds GitLab.com Merge Request deep links', () => {
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'git@gitlab.com:platform/payments/service.git',
      'feature/payment summary',
      'release/2.0.0'
    ),
    'https://gitlab.com/platform/payments/service/-/merge_requests/new?' +
      'merge_request%5Bsource_branch%5D=feature%2Fpayment+summary&' +
      'merge_request%5Btarget_branch%5D=release%2F2.0.0&' +
      'merge_request%5Btitle%5D=Merge+feature%2Fpayment+summary+into+release%2F2.0.0&' +
      'merge_request%5Bdescription%5D=Source%3A+feature%2Fpayment+summary%0A' +
      'Target%3A+release%2F2.0.0%0A%0AFlow+Governance+requires+final+integration+through+a+Pull+Request.'
  );
});

test('Flow Governance builds GitLab.com Merge Request deep links from SSH host aliases', () => {
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'git@work.gitlab.com:platform/payments/service.git',
      'feature/demo',
      'main'
    ),
    'https://gitlab.com/platform/payments/service/-/merge_requests/new?' +
      'merge_request%5Bsource_branch%5D=feature%2Fdemo&' +
      'merge_request%5Btarget_branch%5D=main&' +
      'merge_request%5Btitle%5D=Merge+feature%2Fdemo+into+main&' +
      'merge_request%5Bdescription%5D=Source%3A+feature%2Fdemo%0ATarget%3A+main%0A%0A' +
      'Flow+Governance+requires+final+integration+through+a+Pull+Request.'
  );
});

test('Flow Governance uses conservative AWS and Google Pull Request handoffs', () => {
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'ssh://key@git-codecommit.eu-west-1.amazonaws.com/v1/repos/Payments',
      'feature/demo',
      'main'
    ),
    'https://eu-west-1.console.aws.amazon.com/codesuite/codecommit/repositories/Payments/' +
      'pull-requests?region=eu-west-1'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'https://git-codecommit.us-gov-west-1.amazonaws.com/v1/repos/Payments',
      'feature/demo',
      'main'
    ),
    'https://us-gov-west-1.console.amazonaws-us-gov.com/codesuite/codecommit/repositories/Payments/' +
      'pull-requests?region=us-gov-west-1'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'https://instance-123456789012-git.us-central1.sourcemanager.dev/project/repo.git',
      'feature/demo',
      'main'
    ),
    'https://instance-123456789012.us-central1.sourcemanager.dev/project/repo'
  );
  assert.equal(
    buildFlowPullRequestUrlFromRemoteUrl(
      'git@instance-123456789012-ssh.us-central1.sourcemanager.dev:project/repo.git',
      'feature/demo',
      'main'
    ),
    'https://instance-123456789012.us-central1.sourcemanager.dev/project/repo'
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
      'sourceRef=feature%2Fdemo&targetRef=main'
  );
});

test('Flow Governance accepts equivalent Secure Source Manager HTTPS and SSH remotes', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://instance-123456789012-git.us-central1.sourcemanager.dev/project/repo.git',
      pushUrl: 'ssh://git@instance-123456789012-ssh.us-central1.sourcemanager.dev/project/repo.git',
      isReadOnly: false
    }]
  });

  assert.equal(
    buildFlowPullRequestUrl(repository, 'feature/demo', 'main'),
    'https://instance-123456789012.us-central1.sourcemanager.dev/project/repo'
  );
});

test('Flow Governance rejects CodeCommit fetch and push remotes from different regions', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    remotes: [{
      name: 'origin',
      fetchUrl: 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/Repo',
      pushUrl: 'ssh://key@git-codecommit.us-west-2.amazonaws.com/v1/repos/Repo',
      isReadOnly: false
    }]
  });

  assert.equal(resolveFlowPullRequestRemote(repository), undefined);
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

test('Flow Governance rejects repository configs larger than 64 KiB before parsing or updating', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-bounds-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const exactBoundary = JSON.stringify({ schemaVersion: 1, enabled: true })
    .padEnd(FLOW_CONFIG_MAX_FILE_BYTES, ' ');
  await writeFile(configPath, exactBoundary);

  try {
    const accepted = await resolveFlowConfigForRepository(root);
    assert.equal(accepted.ok, true);

    await writeFile(configPath, ' '.repeat(FLOW_CONFIG_MAX_FILE_BYTES + 1));
    const resolved = await resolveFlowConfigForRepository(root);
    const updated = await updateRepositoryFlowConfigOptions(root, undefined, { enabled: false });

    assert.equal(resolved.ok, false);
    assert.match(resolved.issues[0]?.message ?? '', /64 KiB/);
    assert.equal(updated.ok, false);
    assert.match(updated.issue.message, /64 KiB/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Flow Governance rejects deeply nested repository config JSON before parsing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-depth-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  let nested = 'true';
  for (let depth = 1; depth < FLOW_CONFIG_MAX_JSON_DEPTH; depth += 1) {
    nested = `{"nested":${nested}}`;
  }
  await writeFile(configPath, `{"schemaVersion":1,"future":${nested}}`);

  try {
    const accepted = await resolveFlowConfigForRepository(root);
    assert.equal(accepted.ok, true);

    await writeFile(configPath, `{"schemaVersion":1,"future":{"nested":${nested}}}`);
    const result = await resolveFlowConfigForRepository(root);

    assert.equal(result.ok, false);
    assert.match(result.issues[0]?.message ?? '', /nesting depth of 32/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Flow Governance rejects oversized repository config paths before filesystem access', async () => {
  const result = await resolveFlowConfigForRepository('/workspace/repository-does-not-need-to-exist', {
    configPath: 'a'.repeat(FLOW_CONFIG_MAX_PATH_LENGTH + 1)
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues[0]?.path, 'configPath');
  assert.match(result.issues[0]?.message ?? '', /1024 characters/);
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

test('Flow Governance rejects regular-file substitution at the persistence boundary', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-race-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const displacedPath = path.join(root, '.git-revision-graph-flow.original.json');
  const originalContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'original' });
  const replacementContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'replacement' });
  await writeFile(configPath, originalContent);

  try {
    const result = await updateRepositoryFlowConfigOptions(
      root,
      undefined,
      { enabled: false },
      {
        openFile: async (filePath, flags) => {
          const handle = await open(filePath, flags);
          await rename(filePath, displacedPath);
          await writeFile(filePath, replacementContent);
          return handle;
        }
      }
    );

    assert.equal(result.ok, false);
    assert.match(result.issue.message, /changed before it could be safely updated/i);
    assert.equal(await readFile(displacedPath, 'utf8'), originalContent);
    assert.equal(await readFile(configPath, 'utf8'), replacementContent);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Flow Governance keeps a descriptor-bound write off a replacement path during persistence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-race-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const displacedPath = path.join(root, '.git-revision-graph-flow.original.json');
  const originalContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'original' });
  const replacementContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'replacement' });
  await writeFile(configPath, originalContent);

  try {
    const result = await updateRepositoryFlowConfigOptions(
      root,
      undefined,
      { enabled: false },
      {
        persistFile: async (handle, content) => {
          await rename(configPath, displacedPath);
          await writeFile(configPath, replacementContent);
          await handle.truncate(0);
          await handle.writeFile(content, 'utf8');
        }
      }
    );

    assert.equal(result.ok, false);
    assert.match(result.issue.message, /changed before it could be safely updated/i);
    const persistedOriginal = JSON.parse(await readFile(displacedPath, 'utf8')) as Record<string, unknown>;
    assert.equal(persistedOriginal.enabled, false);
    assert.equal(persistedOriginal.marker, 'original');
    assert.equal(await readFile(configPath, 'utf8'), replacementContent);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Flow Governance refuses a symbolic-link substitution before opening for persistence', async (context) => {
  if (process.platform === 'win32') {
    context.skip('O_NOFOLLOW is not supported on Windows.');
    return;
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-race-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-outside-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const displacedPath = path.join(root, '.git-revision-graph-flow.original.json');
  const outsidePath = path.join(outsideRoot, 'config.json');
  const originalContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'original' });
  const outsideContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'outside' });
  await writeFile(configPath, originalContent);
  await writeFile(outsidePath, outsideContent);

  try {
    const result = await updateRepositoryFlowConfigOptions(
      root,
      undefined,
      { enabled: false },
      {
        openFile: async (filePath, flags) => {
          await rename(filePath, displacedPath);
          await symlink(outsidePath, filePath);
          return open(filePath, flags);
        }
      }
    );

    assert.equal(result.ok, false);
    assert.match(result.issue.message, /could not write Flow Governance config/i);
    assert.equal(await readFile(displacedPath, 'utf8'), originalContent);
    assert.equal(await readFile(outsidePath, 'utf8'), outsideContent);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test('Flow Governance rejects symbolic-link ancestor substitution at the persistence boundary', async (context) => {
  if (process.platform === 'win32') {
    context.skip('Symlink creation requires platform-specific privileges on Windows.');
    return;
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-race-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-outside-'));
  const configDirectory = path.join(root, 'config');
  const displacedDirectory = path.join(root, 'config-original');
  const configPath = path.join(configDirectory, 'flow.json');
  const outsidePath = path.join(outsideRoot, 'flow.json');
  const originalContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'original' });
  const outsideContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'outside' });
  await mkdir(configDirectory);
  await writeFile(configPath, originalContent);
  await writeFile(outsidePath, outsideContent);

  try {
    const result = await updateRepositoryFlowConfigOptions(
      root,
      { configPath: 'config/flow.json' },
      { enabled: false },
      {
        openFile: async (filePath, flags) => {
          const handle = await open(filePath, flags);
          await rename(configDirectory, displacedDirectory);
          await symlink(outsideRoot, configDirectory);
          return handle;
        }
      }
    );

    assert.equal(result.ok, false);
    assert.match(result.issue.message, /symbolic-link or junction ancestor/i);
    assert.equal(await readFile(path.join(displacedDirectory, 'flow.json'), 'utf8'), originalContent);
    assert.equal(await readFile(outsidePath, 'utf8'), outsideContent);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test('Flow Governance rejects hard-linked config files without modifying their other links', async (context) => {
  if (process.platform === 'win32') {
    context.skip('Hard-link fixture behavior is platform-specific on Windows.');
    return;
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-hard-link-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-outside-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  const outsidePath = path.join(outsideRoot, 'config.json');
  const outsideContent = JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'outside' });
  await writeFile(outsidePath, outsideContent);
  await link(outsidePath, configPath);

  try {
    const result = await updateRepositoryFlowConfigOptions(root, undefined, { enabled: false });

    assert.equal(result.ok, false);
    assert.match(result.issue.message, /must not be hard-linked/i);
    assert.equal(await readFile(outsidePath, 'utf8'), outsideContent);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
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

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
  applyFlowGovernanceOptionsUpdate,
  analyzeFlowPatternCanonicalPrefix,
  createDefaultFlowConfigFile,
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
  normalizeFlowConfig,
  resolveFlowConfigForRepository,
  suggestFlowEqualizationBranchName,
  isFlowGovernedTransition,
  updateRepositoryFlowConfigOptions
} from '../src/revisionGraph/flow';
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
    ['task', 'release', 'task-to-release'],
    ['package', 'feature', 'package-to-feature'],
    ['package', 'release', 'package-to-release'],
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

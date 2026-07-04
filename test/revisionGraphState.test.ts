import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { RefType } from '../src/git';
import { RevisionGraphLimitPolicy, RevisionGraphStateBackend } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import {
  buildEmptyRevisionGraphViewState,
  buildRevisionGraphSceneLayoutKey,
  buildReadyRevisionGraphViewState,
  buildReadyRevisionGraphViewStateBundleFromSnapshot
} from '../src/revisionGraph/panel/state';
import { buildNodeLayouts } from '../src/revisionGraph/webview/shared';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createBranch, createHead, createRef, createRepository } from './fakes';

const LIMIT_POLICY: RevisionGraphLimitPolicy = {
  initialLimit: 6000,
  steppedLimits: [6000, 12000],
  minVisibleNodes: 24,
  graphCommandTimeoutMs: 60000
};

test('builds a serializable ready state for the persistent webview shell', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'origin/main', kind: 'remote' }
      ]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );

  assert.equal(state.viewMode, 'ready');
  assert.equal(state.currentHeadName, 'main');
  assert.equal(state.currentHeadUpstreamName, 'origin/main');
  assert.deepEqual(state.publishedLocalBranchNames, ['main']);
  assert.equal(state.scene.nodes.length, 1);
  assert.equal(state.references.length, 2);
  assert.equal(state.flowGovernance, undefined);
  assert.deepEqual(state.primaryAncestorNextByHash, {});
  assert.match(state.sceneLayoutKey, /^fanout-balance-v1:[A-Za-z0-9_-]+$/);
  assert.equal(state.loading, false);
  assert.equal(state.errorMessage, undefined);
});

test('attaches Flow Governance metadata from fallback settings without changing graph refs', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0),
    refs: [
      createRef({ type: RefType.Head, name: 'main' }),
      createRef({ type: RefType.Head, name: 'sync/release-from-main' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/feature/demo' }),
      createRef({ type: RefType.Tag, name: 'v1.0.0' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'sync/release-from-main', kind: 'branch' },
        { name: 'origin/feature/demo', kind: 'remote' },
        { name: 'v1.0.0', kind: 'tag' }
      ]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY,
    undefined,
    undefined,
    {
      flowGovernanceSettings: {
        enabled: true,
        configPath: '.missing-flow.json'
      },
      branchDescriptions: new Map([
        ['main', 'Primary integration branch']
      ])
    }
  );

  assert.equal(state.flowGovernance?.enabled, true);
  assert.equal(state.flowGovernance?.configSource, 'workspace');
  assert.deepEqual(
    state.flowGovernance?.references.map((ref) => [ref.refName, ref.kind, ref.isEphemeral]),
    [
      ['main', 'main', false],
      ['sync/release-from-main', 'sync', true]
    ]
  );
  assert.deepEqual(
    state.references.map((ref) => [ref.name, ref.kind]),
    [
      ['main', 'head'],
      ['sync/release-from-main', 'branch'],
      ['origin/feature/demo', 'remote'],
      ['v1.0.0', 'tag']
    ]
  );
  assert.equal(
    state.references.find((ref) => ref.name === 'main')?.description,
    'Primary integration branch'
  );
  assert.equal(
    state.references.find((ref) => ref.name === 'origin/feature/demo')?.description,
    undefined
  );
});

test('attaches invalid Flow Governance diagnostics from repository config without breaking graph load', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-state-'));
  await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({
    schemaVersion: 1,
    enabled: true,
    patterns: {
      feature: '['
    }
  }));
  const repository = createRepository({
    root,
    head: createHead('main', 0, 0),
    refs: [
      createRef({ type: RefType.Head, name: 'main' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [{ name: 'main', kind: 'head' }]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY,
    undefined,
    undefined,
    { flowGovernanceSettings: { enabled: false } }
  );

  assert.equal(state.viewMode, 'ready');
  assert.equal(state.flowGovernance?.enabled, false);
  assert.equal(state.flowGovernance?.configSource, 'invalid');
  assert.deepEqual(
    state.flowGovernance?.diagnostics.map((diagnostic) => diagnostic.code),
    ['invalid-config']
  );
});

test('keeps disabled repository Flow Governance config available for reactivation after reload', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-governance-state-'));
  await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({
    schemaVersion: 1,
    enabled: false
  }));
  const repository = createRepository({
    root,
    head: createHead('main', 0, 0),
    refs: [
      createRef({ type: RefType.Head, name: 'main' }),
      createRef({ type: RefType.Head, name: 'feature/demo' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'feature/demo', kind: 'branch' }
      ]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );

  assert.equal(state.flowGovernance?.enabled, false);
  assert.equal(state.flowGovernance?.configSource, 'repository');
  assert.deepEqual(
    state.flowGovernance?.references.map((ref) => [ref.refName, ref.kind]),
    [
      ['main', 'main'],
      ['feature/demo', 'feature']
    ]
  );
  assert.ok(state.flowGovernance?.branchKinds.includes('feature'));
});

test('applies repository overlay refs before projecting a ready graph state', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createBranch({
      type: RefType.Head,
      name: 'release/2026',
      commit: 'head1',
      upstream: { remote: 'origin', name: 'release/2026' }
    }),
    refs: [
      createRef({ type: RefType.Head, name: 'release/2026', commit: 'head1' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/release/2026', commit: 'head1' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'origin/main', kind: 'remote' }
      ]
    }
  ]);
  let mergeBlockedSnapshotRefs: unknown;
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets(_repository, snapshot) {
      mergeBlockedSnapshotRefs = snapshot.graph.orderedCommits[0]?.refs;
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );

  assert.deepEqual(
    state.scene.nodes[0]?.refs,
    [
      { name: 'release/2026', kind: 'head' },
      { name: 'origin/release/2026', kind: 'remote' }
    ]
  );
  assert.deepEqual(mergeBlockedSnapshotRefs, state.scene.nodes[0]?.refs);
});

test('repository overlays prefer getRefs for current head commit when repository state lags after pull', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createBranch({ type: RefType.Head, name: 'master', commit: 'old-head' }),
    refs: [
      createRef({ type: RefType.Head, name: 'master', commit: 'new-head' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/master', commit: 'new-head' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'new-head',
      parents: ['old-head'],
      author: 'Ada',
      date: '2026-05-09',
      subject: 'Pulled update',
      refs: [{ name: 'origin/master', kind: 'remote' }]
    },
    {
      hash: 'old-head',
      parents: [],
      author: 'Ada',
      date: '2026-05-08',
      subject: 'Previous head',
      refs: [{ name: 'master', kind: 'head' }]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );
  const newHeadNode = state.scene.nodes.find((node) => node.hash === 'new-head');

  assert.deepEqual(
    newHeadNode?.refs,
    [
      { name: 'master', kind: 'head' },
      { name: 'origin/master', kind: 'remote' }
    ]
  );
  assert.equal(
    state.references.some((ref) => ref.name === 'master' && ref.kind === 'head' && ref.hash === 'old-head'),
    false
  );
  assert.deepEqual(state.primaryAncestorNextByHash, { 'new-head': 'old-head' });
});

test('reuses repository refs across snapshot loading and overlay in one ready-state request', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
    ]
  });
  const originalGetRefs = repository.getRefs.bind(repository);
  let getRefsCalls = 0;
  repository.getRefs = async (...args) => {
    getRefsCalls += 1;
    return originalGetRefs(...args);
  };
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-05-12',
      subject: 'Bootstrap',
      refs: [{ name: 'main', kind: 'head' }]
    }
  ]);
  let backendRepositoryRefCount = 0;
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot(_repository, _options, _limitPolicy, _signal, _trace, context) {
      backendRepositoryRefCount = (await Promise.resolve(context?.repositoryRefs ?? [])).length;
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );

  assert.equal(getRefsCalls, 1);
  assert.equal(backendRepositoryRefCount, 2);
  assert.deepEqual(
    state.scene.nodes[0]?.refs,
    [
      { name: 'main', kind: 'head' },
      { name: 'origin/main', kind: 'remote' }
    ]
  );
});

test('builds projection-only ready state from a reusable snapshot without loading Git history', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createBranch({ type: RefType.Head, name: 'main', commit: 'tip' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'tip' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'tip',
      parents: ['merge'],
      author: 'Ada',
      date: '2026-05-11',
      subject: 'Tip',
      refs: [{ name: 'main', kind: 'head' }]
    },
    {
      hash: 'merge',
      parents: ['left', 'right'],
      author: 'Ada',
      date: '2026-05-10',
      subject: 'Merge topic',
      refs: []
    },
    {
      hash: 'left',
      parents: [],
      author: 'Ada',
      date: '2026-05-09',
      subject: 'Left root',
      refs: []
    },
    {
      hash: 'right',
      parents: [],
      author: 'Ada',
      date: '2026-05-09',
      subject: 'Right root',
      refs: []
    }
  ]);
  let loadGraphSnapshotCalls = 0;
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      loadGraphSnapshotCalls += 1;
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const bundle = await buildReadyRevisionGraphViewStateBundleFromSnapshot(
    repository,
    {
      ...createDefaultRevisionGraphProjectionOptions(),
      showMergeCommits: true
    },
    backend,
    {
      graph,
      loadedAt: Date.now(),
      requestedLimit: 6000
    }
  );

  assert.equal(loadGraphSnapshotCalls, 0);
  assert.equal(bundle.snapshot.graph.orderedCommits.length, graph.orderedCommits.length);
  assert.equal(
    bundle.state.scene.nodes.some((node) => node.hash === 'merge'),
    true
  );
});

test('scene layout keys include edge topology to avoid stale node offsets', () => {
  const scene = {
    nodes: [
      {
        hash: 'parent',
        refs: [{ name: 'main', kind: 'head' as const }],
        author: 'Ada',
        date: '2026-05-02',
        subject: 'Parent',
        x: 220,
        row: 0,
        lane: 1
      },
      {
        hash: 'child-a',
        refs: [{ name: 'feature/a', kind: 'branch' as const }],
        author: 'Ada',
        date: '2026-05-02',
        subject: 'Child A',
        x: 0,
        row: 1,
        lane: 0
      },
      {
        hash: 'child-b',
        refs: [{ name: 'feature/b', kind: 'branch' as const }],
        author: 'Ada',
        date: '2026-05-02',
        subject: 'Child B',
        x: 440,
        row: 1,
        lane: 2
      }
    ],
    edges: [
      { from: 'child-a', to: 'parent' }
    ],
    laneCount: 3,
    rowCount: 2
  };
  const nodeLayouts = buildNodeLayouts(scene);

  assert.notEqual(
    buildRevisionGraphSceneLayoutKey(nodeLayouts, scene.edges),
    buildRevisionGraphSceneLayoutKey(nodeLayouts, [{ from: 'child-b', to: 'parent' }])
  );
});

test('builds the empty state without rebuilding the shell', () => {
  const state = buildEmptyRevisionGraphViewState(true, createDefaultRevisionGraphProjectionOptions());

  assert.equal(state.viewMode, 'empty');
  assert.equal(state.hasRepositories, true);
  assert.deepEqual(state.publishedLocalBranchNames, []);
  assert.match(state.emptyMessage ?? '', /Choose a repository/);
  assert.equal(state.scene.nodes.length, 0);
  assert.equal(state.references.length, 0);
});

test('does not mark branches with inherited upstream tracking as published', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('teste01', 0, 0, { remote: 'origin', name: 'auth_version_copy' }),
    refs: [
      createRef({ type: RefType.Head, name: 'teste01' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/auth_version_copy' })
    ]
  });
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Branch from auth version',
      refs: [
        { name: 'teste01', kind: 'head' },
        { name: 'origin/auth_version_copy', kind: 'remote' }
      ]
    }
  ]);
  const backend: RevisionGraphStateBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    backend,
    LIMIT_POLICY
  );

  assert.equal(state.currentHeadUpstreamName, 'origin/auth_version_copy');
  assert.deepEqual(state.publishedLocalBranchNames, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import {
  buildMetadataPatchedRevisionGraphViewFingerprint,
  canPreserveRevisionGraphContext,
  buildEmptyRevisionGraphViewState,
  buildMetadataPatchedRevisionGraphViewState,
  buildRevisionGraphWorkspaceStatePatch,
  buildRevisionGraphSceneLayoutKey,
  buildRevisionGraphViewFingerprint,
  buildReadyRevisionGraphViewState
} from '../src/revisionGraph/panel/state';
import { buildNodeLayouts } from '../src/revisionGraph/webview/shared';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createBranch, createChange, createHead, createRef, createRepository } from './fakes';

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
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  assert.equal(state.viewMode, 'ready');
  assert.equal(state.currentHeadName, 'main');
  assert.equal(state.currentHeadUpstreamName, 'origin/main');
  assert.deepEqual(state.publishedLocalBranchNames, ['main']);
  assert.equal(state.autoArrangeOnInit, true);
  assert.equal(state.scene.nodes.length, 1);
  assert.equal(state.references.length, 2);
  assert.match(state.sceneLayoutKey, /^fanout-balance-v1:[A-Za-z0-9_-]+$/);
  assert.equal(state.loading, false);
  assert.equal(state.errorMessage, undefined);
});

test('builds a lightweight workspace state patch without graph scene data', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts' })]
  });

  assert.deepEqual(
    buildRevisionGraphWorkspaceStatePatch(repository),
    {
      isWorkspaceDirty: true,
      hasMergeConflicts: true,
      hasConflictedMerge: false
    }
  );
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
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets(_repository, snapshot) {
      mergeBlockedSnapshotRefs = snapshot.graph.orderedCommits[0]?.refs;
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
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
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const state = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  assert.equal(state.currentHeadUpstreamName, 'origin/auth_version_copy');
  assert.deepEqual(state.publishedLocalBranchNames, []);
});

test('patches visible refs and head metadata without rebuilding the scene topology', async () => {
  const refs = [
    createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
    createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
  ];
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs,
    workingTreeChanges: []
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
        { name: 'origin/main', kind: 'remote' },
        { name: 'stash', kind: 'stash' }
      ]
    }
  ]);
  const snapshot = {
    graph,
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const initialState = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  refs.splice(
    0,
    refs.length,
    createRef({ type: RefType.Head, name: 'release/2026', commit: 'head1' }),
    createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
  );
  (repository.state.workingTreeChanges as ReturnType<typeof createChange>[]).push(
    createChange({ uriPath: '/workspace/repo/src/app.ts' })
  );
  (repository.state as { HEAD: ReturnType<typeof createBranch> }).HEAD = createBranch({
    type: RefType.Head,
    name: 'release/2026',
    commit: 'head1',
    upstream: { remote: 'origin', name: 'main' }
  });

  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    initialState,
    repository,
    backend,
    snapshot
  );

  assert.ok(patchedState);
  assert.equal(patchedState?.currentHeadName, 'release/2026');
  assert.equal(patchedState?.isWorkspaceDirty, true);
  assert.equal(patchedState?.autoArrangeOnInit, false);
  assert.equal(patchedState?.sceneLayoutKey, initialState.sceneLayoutKey);
  assert.deepEqual(
    patchedState?.scene.nodes[0]?.refs,
    [
      { name: 'release/2026', kind: 'head' },
      { name: 'origin/main', kind: 'remote' },
      { name: 'stash', kind: 'stash' }
    ]
  );
});

test('metadata patches load the complete repository refs instead of relying only on repository.state.refs', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
    ]
  });
  repository.getRefs = async () => [
    createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
    createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' }),
    createRef({ type: RefType.Tag, name: 'v1.0.0', commit: 'head1' })
  ];

  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: [],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Bootstrap',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'origin/main', kind: 'remote' },
        { name: 'v1.0.0', kind: 'tag' }
      ]
    }
  ]);
  const snapshot = {
    graph,
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const initialState = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    initialState,
    repository,
    backend,
    snapshot
  );

  assert.ok(patchedState);
  assert.deepEqual(
    patchedState?.scene.nodes[0]?.refs,
    [
      { name: 'main', kind: 'head' },
      { name: 'origin/main', kind: 'remote' },
      { name: 'v1.0.0', kind: 'tag' }
    ]
  );
});

test('metadata patches ignore non-head refs whose tips are missing from the current snapshot', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  repository.getRefs = async () => [
    createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
    createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head2' })
  ];

  const snapshot = {
    graph: buildCommitGraph([
      {
        hash: 'head1',
        parents: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        refs: [{ name: 'main', kind: 'head' }]
      }
    ]),
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const initialState = await buildReadyRevisionGraphViewState(
    createRepository({
      root: '/workspace/repo',
      head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
      refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
    }),
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    initialState,
    repository,
    backend,
    snapshot
  );

  assert.ok(patchedState);
  assert.deepEqual(
    patchedState?.scene.nodes[0]?.refs,
    [{ name: 'main', kind: 'head' }]
  );
});

test('metadata patches still decline when the current head is missing from the current snapshot', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createBranch({ type: RefType.Head, name: 'feature/missing', commit: 'head2' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
      createRef({ type: RefType.Head, name: 'feature/missing', commit: 'head2' })
    ]
  });
  repository.getRefs = async () => [
    createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
    createRef({ type: RefType.Head, name: 'feature/missing', commit: 'head2' })
  ];

  const snapshot = {
    graph: buildCommitGraph([
      {
        hash: 'head1',
        parents: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        refs: [{ name: 'main', kind: 'head' }]
      }
    ]),
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const initialState = await buildReadyRevisionGraphViewState(
    createRepository({
      root: '/workspace/repo',
      head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
      refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
    }),
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );

  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    initialState,
    repository,
    backend,
    snapshot
  );

  assert.equal(patchedState, undefined);
});

test('metadata patch ref loading rethrows abort errors instead of silently falling back', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  repository.getRefs = async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      throw new Error('not used');
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };
  const readyState = await buildReadyRevisionGraphViewState(
    createRepository({
      root: '/workspace/repo',
      head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
      refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
    }),
    createDefaultRevisionGraphProjectionOptions(),
    true,
    {
      async loadGraphSnapshot() {
        return {
          graph: buildCommitGraph([
            {
              hash: 'head1',
              parents: [],
              author: 'Ada',
              date: '2026-04-08',
              subject: 'Bootstrap',
              refs: [{ name: 'main', kind: 'head' }]
            }
          ]),
          loadedAt: Date.now(),
          requestedLimit: 6000
        };
      },
      async loadRevisionLog() {
        return { entries: [], hasMore: false };
      },
      async loadUnifiedDiff() {
        return '';
      },
      async loadCommitDetails() {
        return '';
      },
      async getMergeBlockedTargets() {
        return [];
      }
    },
    LIMIT_POLICY
  );
  const snapshot = {
    graph: buildCommitGraph([
      {
        hash: 'head1',
        parents: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        refs: [{ name: 'main', kind: 'head' }]
      }
    ]),
    loadedAt: Date.now(),
    requestedLimit: 6000
  };

  await assert.rejects(
    buildMetadataPatchedRevisionGraphViewState(readyState, repository, backend, snapshot),
    /aborted/
  );
});

test('recognizes when a ready-state refresh can preserve the current graph context', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
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
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return {
        graph,
        loadedAt: Date.now(),
        requestedLimit: 6000
      };
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const initialState = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );
  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    initialState,
    repository,
    backend,
    {
      graph,
      loadedAt: Date.now(),
      requestedLimit: 6000
    }
  );

  assert.ok(patchedState);
  assert.equal(canPreserveRevisionGraphContext(initialState, patchedState), true);
  assert.equal(
    canPreserveRevisionGraphContext(
      initialState,
      {
        ...patchedState,
        repositoryPath: '/workspace/other',
        sceneLayoutKey: patchedState.sceneLayoutKey
      }
    ),
    false
  );
});

test('patched metadata fingerprints match the already-applied ready state when nothing else changed', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [
      createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
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
  const snapshot = {
    graph,
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const readyState = await buildReadyRevisionGraphViewState(
    repository,
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );
  const patchedFingerprint = await buildMetadataPatchedRevisionGraphViewFingerprint(
    readyState,
    repository,
    snapshot
  );

  assert.equal(
    patchedFingerprint,
    buildRevisionGraphViewFingerprint(readyState)
  );
});

test('metadata patch fingerprints use the same complete ref set as the applied patch state', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  repository.getRefs = async () => [
    createRef({ type: RefType.Head, name: 'main', commit: 'head1' }),
    createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' }),
    createRef({ type: RefType.Tag, name: 'v1.0.0', commit: 'head1' })
  ];
  const snapshot = {
    graph: buildCommitGraph([
      {
        hash: 'head1',
        parents: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        refs: [
          { name: 'main', kind: 'head' },
          { name: 'origin/main', kind: 'remote' },
          { name: 'v1.0.0', kind: 'tag' }
        ]
      }
    ]),
    loadedAt: Date.now(),
    requestedLimit: 6000
  };
  const backend: RevisionGraphBackend = {
    async loadGraphSnapshot() {
      return snapshot;
    },
    async loadRevisionLog() {
      return { entries: [], hasMore: false };
    },
    async loadUnifiedDiff() {
      return '';
    },
    async loadCommitDetails() {
      return '';
    },
    async getMergeBlockedTargets() {
      return [];
    }
  };

  const readyState = await buildReadyRevisionGraphViewState(
    createRepository({
      root: '/workspace/repo',
      head: createHead('main', 0, 0, { remote: 'origin', name: 'main' }),
      refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
    }),
    createDefaultRevisionGraphProjectionOptions(),
    true,
    backend,
    LIMIT_POLICY
  );
  const patchedState = await buildMetadataPatchedRevisionGraphViewState(
    readyState,
    repository,
    backend,
    snapshot
  );
  const fingerprint = await buildMetadataPatchedRevisionGraphViewFingerprint(
    readyState,
    repository,
    snapshot
  );

  assert.ok(patchedState);
  assert.equal(
    fingerprint,
    buildRevisionGraphViewFingerprint({
      repositoryPath: patchedState!.repositoryPath,
      currentHeadName: patchedState!.currentHeadName,
      currentHeadUpstreamName: patchedState!.currentHeadUpstreamName,
      publishedLocalBranchNames: patchedState!.publishedLocalBranchNames,
      isWorkspaceDirty: patchedState!.isWorkspaceDirty,
      hasMergeConflicts: patchedState!.hasMergeConflicts,
      hasConflictedMerge: patchedState!.hasConflictedMerge,
      sceneLayoutKey: patchedState!.sceneLayoutKey,
      references: patchedState!.references
    })
  );
});

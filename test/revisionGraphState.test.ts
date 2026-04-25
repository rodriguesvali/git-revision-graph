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
  buildRevisionGraphViewFingerprint,
  buildReadyRevisionGraphViewState
} from '../src/revisionGraph/panel/state';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createBranch, createChange, createHead, createRef, createRepository } from './fakes';

const LIMIT_POLICY: RevisionGraphLimitPolicy = {
  initialLimit: 6000,
  steppedLimits: [6000, 12000],
  minVisibleNodes: 24
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
  assert.equal(state.autoArrangeOnInit, true);
  assert.equal(state.scene.nodes.length, 1);
  assert.equal(state.references.length, 2);
  assert.match(state.sceneLayoutKey, /^head1:0:/);
  assert.equal(state.loading, false);
  assert.equal(state.errorMessage, undefined);
});

test('builds the empty state without rebuilding the shell', () => {
  const state = buildEmptyRevisionGraphViewState(true, createDefaultRevisionGraphProjectionOptions());

  assert.equal(state.viewMode, 'empty');
  assert.equal(state.hasRepositories, true);
  assert.match(state.emptyMessage ?? '', /Choose a repository/);
  assert.equal(state.scene.nodes.length, 0);
  assert.equal(state.references.length, 0);
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

test('metadata patches decline refs whose tips are missing from the current snapshot', async () => {
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
      isWorkspaceDirty: patchedState!.isWorkspaceDirty,
      sceneLayoutKey: patchedState!.sceneLayoutKey,
      references: patchedState!.references
    })
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import {
  buildEmptyRevisionGraphViewState,
  buildMetadataPatchedRevisionGraphViewState,
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
      return [];
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
      return [];
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
      { name: 'release/2026', kind: 'branch' },
      { name: 'origin/main', kind: 'remote' }
    ]
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import { buildReadyRevisionGraphViewState, buildEmptyRevisionGraphViewState } from '../src/revisionGraph/panel/state';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createHead, createRef, createRepository } from './fakes';

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

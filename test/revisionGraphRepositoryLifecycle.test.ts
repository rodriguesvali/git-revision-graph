import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import type { RevisionGraphRepositoryLifecycleHost } from '../src/revisionGraph/repository/lifecycle';
import { RevisionGraphViewState, createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createApi, createChange, createHead, createRef, createRepository } from './fakes';

test('repository lifecycle enriches refresh requests with the current repository', () => {
  const { RevisionGraphRepositoryLifecycle } = loadRepositoryLifecycleModule();
  const repository = createRepository({ root: '/workspace/repo' });
  const lifecycle = new RevisionGraphRepositoryLifecycle(createApi([repository]), createHost());

  assert.equal(lifecycle.getCurrentRepository(), repository);
  assert.deepEqual(lifecycle.resolveRefreshRequest('full-rebuild'), {
    intent: 'full-rebuild',
    repositoryPath: '/workspace/repo',
    followUpEvents: ['state', 'checkout']
  });
  assert.deepEqual(lifecycle.resolveRefreshRequest({
    intent: 'projection-only',
    repositoryPath: '/workspace/other',
    followUpEvents: []
  }), {
    intent: 'projection-only',
    repositoryPath: '/workspace/other',
    followUpEvents: []
  });
});

test('repository lifecycle reports current repository changes only when the path changes', () => {
  const { RevisionGraphRepositoryLifecycle } = loadRepositoryLifecycleModule();
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });
  const changes: boolean[] = [];
  const changing: string[] = [];
  const lifecycle = new RevisionGraphRepositoryLifecycle(
    createApi([repoA, repoB]),
    createHost({
      onCurrentRepositoryChanging(repository) {
        changing.push(repository.rootUri.fsPath);
      },
      onCurrentRepositoryChanged(repositoryChanged) {
        changes.push(repositoryChanged);
      }
    })
  );

  assert.equal(lifecycle.getCurrentRepository(), undefined);

  lifecycle.setCurrentRepository(repoA);
  lifecycle.setCurrentRepository(repoA);
  lifecycle.setCurrentRepository(repoB);

  assert.deepEqual(changing, ['/workspace/a']);
  assert.deepEqual(changes, [true, false, true]);
  assert.equal(lifecycle.getCurrentRepository(), repoB);
});

test('repository lifecycle suppresses prepared follow-up repository events', () => {
  const { RevisionGraphRepositoryLifecycle } = loadRepositoryLifecycleModule();
  const repository = createRepository({ root: '/workspace/repo' });
  const lifecycle = new RevisionGraphRepositoryLifecycle(createApi([repository]), createHost());

  const prepared = lifecycle.prepareRefresh('full-rebuild');
  assert.notEqual(prepared, undefined);
  assert.equal(lifecycle.consumePendingFollowUpRefresh(repository, 'state'), true);

  const cancelLifecycle = new RevisionGraphRepositoryLifecycle(createApi([repository]), createHost());
  const cancelled = cancelLifecycle.prepareRefresh('full-rebuild');
  assert.notEqual(cancelled, undefined);
  cancelled?.cancel();
  assert.equal(cancelLifecycle.consumePendingFollowUpRefresh(repository, 'checkout'), false);
});

test('repository lifecycle applies status-only repository updates after a ready signature exists', () => {
  const { RevisionGraphRepositoryLifecycle } = loadRepositoryLifecycleModule();
  const cleanRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })]
  });
  const dirtyRepository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main', commit: 'head1' })],
    workingTreeChanges: [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  });
  const lifecycle = new RevisionGraphRepositoryLifecycle(createApi([cleanRepository]), createHost());
  const state = createReadyRevisionGraphState();

  assert.deepEqual(lifecycle.tryApplyRepositoryStatusUpdate(cleanRepository, state), {
    handled: false
  });

  const result = lifecycle.tryApplyRepositoryStatusUpdate(dirtyRepository, state);

  assert.equal(result.handled, true);
  assert.notEqual(result.state, undefined);
  assert.equal(result.state?.isWorkspaceDirty, true);
  assert.equal(result.state?.scene, state.scene);
});

function withVscodeMock<T>(loadModule: () => T): T {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  const vscodeMock = {
    Disposable: {
      from(...disposables: Array<{ dispose(): void }>) {
        return {
          dispose() {
            for (const disposable of disposables) {
              disposable.dispose();
            }
          }
        };
      }
    }
  };

  try {
    moduleLoader._load = function loadWithVscodeMock(
      request: string,
      parent: NodeModule | null,
      isMain: boolean
    ): unknown {
      if (request === 'vscode') {
        return vscodeMock;
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    return loadModule();
  } finally {
    moduleLoader._load = originalLoad;
  }
}

function loadRepositoryLifecycleModule(): typeof import('../src/revisionGraph/repository/lifecycle') {
  return withVscodeMock(() => {
    const modulePath = require.resolve('../src/revisionGraph/repository/lifecycle');
    delete require.cache[modulePath];
    return require('../src/revisionGraph/repository/lifecycle') as typeof import('../src/revisionGraph/repository/lifecycle');
  });
}

function createHost(
  overrides: Partial<RevisionGraphRepositoryLifecycleHost> = {}
): RevisionGraphRepositoryLifecycleHost {
  return {
    onCurrentRepositoryChanging() {},
    onCurrentRepositoryChanged() {},
    onRepositoryClosed() {},
    onRepositorySetChanged() {},
    onRepositoryStateChange() {},
    ...overrides
  };
}

function createReadyRevisionGraphState(): RevisionGraphViewState {
  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: '/workspace/repo',
    currentHeadName: 'main',
    currentHeadUpstreamName: undefined,
    publishedLocalBranchNames: [],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
    projectionOptions: createDefaultRevisionGraphProjectionOptions(),
    mergeBlockedTargets: [],
    primaryAncestorNextByHash: {},
    scene: {
      nodes: [
        {
          hash: 'head1',
          row: 0,
          lane: 0,
          x: 0,
          refs: [{ name: 'main', kind: 'head' }],
          author: 'Ada',
          date: '2026-06-11',
          subject: 'Main'
        }
      ],
      edges: [],
      laneCount: 1,
      rowCount: 1
    },
    nodeLayouts: [],
    references: [
      { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head', title: 'main' }
    ],
    sceneLayoutKey: 'layout',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

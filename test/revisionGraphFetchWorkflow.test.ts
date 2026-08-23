import test from 'node:test';
import assert from 'node:assert/strict';

import type { RevisionGraphFetchWorkflowHost } from '../src/revisionGraph/fetchWorkflow';
import type { RevisionGraphRefreshRequest } from '../src/revisionGraphRefresh';
import { createRepository } from './fakes';

test('Fetch prepares one subtle full refresh before mutating repository state', async (t) => {
  installVscodeQuickPickMock(t, [{ id: 'prune' }]);
  const { runRevisionGraphFetchWorkflow } = loadFetchWorkflow();
  const repository = createRepository({ root: '/workspace/repo' });
  const events: string[] = [];
  repository.fetch = async (options) => {
    events.push(`fetch:${String(options?.prune)}`);
  };
  const request: RevisionGraphRefreshRequest = {
    intent: 'full-rebuild',
    repositoryPath: '/workspace/repo',
    followUpEvents: ['state', 'checkout'],
    clearSnapshotCache: true,
    loadingMode: 'subtle'
  };
  const refreshed: unknown[] = [];
  const host = createHost(events, request, refreshed);

  await runRevisionGraphFetchWorkflow(repository, host);

  assert.deepEqual(events, [
    'create-refresh',
    'prepare-refresh',
    'loading:Fetching remotes...:subtle',
    'fetch:true',
    'info:Fetch completed for repo (Prune).',
    'refresh'
  ]);
  assert.equal(refreshed[0], request);
});

test('Fetch cancels its prepared refresh and restores state when Git fails', async (t) => {
  installVscodeQuickPickMock(t, [{ id: 'prune' }]);
  const { runRevisionGraphFetchWorkflow } = loadFetchWorkflow();
  const repository = createRepository({ root: '/workspace/repo' });
  repository.fetch = async () => {
    throw new Error('network unavailable');
  };
  const events: string[] = [];
  const host = createHost(events, { intent: 'full-rebuild' }, []);

  await runRevisionGraphFetchWorkflow(repository, host);

  assert.deepEqual(events, [
    'create-refresh',
    'prepare-refresh',
    'loading:Fetching remotes...:subtle',
    'cancel-refresh',
    'error:Could not fetch the current repository. network unavailable',
    'current-state'
  ]);
});

function createHost(
  events: string[],
  request: RevisionGraphRefreshRequest,
  refreshed: unknown[]
): RevisionGraphFetchWorkflowHost {
  return {
    ui: {
      showInformationMessage(message) {
        events.push(`info:${message}`);
      },
      async showErrorMessage(message) {
        events.push(`error:${message}`);
      }
    },
    postActionLoading(label, mode) {
      events.push(`loading:${label}:${String(mode)}`);
    },
    postCurrentState() {
      events.push('current-state');
    },
    prepareRefresh(preparedRequest) {
      events.push('prepare-refresh');
      assert.equal(preparedRequest, request);
      return {
        cancel() {
          events.push('cancel-refresh');
        }
      };
    },
    async refresh(refreshRequest) {
      events.push('refresh');
      refreshed.push(refreshRequest);
    },
    createCurrentRepositoryRefreshRequest() {
      events.push('create-refresh');
      return request;
    },
    getCurrentRepositoryLabel() {
      return 'repo';
    }
  };
}

function installVscodeQuickPickMock(t: test.TestContext, result: unknown): void {
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function loadWithVscodeMock(request, parent, isMain): unknown {
    if (request === 'vscode') {
      return {
        window: {
          showQuickPick: async () => result
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  t.after(() => {
    moduleLoader._load = originalLoad;
  });
}

function loadFetchWorkflow(): typeof import('../src/revisionGraph/fetchWorkflow') {
  const modulePath = require.resolve('../src/revisionGraph/fetchWorkflow');
  delete require.cache[modulePath];
  return require(modulePath) as typeof import('../src/revisionGraph/fetchWorkflow');
}

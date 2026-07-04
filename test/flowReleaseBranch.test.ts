import test from 'node:test';
import assert from 'node:assert/strict';

import { RefActionServices } from '../src/refActions';
import {
  DEFAULT_FLOW_CONFIG,
  resolveFlowReleaseBranchName,
  startFlowReleaseBranch
} from '../src/revisionGraph/flow';
import { RefType } from '../src/git';
import { createBranch, createRepository } from './fakes';

test('Flow Governance release branch names follow the configured release pattern', () => {
  assert.deepEqual(
    resolveFlowReleaseBranchName('2.0.0', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'release/2.0.0' }
  );
  assert.deepEqual(
    resolveFlowReleaseBranchName('release/2.0.0', DEFAULT_FLOW_CONFIG),
    { ok: true, branchName: 'release/2.0.0' }
  );
  assert.deepEqual(
    resolveFlowReleaseBranchName('2026.07', {
      patterns: {
        ...DEFAULT_FLOW_CONFIG.patterns,
        release: '^releases/.+'
      }
    }),
    { ok: true, branchName: 'releases/2026.07' }
  );
  assert.equal(
    resolveFlowReleaseBranchName('bad release name', DEFAULT_FLOW_CONFIG).ok,
    false
  );
});

test('Flow Governance starts a local release branch from main', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const informationMessages: string[] = [];
  const upstreamClears: string[] = [];
  const refreshes: unknown[] = [];
  const services = createReleaseServices({ informationMessages, upstreamClears, refreshes });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, [{
    name: 'release/2.0.0',
    checkout: true,
    ref: 'main'
  }]);
  assert.deepEqual(upstreamClears, ['release/2.0.0']);
  assert.equal(refreshes.length, 1);
  assert.match(informationMessages[0] ?? '', /Release branch release\/2\.0\.0 was created/);
});

test('Flow Governance refuses an existing release branch before mutation', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createBranch({ type: RefType.Head, name: 'release/2.0.0' })
    ]
  });
  const errors: string[] = [];
  const services = createReleaseServices({ errors });

  await startFlowReleaseBranch(repository, {
    sourceBranch: 'main',
    name: '2.0.0',
    config: DEFAULT_FLOW_CONFIG
  }, services);

  assert.deepEqual(repository.calls.createBranch, []);
  assert.match(errors[0] ?? '', /already exists/);
});

function createReleaseServices(options: {
  readonly errors?: string[];
  readonly informationMessages?: string[];
  readonly upstreamClears?: string[];
  readonly refreshes?: unknown[];
} = {}): RefActionServices {
  return {
    ui: {
      async pickChange() { return undefined; },
      async pickRemoteName() { return undefined; },
      async promptBranchName() { return undefined; },
      async promptTagName() { return undefined; },
      async promptRemoteBranchCheckout() { return undefined; },
      async pickCurrentBranchPushMode() { return undefined; },
      async confirm() { return false; },
      showInformationMessage(message) { options.informationMessages?.push(message); },
      showWarningMessage() {},
      async showErrorMessage(message) { options.errors?.push(message); },
      async showSourceControl() {}
    },
    diffPresenter: {
      async openBetweenRefs() {},
      async openWithWorktree() {}
    },
    compareResultsPresenter: {
      async showBetweenRefs() {},
      async showWithWorktree() {}
    },
    refreshController: {
      prepare() {
        return { cancel() {} };
      },
      refresh(request) {
        options.refreshes?.push(request);
      }
    },
    referenceManager: {
      async createTag() {},
      async resetBranch() {},
      async resetCurrentBranch() {},
      async getRemoteNames() { return []; },
      async pushCurrentBranch() { return true; },
      async pushTag() {},
      async deleteRemoteTag() {},
      async deleteRemoteBranch() {},
      async unsetBranchUpstream(_repository, branchName) {
        options.upstreamClears?.push(branchName);
      },
      async abortMerge() {},
      async stashSave() {},
      async stashApply() {},
      async stashPop() {},
      async stashDrop() {}
    },
    ancestryInspector: {
      async isRefAncestorOfHead() { return false; }
    },
    formatPath(fsPath) {
      return fsPath;
    }
  };
}

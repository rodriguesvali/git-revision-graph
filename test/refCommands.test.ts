import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType, Status } from '../src/git';
import {
  normalizeRefreshRequest,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequest
} from '../src/revisionGraphRefresh';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference, RefCommandServices } from '../src/refCommands';
import { createApi, createChange, createHead, createRef, createRepository } from './fakes';

function createServices(overrides: Partial<RefCommandServices['ui']> = {}): {
  readonly services: RefCommandServices;
  readonly infoMessages: string[];
  readonly errorMessages: string[];
  readonly diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }>;
  readonly compareResultsCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string; readonly changeCount: number }>;
  readonly refreshCalls: number;
  readonly refreshIntents: readonly RevisionGraphRefreshIntent[];
  readonly refreshRequests: readonly RevisionGraphRefreshRequest[];
} {
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];
  const diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }> = [];
  const compareResultsCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string; readonly changeCount: number }> = [];
  const refreshRequests: RevisionGraphRefreshRequest[] = [];

  const services: RefCommandServices = {
    ui: {
      async pickRepository(items) {
        return items[0]?.repository;
      },
      async pickReference(items) {
        return items[0];
      },
      async pickChange(items) {
        return items[0];
      },
      async promptBranchName(options) {
        return options.value;
      },
      async promptTagName() {
        return 'v1.0.0';
      },
      async confirm() {
        return true;
      },
      showInformationMessage(message) {
        infoMessages.push(message);
      },
      showWarningMessage(message) {
        infoMessages.push(message);
      },
      async showErrorMessage(message) {
        errorMessages.push(message);
      },
      async showSourceControl() {
        return;
      },
      ...overrides
    },
    diffPresenter: {
      async openBetweenRefs(_repository, _change, leftRef, rightRef) {
        diffCalls.push({ kind: 'between', refA: leftRef, refB: rightRef });
      },
      async openWithWorktree(_repository, _change, ref) {
        diffCalls.push({ kind: 'worktree', refA: ref });
      }
    },
    compareResultsPresenter: {
      async showBetweenRefs(_repository, left, right, changes) {
        compareResultsCalls.push({
          kind: 'between',
          refA: left.refName,
          refB: right.refName,
          changeCount: changes.length
        });
      },
      async showWithWorktree(_repository, target, changes) {
        compareResultsCalls.push({
          kind: 'worktree',
          refA: target.refName,
          changeCount: changes.length
        });
      }
    },
    refreshController: {
      prepare(_request) {
        return undefined;
      },
      refresh(request) {
        refreshRequests.push(normalizeRefreshRequest(request));
      }
    },
    referenceManager: {
      async createTag() {},
      async deleteRemoteBranch() {},
      async unsetBranchUpstream() {}
    },
    ancestryInspector: {
      async isRefAncestorOfHead() {
        return false;
      }
    },
    formatPath(fsPath) {
      return fsPath;
    }
  };

  return {
    services,
    infoMessages,
    errorMessages,
    diffCalls,
    compareResultsCalls,
    refreshRequests,
    get refreshIntents() {
      return refreshRequests.map((request) => request.intent);
    },
    get refreshCalls() {
      return refreshRequests.length;
    }
  };
}

test('compareRefs resolves multi-repo workspaces and populates the persistent compare results view', async () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({
    root: '/workspace/b',
    refs: [
      createRef({ type: RefType.Head, name: 'main' }),
      createRef({ type: RefType.Tag, name: 'v1.0.0' })
    ],
    diffBetween: [createChange({ uriPath: '/workspace/b/src/file.ts', status: Status.MODIFIED })]
  });
  const api = createApi([repoA, repoB]);
  const { services, diffCalls, compareResultsCalls } = createServices({
    async pickRepository(items) {
      return items[1].repository;
    },
    async pickReference(items, placeHolder) {
      return placeHolder.includes('primeira') ? items[0] : items[0];
    }
  });

  await compareRefs(api, undefined, services);

  assert.deepEqual(diffCalls, []);
  assert.deepEqual(compareResultsCalls, [
    { kind: 'between', refA: 'main', refB: 'v1.0.0', changeCount: 1 }
  ]);
});

test('compareWithWorktree reports when there are no changes', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [createRef({ type: RefType.Head, name: 'main' })],
    diffWith: []
  });
  const harness = createServices();

  await compareWithWorktree(createApi([repository]), undefined, harness.services);

  assert.deepEqual(harness.diffCalls, []);
  assert.equal(harness.infoMessages[0], 'The worktree is already aligned with main.');
});

test('checkoutReference short-circuits when the selected branch is already current', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main' })]
  });
  const harness = createServices();

  await checkoutReference(createApi([repository]), undefined, harness.services);

  assert.deepEqual(repository.calls.checkout, []);
  assert.equal(harness.infoMessages[0], 'main is already checked out.');
  assert.equal(harness.refreshCalls, 0);
});

test('checkoutReference creates and tracks a local branch for remote refs with nested names', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/feature/demo' })]
  });
  const harness = createServices();

  await checkoutReference(createApi([repository]), undefined, harness.services);

  assert.deepEqual(repository.calls.createBranch, [
    { name: 'feature/demo', checkout: true, ref: 'origin/feature/demo' }
  ]);
  assert.deepEqual(repository.calls.setBranchUpstream, [
    { name: 'feature/demo', upstream: 'origin/feature/demo' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was created and checked out from origin/feature/demo.');
  assert.equal(harness.refreshCalls, 0);
});

test('checkoutReference creates a branch when the selected reference is a tag', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [createRef({ type: RefType.Tag, name: 'v1.2.3' })]
  });
  const harness = createServices();

  await checkoutReference(createApi([repository]), undefined, harness.services);

  assert.deepEqual(repository.calls.checkout, []);
  assert.deepEqual(repository.calls.createBranch, [
    { name: 'v1.2.3', checkout: true, ref: 'v1.2.3' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch v1.2.3 was created and checked out from v1.2.3.');
  assert.equal(harness.refreshCalls, 0);
});

test('mergeReference prevents merging the current branch into itself', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main' })]
  });
  const { services, infoMessages } = createServices();

  await mergeReference(createApi([repository]), undefined, services);

  assert.deepEqual(repository.calls.merge, []);
  assert.equal(infoMessages[0], 'The current branch cannot be merged into itself.');
});

test('commands show empty-state feedback when no repository is available', async () => {
  const { services, infoMessages } = createServices();

  await compareRefs(createApi([]), undefined, services);

  assert.equal(infoMessages[0], 'No Git Repository Is Open in the Workspace.');
});

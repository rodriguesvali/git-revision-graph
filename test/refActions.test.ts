import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType, Status } from '../src/git';
import {
  createBranchFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  deleteResolvedReference,
  mergeResolvedReference,
  RefActionServices
} from '../src/refActions';
import { createChange, createHead, createRef, createRepository } from './fakes';

function createServices(overrides: Partial<RefActionServices['ui']> = {}): {
  readonly services: RefActionServices;
  readonly infoMessages: string[];
  readonly errorMessages: string[];
  readonly diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }>;
  readonly deletedRemoteBranches: Array<{ readonly remoteName: string; readonly branchName: string }>;
  readonly refreshCalls: number;
} {
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];
  const diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }> = [];
  const deletedRemoteBranches: Array<{ readonly remoteName: string; readonly branchName: string }> = [];
  const counter = { refreshCalls: 0 };

  const services: RefActionServices = {
    ui: {
      async pickChange(items) {
        return items[0];
      },
      async promptBranchName(options) {
        return options.value;
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
    refreshController: {
      refresh() {
        counter.refreshCalls += 1;
      },
      updateViewMessage() {
        counter.refreshCalls += 1;
      }
    },
    referenceManager: {
      async deleteRemoteBranch(_repository, remoteName, branchName) {
        deletedRemoteBranches.push({ remoteName, branchName });
      }
    },
    ancestryInspector: {
      async isRefAncestorOfHead() {
        return false;
      }
    },
    formatPath(fsPath) {
      return fsPath.replace('/workspace/repo/', '');
    }
  };

  return {
    services,
    infoMessages,
    errorMessages,
    diffCalls,
    deletedRemoteBranches,
    get refreshCalls() {
      return counter.refreshCalls;
    }
  };
}

test('compareResolvedRefs uses the shared compare workflow and labels', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffBetween: [createChange({ uriPath: '/workspace/repo/src/file.ts', status: Status.MODIFIED })]
  });
  const harness = createServices();

  await compareResolvedRefs(
    repository,
    { refName: 'main', label: 'main' },
    { refName: 'release/2026', label: 'release/2026' },
    harness.services
  );

  assert.deepEqual(harness.diffCalls, [{ kind: 'between', refA: 'main', refB: 'release/2026' }]);
});

test('checkoutResolvedReference keeps current branch behavior consistent across entrypoints', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'main' })]
  });
  const harness = createServices();

  await checkoutResolvedReference(
    repository,
    { refName: 'main', label: 'main', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(repository.calls.checkout, []);
  assert.equal(harness.infoMessages[0], 'main is already checked out.');
  assert.equal(harness.refreshCalls, 0);
});

test('checkoutResolvedReference resolves remote HEAD to a concrete upstream branch', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('develop'),
    refs: [
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/HEAD', commit: 'abc123' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'abc123' })
    ]
  });
  const harness = createServices();

  await checkoutResolvedReference(
    repository,
    { refName: 'origin/HEAD', label: 'origin/HEAD', kind: 'remote' },
    harness.services
  );

  assert.deepEqual(repository.calls.createBranch, [
    { name: 'main', checkout: true, ref: 'origin/main' }
  ]);
  assert.deepEqual(repository.calls.setBranchUpstream, [
    { name: 'main', upstream: 'origin/main' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch main was created and checked out from origin/main.');
  assert.equal(harness.refreshCalls, 2);
});

test('checkoutResolvedReference creates a branch from tags instead of checking them out directly', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Tag, name: 'v1.2.3' })]
  });
  const harness = createServices();

  await checkoutResolvedReference(
    repository,
    { refName: 'v1.2.3', label: 'v1.2.3', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(repository.calls.checkout, []);
  assert.deepEqual(repository.calls.createBranch, [
    { name: 'v1.2.3', checkout: true, ref: 'v1.2.3' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch v1.2.3 was created and checked out from v1.2.3.');
  assert.equal(harness.refreshCalls, 2);
});

test('createBranchFromResolvedReference creates a new branch from a local branch reference', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })]
  });
  const harness = createServices();

  await createBranchFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(repository.calls.checkout, []);
  assert.deepEqual(repository.calls.createBranch, [
    { name: 'release/2026-copy', checkout: true, ref: 'release/2026' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch release/2026-copy was created and checked out from release/2026.');
  assert.equal(harness.refreshCalls, 2);
});

test('createBranchFromResolvedReference keeps tracking information for remote refs', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/feature/demo' })]
  });
  const harness = createServices();

  await createBranchFromResolvedReference(
    repository,
    { refName: 'origin/feature/demo', label: 'origin/feature/demo', kind: 'remote' },
    harness.services
  );

  assert.deepEqual(repository.calls.createBranch, [
    { name: 'feature/demo', checkout: true, ref: 'origin/feature/demo' }
  ]);
  assert.deepEqual(repository.calls.setBranchUpstream, [
    { name: 'feature/demo', upstream: 'origin/feature/demo' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was created and checked out from origin/feature/demo.');
  assert.equal(harness.refreshCalls, 2);
});

test('mergeResolvedReference preserves the self-merge guard', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();

  await mergeResolvedReference(
    repository,
    { refName: 'main', label: 'main' },
    harness.services
  );

  assert.deepEqual(repository.calls.merge, []);
  assert.equal(harness.infoMessages[0], 'The current branch cannot be merged into itself.');
});

test('mergeResolvedReference prevents merges that are already ancestors of HEAD', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.ancestryInspector.isRefAncestorOfHead = async () => true;

  await mergeResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026' },
    harness.services
  );

  assert.deepEqual(repository.calls.merge, []);
  assert.equal(harness.infoMessages[0], 'release/2026 is already contained in main.');
});

test('deleteResolvedReference deletes remote branches through the shared reference manager', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'origin/feature/demo', label: 'origin/feature/demo', kind: 'remote' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteBranches, [
    { remoteName: 'origin', branchName: 'feature/demo' }
  ]);
  assert.equal(harness.infoMessages[0], 'Remote branch origin/feature/demo was deleted from origin.');
  assert.equal(harness.refreshCalls, 2);
});

test('deleteResolvedReference refuses to delete remote HEAD aliases', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'origin/HEAD', label: 'origin/HEAD', kind: 'remote' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteBranches, []);
  assert.equal(harness.infoMessages[0], 'The remote reference origin/HEAD cannot be deleted from this view.');
});

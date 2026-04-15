import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType, Status } from '../src/git';
import {
  normalizeRefreshRequest,
  RevisionGraphRefreshIntent,
  RevisionGraphRefreshRequest
} from '../src/revisionGraphRefresh';
import {
  createBranchFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  RefActionServices,
  syncCurrentHeadWithUpstream
} from '../src/refActions';
import { isMissingUpstreamConfigurationError } from '../src/refActions/shared';
import { createChange, createHead, createRef, createRepository } from './fakes';

function createServices(overrides: Partial<RefActionServices['ui']> = {}): {
  readonly services: RefActionServices;
  readonly infoMessages: string[];
  readonly warningMessages: string[];
  readonly errorMessages: string[];
  readonly sourceControlOpens: number;
  readonly confirmRequests: Array<{ readonly message: string; readonly confirmLabel: string }>;
  readonly diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }>;
  readonly compareResultsCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string; readonly changeCount: number }>;
  readonly compareResultsClears: number;
  readonly deletedRemoteBranches: Array<{ readonly remoteName: string; readonly branchName: string }>;
  readonly upstreamClears: string[];
  readonly prepareRequests: readonly RevisionGraphRefreshRequest[];
  readonly canceledPrepareRequests: readonly RevisionGraphRefreshRequest[];
  readonly refreshCalls: number;
  readonly refreshIntents: readonly RevisionGraphRefreshIntent[];
  readonly refreshRequests: readonly RevisionGraphRefreshRequest[];
} {
  const infoMessages: string[] = [];
  const warningMessages: string[] = [];
  const errorMessages: string[] = [];
  const confirmRequests: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const diffCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string }> = [];
  const compareResultsCalls: Array<{ readonly kind: 'between' | 'worktree'; readonly refA: string; readonly refB?: string; readonly changeCount: number }> = [];
  let compareResultsClears = 0;
  const deletedRemoteBranches: Array<{ readonly remoteName: string; readonly branchName: string }> = [];
  const upstreamClears: string[] = [];
  const prepareRequests: RevisionGraphRefreshRequest[] = [];
  const canceledPrepareRequests: RevisionGraphRefreshRequest[] = [];
  const refreshRequests: RevisionGraphRefreshRequest[] = [];
  let sourceControlOpens = 0;
  const overrideConfirm = overrides.confirm;

  const services: RefActionServices = {
    ui: {
      async pickChange(items) {
        return items[0];
      },
      async promptBranchName(options) {
        return options.value;
      },
      async confirm(options) {
        confirmRequests.push(options);
        if (overrideConfirm) {
          return overrideConfirm(options);
        }
        return true;
      },
      showInformationMessage(message) {
        infoMessages.push(message);
      },
      showWarningMessage(message) {
        warningMessages.push(message);
      },
      async showErrorMessage(message) {
        errorMessages.push(message);
      },
      async showSourceControl() {
        sourceControlOpens += 1;
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
      },
      async clear() {
        compareResultsClears += 1;
      }
    },
    refreshController: {
      prepare(request) {
        const normalizedRequest = normalizeRefreshRequest(request);
        prepareRequests.push(normalizedRequest);
        return {
          cancel() {
            canceledPrepareRequests.push(normalizedRequest);
          }
        };
      },
      refresh(request) {
        refreshRequests.push(normalizeRefreshRequest(request));
      }
    },
    referenceManager: {
      async deleteRemoteBranch(_repository, remoteName, branchName) {
        deletedRemoteBranches.push({ remoteName, branchName });
      },
      async unsetBranchUpstream(_repository, branchName) {
        upstreamClears.push(branchName);
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
    warningMessages,
    errorMessages,
    get sourceControlOpens() {
      return sourceControlOpens;
    },
    confirmRequests,
    diffCalls,
    compareResultsCalls,
    get compareResultsClears() {
      return compareResultsClears;
    },
    deletedRemoteBranches,
    upstreamClears,
    prepareRequests,
    canceledPrepareRequests,
    refreshRequests,
    get refreshIntents() {
      return refreshRequests.map((request) => request.intent);
    },
    get refreshCalls() {
      return refreshRequests.length;
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

  assert.deepEqual(harness.diffCalls, []);
  assert.deepEqual(harness.compareResultsCalls, [
    { kind: 'between', refA: 'main', refB: 'release/2026', changeCount: 1 }
  ]);
});

test('compareResolvedRefWithWorktree uses the persistent compare results view', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: [createChange({ uriPath: '/workspace/repo/src/file.ts', status: Status.MODIFIED })]
  });
  const harness = createServices();

  await compareResolvedRefWithWorktree(
    repository,
    { refName: 'main', label: 'main' },
    harness.services
  );

  assert.deepEqual(harness.diffCalls, []);
  assert.deepEqual(harness.compareResultsCalls, [
    { kind: 'worktree', refA: 'main', changeCount: 1 }
  ]);
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

test('checkoutResolvedReference uses the destination branch name in the confirmation action label', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })]
  });
  const harness = createServices();

  await checkoutResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.confirmRequests[0], {
    message: 'Check out release/2026?',
    confirmLabel: 'Checkout to: release/2026'
  });
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
  assert.deepEqual(harness.prepareRequests, []);
  assert.equal(harness.refreshCalls, 0);
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
  assert.deepEqual(harness.prepareRequests, []);
  assert.equal(harness.refreshCalls, 0);
});

test('deleteResolvedReference uses the tag name in the delete confirmation label', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [createRef({ type: RefType.Tag, name: 'v1.2.3' })]
  });
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'v1.2.3', label: 'v1.2.3', kind: 'tag' },
    harness.services
  );

  assert.equal(harness.confirmRequests[0]?.message, 'Delete the Tag v1.2.3?');
  assert.equal(harness.confirmRequests[0]?.confirmLabel, 'Delete Tag: v1.2.3');
  assert.deepEqual(repository.calls.deleteTag, ['v1.2.3']);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.3 was deleted.');
});

test('recognizes the git error raised when clearing a missing upstream', () => {
  assert.equal(
    isMissingUpstreamConfigurationError({
      stderr: "fatal: branch 'release/2026-copy' has no upstream information"
    }),
    true
  );
  assert.equal(
    isMissingUpstreamConfigurationError({
      stderr: 'fatal: some other git error'
    }),
    false
  );
});

test('checkoutResolvedReference blocks workspace-changing operations while conflicts are unresolved', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })],
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED })]
  });
  const harness = createServices();

  await checkoutResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(repository.calls.checkout, []);
  assert.equal(harness.warningMessages[0], 'Resolve the current conflicts in Source Control before checking out another reference.');
  assert.equal(harness.sourceControlOpens, 1);
});

test('checkoutResolvedReference relies on repository listeners instead of issuing an explicit graph refresh', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })]
  });
  const harness = createServices();

  repository.checkout = async (treeish: string) => {
    repository.calls.checkout.push(treeish);
    assert.equal(harness.prepareRequests.length, 0);
  };

  await checkoutResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(repository.calls.checkout, ['release/2026']);
  assert.deepEqual(harness.prepareRequests, []);
  assert.deepEqual(harness.canceledPrepareRequests, []);
  assert.equal(harness.refreshCalls, 0);
});

test('checkoutResolvedReference cancels a prepared refresh when checkout fails', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })]
  });
  const harness = createServices();
  repository.checkout = async () => {
    throw new Error('boom');
  };

  await checkoutResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.equal(harness.refreshCalls, 0);
  assert.deepEqual(harness.canceledPrepareRequests, []);
  assert.match(harness.errorMessages[0] ?? '', /Could not check out the reference/);
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
  assert.deepEqual(harness.upstreamClears, ['release/2026-copy']);
  assert.deepEqual(repository.calls.setBranchUpstream, []);
  assert.equal(harness.infoMessages[0], 'Branch release/2026-copy was created and checked out from release/2026.');
  assert.deepEqual(harness.prepareRequests, []);
  assert.equal(harness.refreshCalls, 0);
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
  assert.deepEqual(harness.upstreamClears, []);
  assert.deepEqual(repository.calls.setBranchUpstream, [
    { name: 'feature/demo', upstream: 'origin/feature/demo' }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was created and checked out from origin/feature/demo.');
  assert.deepEqual(harness.prepareRequests, []);
  assert.equal(harness.refreshCalls, 0);
});

test('createBranchFromResolvedReference cancels a prepared refresh when branch creation fails', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Head, name: 'release/2026' })]
  });
  const harness = createServices();
  repository.createBranch = async () => {
    throw new Error('boom');
  };

  await createBranchFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.equal(harness.refreshCalls, 0);
  assert.deepEqual(harness.canceledPrepareRequests, []);
  assert.match(harness.errorMessages[0] ?? '', /Could not create the branch/);
});

test('syncCurrentHeadWithUpstream pulls and pushes when the current branch is diverged from upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 2, 1, { remote: 'origin', name: 'main' })
  });
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.deepEqual(repository.calls.pull, [true]);
  assert.deepEqual(repository.calls.push, [
    { remoteName: undefined, branchName: undefined, setUpstream: undefined }
  ]);
  assert.equal(harness.infoMessages[0], 'main was synchronized with origin/main.');
  assert.equal(harness.refreshCalls, 1);
  assert.deepEqual(harness.refreshIntents, ['metadata-patch']);
  assert.deepEqual(harness.refreshRequests[0], {
    intent: 'metadata-patch',
    repositoryPath: '/workspace/repo',
    followUpEvents: ['state', 'checkout']
  });
});

test('syncCurrentHeadWithUpstream reports when the current branch is already synchronized', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 0, { remote: 'origin', name: 'main' })
  });
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
  assert.equal(harness.infoMessages[0], 'main is already synchronized with origin/main.');
  assert.equal(harness.refreshCalls, 0);
});

test('syncCurrentHeadWithUpstream refuses when the current branch has no upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
  assert.equal(harness.infoMessages[0], 'The current branch is not tracking a remote branch.');
});

test('syncCurrentHeadWithUpstream blocks pull-based sync while the workspace is dirty', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 1, { remote: 'origin', name: 'main' }),
    workingTreeChanges: [createChange({ uriPath: '/workspace/repo/src/app.ts', status: Status.MODIFIED })]
  });
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
  assert.equal(
    harness.warningMessages[0],
    'The workspace must be clean before synchronizing the current branch. Review, stash, or commit the current changes first.'
  );
  assert.equal(harness.sourceControlOpens, 0);
});

test('syncCurrentHeadWithUpstream opens Source Control when pull leaves conflicts to resolve', async () => {
  const mergeChanges = [] as ReturnType<typeof createChange>[];
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main', 0, 1, { remote: 'origin', name: 'main' }),
    mergeChanges
  });
  repository.pull = async () => {
    mergeChanges.push(createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED }));
    throw Object.assign(new Error('Failed to execute git'), {
      gitErrorCode: 'Conflict',
      stderr: 'Pull stopped because there are merge conflicts.'
    });
  };
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.equal(
    harness.errorMessages[0],
    'Could not synchronize the current branch. Pull stopped because there are merge conflicts. [Conflict]'
  );
  assert.equal(harness.sourceControlOpens, 1);
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

test('mergeResolvedReference opens Source Control when the merge leaves conflicts to resolve', async () => {
  const mergeChanges = [] as ReturnType<typeof createChange>[];
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    mergeChanges
  });
  repository.merge = async () => {
    mergeChanges.push(createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED }));
    throw Object.assign(new Error('Failed to execute git'), {
      gitErrorCode: 'Conflict',
      stderr: 'Automatic merge failed; fix conflicts and then commit the result.'
    });
  };
  const harness = createServices();

  await mergeResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026' },
    harness.services
  );

  assert.equal(
    harness.errorMessages[0],
    'Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience. Automatic merge failed; fix conflicts and then commit the result. [Conflict]'
  );
  assert.equal(harness.sourceControlOpens, 1);
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
  assert.equal(harness.refreshCalls, 1);
  assert.deepEqual(harness.refreshIntents, ['metadata-patch']);
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

test('deleteResolvedReference explains that deleting a tracked local branch leaves the remote branch untouched', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createHead('feature/demo', 0, 0, { remote: 'origin', name: 'feature/demo' })
    ]
  });
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'branch' },
    harness.services
  );

  assert.equal(
    harness.confirmRequests[0]?.message,
    'Delete the Local Branch feature/demo?\n\nThis removes only the local branch. The tracked remote branch origin/feature/demo will remain unchanged.'
  );
  assert.equal(harness.confirmRequests[0]?.confirmLabel, 'Delete Branch: feature/demo');
  assert.deepEqual(repository.calls.deleteBranch, [{ name: 'feature/demo', force: false }]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was deleted.');
});

test('deleteResolvedReference offers force delete when a tracked branch is not fully merged into its upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createHead('feature/demo', 0, 0, { remote: 'origin', name: 'feature/demo' })
    ]
  });
  repository.deleteBranch = async (name: string, force?: boolean): Promise<void> => {
    repository.calls.deleteBranch.push({ name, force });
    if (!force) {
      throw Object.assign(new Error('Failed to execute git'), {
        gitErrorCode: 'BranchNotFullyMerged',
        stderr: "error: the branch 'feature/demo' is not fully merged"
      });
    }
  };
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'branch' },
    harness.services
  );

  assert.equal(harness.confirmRequests[1]?.confirmLabel, 'Force Delete');
  assert.equal(
    harness.confirmRequests[1]?.message,
    'feature/demo is not fully merged into origin/feature/demo.\n\nForce delete the local branch anyway? The tracked remote branch origin/feature/demo will remain unchanged.'
  );
  assert.deepEqual(repository.calls.deleteBranch, [
    { name: 'feature/demo', force: false },
    { name: 'feature/demo', force: true }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was force deleted.');
  assert.equal(harness.refreshCalls, 1);
});

test('deleteResolvedReference surfaces git stderr details for local branch failures', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  repository.deleteBranch = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: "error: Cannot delete branch 'teste01' checked out at '/tmp/worktree'",
      gitErrorCode: 'WorktreeBranchAlreadyUsed',
      exitCode: 1
    });
  };
  const harness = createServices();

  await deleteResolvedReference(
    repository,
    { refName: 'teste01', label: 'teste01', kind: 'branch' },
    harness.services
  );

  assert.equal(
    harness.errorMessages[0],
    "Could not delete the reference. error: Cannot delete branch 'teste01' checked out at '/tmp/worktree' [WorktreeBranchAlreadyUsed] (exit code: 1)"
  );
});

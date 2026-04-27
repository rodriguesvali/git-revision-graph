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
  createTagFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  deleteRemoteTagResolvedReference,
  mergeResolvedReference,
  publishLocalBranchResolvedReference,
  pushTagResolvedReference,
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
  readonly createdTags: Array<{ readonly tagName: string; readonly refName: string }>;
  readonly pushedTags: Array<{ readonly remoteName: string; readonly tagName: string }>;
  readonly deletedRemoteTags: Array<{ readonly remoteName: string; readonly tagName: string }>;
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
  const createdTags: Array<{ readonly tagName: string; readonly refName: string }> = [];
  const pushedTags: Array<{ readonly remoteName: string; readonly tagName: string }> = [];
  const deletedRemoteTags: Array<{ readonly remoteName: string; readonly tagName: string }> = [];
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
      async pickRemoteName(items) {
        return items[0];
      },
      async promptBranchName(options) {
        return options.value;
      },
      async promptTagName() {
        return 'v1.0.0';
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
      async createTag(_repository, tagName, refName) {
        createdTags.push({ tagName, refName });
      },
      async getRemoteNames() {
        return ['origin'];
      },
      async pushTag(_repository, remoteName, tagName) {
        pushedTags.push({ remoteName, tagName });
      },
      async deleteRemoteTag(_repository, remoteName, tagName) {
        deletedRemoteTags.push({ remoteName, tagName });
      },
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
    createdTags,
    pushedTags,
    deletedRemoteTags,
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
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
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

test('createBranchFromResolvedReference creates a new branch from an unreferenced commit hash', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();

  await createBranchFromResolvedReference(
    repository,
    { refName: '1234567890abcdef', label: '12345678', kind: 'commit' },
    harness.services
  );

  assert.deepEqual(repository.calls.createBranch, [
    { name: 'commit-12345678', checkout: true, ref: '1234567890abcdef' }
  ]);
  assert.deepEqual(repository.calls.setBranchUpstream, []);
  assert.deepEqual(harness.upstreamClears, ['commit-12345678']);
  assert.equal(harness.infoMessages[0], 'Branch commit-12345678 was created and checked out from 12345678.');
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

test('createTagFromResolvedReference creates a local tag from a branch reference', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Tag, name: 'v1.1.0' })]
  });
  const harness = createServices({
    async promptTagName(options) {
      assert.equal(options.prompt, 'Create a New Tag from release/2026');
      assert.deepEqual(options.existingTagNames, ['v1.1.0']);
      return 'v1.2.0';
    }
  });

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, [
    { tagName: 'v1.2.0', refName: 'release/2026' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.0 was created from release/2026.');
  assert.equal(harness.refreshCalls, 1);
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
});

test('createTagFromResolvedReference creates a local tag from an unreferenced commit hash', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async promptTagName() {
      return 'v1.2.1';
    }
  });

  await createTagFromResolvedReference(
    repository,
    { refName: '1234567890abcdef', label: '12345678', kind: 'commit' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, [
    { tagName: 'v1.2.1', refName: '1234567890abcdef' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.1 was created from 12345678.');
  assert.equal(harness.refreshCalls, 1);
});

test('createTagFromResolvedReference rejects duplicate local tag names before creating a tag', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    refs: [createRef({ type: RefType.Tag, name: 'v1.2.0' })]
  });
  const harness = createServices({
    async promptTagName() {
      return 'v1.2.0';
    }
  });

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, []);
  assert.equal(harness.refreshCalls, 0);
  assert.equal(harness.errorMessages[0], 'Could not create the tag. Tag v1.2.0 already exists.');
});

test('createTagFromResolvedReference rejects invalid tag names before creating a tag', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async promptTagName() {
      return 'release candidate';
    }
  });

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, []);
  assert.equal(harness.refreshCalls, 0);
  assert.equal(harness.errorMessages[0], 'Could not create the tag. Tag names cannot contain spaces, control characters, or Git ref separators.');
});

test('createTagFromResolvedReference does nothing when tag name entry is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async promptTagName() {
      return undefined;
    }
  });

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, []);
  assert.deepEqual(harness.infoMessages, []);
  assert.equal(harness.refreshCalls, 0);
});

test('createTagFromResolvedReference blocks tag creation while conflicts are unresolved', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED })]
  });
  const harness = createServices();

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, []);
  assert.equal(harness.warningMessages[0], 'Resolve the current conflicts in Source Control before creating a new tag.');
  assert.equal(harness.sourceControlOpens, 1);
});

test('createTagFromResolvedReference surfaces tag creation failures', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.createTag = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: "fatal: tag 'v1.0.0' already exists"
    });
  };

  await createTagFromResolvedReference(
    repository,
    { refName: 'release/2026', label: 'release/2026', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(harness.createdTags, []);
  assert.equal(harness.refreshCalls, 0);
  assert.equal(harness.errorMessages[0], "Could not create the tag. fatal: tag 'v1.0.0' already exists");
});

test('pushTagResolvedReference pushes a local tag to the only configured remote', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.confirmRequests, [
    { message: 'Push tag v1.2.0 to origin?', confirmLabel: 'Push Tag: v1.2.0' }
  ]);
  assert.deepEqual(harness.pushedTags, [
    { remoteName: 'origin', tagName: 'v1.2.0' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.0 was pushed to origin.');
  assert.equal(harness.refreshCalls, 0);
});

test('pushTagResolvedReference lets users choose when multiple remotes exist', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async pickRemoteName(items, placeHolder) {
      assert.deepEqual(items, ['origin', 'upstream']);
      assert.equal(placeHolder, 'Choose a remote for the tag push');
      return 'upstream';
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, [
    { remoteName: 'upstream', tagName: 'v1.2.0' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.0 was pushed to upstream.');
});

test('pushTagResolvedReference does nothing when remote selection is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async pickRemoteName() {
      return undefined;
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.deepEqual(harness.confirmRequests, []);
  assert.deepEqual(harness.infoMessages, []);
});

test('pushTagResolvedReference reports when no remotes are configured', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.getRemoteNames = async () => [];

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.equal(harness.infoMessages[0], 'No Git remote is configured for this repository.');
});

test('pushTagResolvedReference does nothing when confirmation is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async confirm() {
      return false;
    }
  });

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.deepEqual(harness.infoMessages, []);
});

test('pushTagResolvedReference blocks tag push while conflicts are unresolved', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED })]
  });
  const harness = createServices();

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.equal(harness.warningMessages[0], 'Resolve the current conflicts in Source Control before pushing a tag.');
  assert.equal(harness.sourceControlOpens, 1);
});

test('pushTagResolvedReference surfaces push failures', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.pushTag = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: 'remote rejected'
    });
  };

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.equal(harness.errorMessages[0], 'Could not push the tag. remote rejected');
});

test('pushTagResolvedReference opens Source Control when Git authentication needs an interactive prompt', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.pushTag = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      exitCode: 128
    });
  };

  await pushTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.pushedTags, []);
  assert.equal(harness.sourceControlOpens, 1);
  assert.match(
    harness.errorMessages[0],
    /Git authentication is unavailable for this operation/
  );
  assert.match(
    harness.errorMessages[0],
    /Git: Push Tags/
  );
});

test('deleteRemoteTagResolvedReference deletes a tag from the only configured remote', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.confirmRequests, [
    {
      message: 'Delete tag v1.2.0 from origin?\n\nThis removes the tag from the remote repository for everyone. The local tag will remain unchanged.',
      confirmLabel: 'Delete Remote Tag: v1.2.0'
    }
  ]);
  assert.deepEqual(harness.deletedRemoteTags, [
    { remoteName: 'origin', tagName: 'v1.2.0' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.0 was deleted from origin.');
  assert.equal(harness.refreshCalls, 0);
});

test('deleteRemoteTagResolvedReference lets users choose when multiple remotes exist', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async pickRemoteName(items, placeHolder) {
      assert.deepEqual(items, ['origin', 'upstream']);
      assert.equal(placeHolder, 'Choose a remote to delete the tag from');
      return 'upstream';
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, [
    { remoteName: 'upstream', tagName: 'v1.2.0' }
  ]);
  assert.equal(harness.infoMessages[0], 'Tag v1.2.0 was deleted from upstream.');
});

test('deleteRemoteTagResolvedReference does nothing when remote selection is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async pickRemoteName() {
      return undefined;
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, []);
  assert.deepEqual(harness.confirmRequests, []);
  assert.deepEqual(harness.infoMessages, []);
});

test('deleteRemoteTagResolvedReference reports when no remotes are configured', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.getRemoteNames = async () => [];

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, []);
  assert.equal(harness.infoMessages[0], 'No Git remote is configured for this repository.');
});

test('deleteRemoteTagResolvedReference does nothing when confirmation is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices({
    async confirm() {
      return false;
    }
  });

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, []);
  assert.deepEqual(harness.infoMessages, []);
});

test('deleteRemoteTagResolvedReference blocks remote tag deletion while conflicts are unresolved', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main'),
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED })]
  });
  const harness = createServices();

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, []);
  assert.equal(harness.warningMessages[0], 'Resolve the current conflicts in Source Control before deleting a remote tag.');
  assert.equal(harness.sourceControlOpens, 1);
});

test('deleteRemoteTagResolvedReference surfaces remote tag deletion failures', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('main')
  });
  const harness = createServices();
  harness.services.referenceManager.deleteRemoteTag = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: 'remote ref does not exist'
    });
  };

  await deleteRemoteTagResolvedReference(
    repository,
    { refName: 'v1.2.0', label: 'v1.2.0', kind: 'tag' },
    harness.services
  );

  assert.deepEqual(harness.deletedRemoteTags, []);
  assert.equal(harness.errorMessages[0], 'Could not delete the remote tag. remote ref does not exist');
});

test('publishLocalBranchResolvedReference publishes the current branch and sets upstream', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo')
  });
  const harness = createServices();

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.deepEqual(harness.confirmRequests, [
    {
      message: 'Publish branch feature/demo to origin?',
      confirmLabel: 'Publish Branch: feature/demo'
    }
  ]);
  assert.deepEqual(repository.calls.push, [
    { remoteName: 'origin', branchName: 'feature/demo', setUpstream: true }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was published to origin/feature/demo.');
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
});

test('publishLocalBranchResolvedReference lets users choose when multiple remotes exist', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [createRef({ type: RefType.Head, name: 'feature/demo' })]
  });
  const harness = createServices({
    async pickRemoteName(items, placeHolder) {
      assert.deepEqual(items, ['origin', 'upstream']);
      assert.equal(placeHolder, 'Choose a remote for the branch publish');
      return 'upstream';
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'branch' },
    harness.services
  );

  assert.deepEqual(repository.calls.push, [
    { remoteName: 'upstream', branchName: 'feature/demo', setUpstream: true }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch feature/demo was published to upstream/feature/demo.');
});

test('publishLocalBranchResolvedReference reports when the branch already tracks a remote', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo', 1, 0, { remote: 'origin', name: 'feature/demo' })
  });
  const harness = createServices();

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(harness.confirmRequests, []);
  assert.equal(
    harness.infoMessages[0],
    'feature/demo already tracks origin/feature/demo. Use Sync to update the remote branch.'
  );
});

test('publishLocalBranchResolvedReference publishes a branch with inherited upstream tracking', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('teste01', 0, 0, { remote: 'origin', name: 'auth_version' })
  });
  const harness = createServices();

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'teste01', label: 'teste01', kind: 'head' },
    harness.services
  );

  assert.deepEqual(harness.confirmRequests, [
    {
      message: 'Publish branch teste01 to origin?\n\nIt currently tracks origin/auth_version. Publishing will update upstream tracking to origin/teste01.',
      confirmLabel: 'Publish Branch: teste01'
    }
  ]);
  assert.deepEqual(repository.calls.push, [
    { remoteName: 'origin', branchName: 'teste01', setUpstream: true }
  ]);
  assert.equal(harness.infoMessages[0], 'Branch teste01 was published to origin/teste01.');
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
});

test('publishLocalBranchResolvedReference does nothing when remote selection is canceled', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo')
  });
  const harness = createServices({
    async pickRemoteName() {
      return undefined;
    }
  });
  harness.services.referenceManager.getRemoteNames = async () => ['origin', 'upstream'];

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.deepEqual(repository.calls.push, []);
  assert.deepEqual(harness.confirmRequests, []);
  assert.deepEqual(harness.infoMessages, []);
});

test('publishLocalBranchResolvedReference reports when no remotes are configured', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo')
  });
  const harness = createServices();
  harness.services.referenceManager.getRemoteNames = async () => [];

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.deepEqual(repository.calls.push, []);
  assert.equal(harness.infoMessages[0], 'No Git remote is configured for this repository.');
});

test('publishLocalBranchResolvedReference blocks branch publish while conflicts are unresolved', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo'),
    mergeChanges: [createChange({ uriPath: '/workspace/repo/src/conflict.ts', status: Status.BOTH_MODIFIED })]
  });
  const harness = createServices();

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.deepEqual(repository.calls.push, []);
  assert.equal(harness.warningMessages[0], 'Resolve the current conflicts in Source Control before publishing a branch.');
  assert.equal(harness.sourceControlOpens, 1);
});

test('publishLocalBranchResolvedReference opens Source Control when Git authentication needs an interactive prompt', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/demo')
  });
  const harness = createServices();
  repository.push = async () => {
    throw Object.assign(new Error('Failed to execute git'), {
      stderr: "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      exitCode: 128
    });
  };

  await publishLocalBranchResolvedReference(
    repository,
    { refName: 'feature/demo', label: 'feature/demo', kind: 'head' },
    harness.services
  );

  assert.equal(harness.sourceControlOpens, 1);
  assert.match(
    harness.errorMessages[0],
    /Git authentication is unavailable for this operation/
  );
  assert.match(
    harness.errorMessages[0],
    /Git: Publish Branch/
  );
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
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
  assert.deepEqual(harness.refreshRequests[0], {
    intent: 'full-rebuild',
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

test('syncCurrentHeadWithUpstream refuses inherited upstream tracking for a newly branched HEAD', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('teste01', 1, 0, { remote: 'origin', name: 'auth_version_copy' })
  });
  const harness = createServices();

  await syncCurrentHeadWithUpstream(repository, harness.services);

  assert.deepEqual(repository.calls.pull, []);
  assert.deepEqual(repository.calls.push, []);
  assert.equal(
    harness.infoMessages[0],
    'teste01 is tracking origin/auth_version_copy. Publish the branch to update upstream tracking before synchronizing.'
  );
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
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
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
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
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
  assert.deepEqual(harness.refreshIntents, ['full-rebuild']);
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

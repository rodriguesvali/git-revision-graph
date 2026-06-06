import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  buildCherryPickMessage,
  cherryPickShowLogCommits,
  isEmptyCherryPickError
} from '../src/showLog/cherryPickAction';
import type { RefActionServices } from '../src/refActions';
import {
  normalizeRefreshRequest,
  type RevisionGraphRefreshRequest
} from '../src/revisionGraphRefresh';
import { createChange, createGitError, createRepository } from './fakes';

test('buildCherryPickMessage formats singular and plural feedback', () => {
  assert.equal(buildCherryPickMessage(1), 'Cherry-picked 1 commit into the current branch.');
  assert.equal(buildCherryPickMessage(3), 'Cherry-picked 3 commits into the current branch.');
});

test('isEmptyCherryPickError recognizes Git empty cherry-pick output', () => {
  assert.equal(
    isEmptyCherryPickError(createGitError({ stderr: 'The previous cherry-pick is now empty, possibly due to conflict resolution.' })),
    true
  );
  assert.equal(
    isEmptyCherryPickError(createGitError({ stderr: 'CONFLICT (content): Merge conflict in src/app.ts' })),
    false
  );
});

test('cherryPickShowLogCommits cherry-picks unique selected commits and refreshes the graph', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices();
  const gitCalls: Array<{ readonly path: string; readonly args: readonly string[] }> = [];

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123', 'def456', 'abc123'],
    harness.services,
    async (path, args) => {
      gitCalls.push({ path, args });
    }
  );

  assert.equal(completed, true);
  assert.deepEqual(gitCalls, [
    {
      path: '/workspace/repo',
      args: ['cherry-pick', '--no-edit', 'abc123', 'def456']
    }
  ]);
  assert.deepEqual(harness.infoMessages, ['Cherry-picked 2 commits into the current branch.']);
  assert.equal(harness.warningMessages.length, 0);
  assert.equal(harness.errorMessages.length, 0);
  assert.equal(harness.refreshRequests.length, 1);
  assert.equal(harness.refreshRequests[0].intent, 'full-rebuild');
});

test('cherryPickShowLogCommits blocks when the workspace is not clean', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    workingTreeChanges: [createChange({ uriPath: '/workspace/repo/src/app.ts' })]
  });
  const harness = createServices();
  let gitCalled = false;

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123'],
    harness.services,
    async () => {
      gitCalled = true;
    }
  );

  assert.equal(completed, false);
  assert.equal(gitCalled, false);
  assert.deepEqual(harness.warningMessages, [
    'The workspace must be clean before cherry-picking selected commits. Review, stash, or commit the current changes first.'
  ]);
  assert.equal(harness.refreshRequests.length, 0);
});

test('cherryPickShowLogCommits offers to skip an empty cherry-pick after partial application', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices({ confirmResults: [true] });
  const gitCalls: Array<{ readonly path: string; readonly args: readonly string[] }> = [];

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123', 'def456'],
    harness.services,
    async (path, args) => {
      gitCalls.push({ path, args });
      if (args[0] === 'cherry-pick' && args[1] === '--no-edit') {
        throw createGitError({ stderr: 'The previous cherry-pick is now empty, possibly due to conflict resolution.', code: 1 });
      }
    }
  );

  assert.equal(completed, true);
  assert.deepEqual(gitCalls, [
    {
      path: '/workspace/repo',
      args: ['cherry-pick', '--no-edit', 'abc123', 'def456']
    },
    {
      path: '/workspace/repo',
      args: ['cherry-pick', '--skip']
    }
  ]);
  assert.deepEqual(harness.confirmRequests, [
    {
      message: 'Git stopped on an empty cherry-pick.\n\nSome selected commits may already have been applied. Skip the empty commit and let Git continue the cherry-pick sequence?',
      confirmLabel: 'Skip Empty Commit'
    }
  ]);
  assert.deepEqual(harness.infoMessages, ['Empty cherry-pick skipped.']);
  assert.equal(harness.errorMessages.length, 0);
  assert.equal(harness.sourceControlOpens, 0);
  assert.equal(harness.canceledPrepareRequests.length, 1);
  assert.equal(harness.refreshRequests.length, 1);
});

test('cherryPickShowLogCommits opens Source Control when empty cherry-pick skip and abort are declined', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices({ confirmResults: [false, false] });

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123'],
    harness.services,
    async () => {
      throw createGitError({ stderr: 'The previous cherry-pick is now empty, possibly due to conflict resolution.', code: 1 });
    }
  );

  assert.equal(completed, false);
  assert.deepEqual(harness.confirmRequests.map((request) => request.confirmLabel), ['Skip Empty Commit', 'Abort Cherry Pick']);
  assert.equal(harness.sourceControlOpens, 1);
  assert.equal(harness.refreshRequests.length, 0);
});

test('cherryPickShowLogCommits can abort after declining an empty cherry-pick skip', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices({ confirmResults: [false, true] });
  const gitCalls: Array<{ readonly path: string; readonly args: readonly string[] }> = [];

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123'],
    harness.services,
    async (path, args) => {
      gitCalls.push({ path, args });
      if (args[0] === 'cherry-pick' && args[1] === '--no-edit') {
        throw createGitError({ stderr: 'The previous cherry-pick is now empty, possibly due to conflict resolution.', code: 1 });
      }
    }
  );

  assert.equal(completed, true);
  assert.deepEqual(gitCalls, [
    {
      path: '/workspace/repo',
      args: ['cherry-pick', '--no-edit', 'abc123']
    },
    {
      path: '/workspace/repo',
      args: ['cherry-pick', '--abort']
    }
  ]);
  assert.deepEqual(harness.confirmRequests.map((request) => request.confirmLabel), ['Skip Empty Commit', 'Abort Cherry Pick']);
  assert.deepEqual(harness.infoMessages, ['Cherry-pick aborted. Workspace restored to the pre-cherry-pick state.']);
});

test('cherryPickShowLogCommits reports errors, opens Source Control, and refreshes after failed cherry-pick', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const harness = createServices();

  const completed = await cherryPickShowLogCommits(
    repository,
    ['abc123'],
    harness.services,
    async () => {
      throw createGitError({ stderr: 'CONFLICT (content): Merge conflict in src/app.ts', code: 1 });
    }
  );

  assert.equal(completed, false);
  assert.match(harness.errorMessages[0], /Could not cherry-pick the selected commits\./);
  assert.match(harness.errorMessages[0], /CONFLICT \(content\): Merge conflict in src\/app\.ts/);
  assert.equal(harness.sourceControlOpens, 1);
  assert.equal(harness.canceledPrepareRequests.length, 1);
  assert.equal(harness.refreshRequests.length, 1);
  assert.equal(harness.refreshRequests[0].intent, 'full-rebuild');
});

test('cherryPickShowLogCommits opens Source Control when a pending cherry-pick is kept', async () => {
  const workspacePath = createCherryPickWorkspace();
  try {
    const repository = createRepository({ root: workspacePath });
    const harness = createServices({ confirmResult: false });
    const gitCalls: Array<{ readonly path: string; readonly args: readonly string[] }> = [];

    const completed = await cherryPickShowLogCommits(
      repository,
      ['abc123'],
      harness.services,
      async (path, args) => {
        gitCalls.push({ path, args });
      }
    );

    assert.equal(completed, false);
    assert.deepEqual(gitCalls, []);
    assert.equal(harness.sourceControlOpens, 1);
    assert.deepEqual(harness.confirmRequests, [
      {
        message: 'A cherry-pick is already in progress.\n\nOpen Source Control to continue resolving it, or abort the cherry-pick and discard its conflict resolutions and staged changes.',
        confirmLabel: 'Abort Cherry Pick'
      }
    ]);
    assert.equal(harness.refreshRequests.length, 0);
  } finally {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

test('cherryPickShowLogCommits aborts a pending cherry-pick instead of starting a new one', async () => {
  const workspacePath = createCherryPickWorkspace();
  try {
    const repository = createRepository({ root: workspacePath });
    const harness = createServices({ confirmResult: true });
    const gitCalls: Array<{ readonly path: string; readonly args: readonly string[] }> = [];

    const completed = await cherryPickShowLogCommits(
      repository,
      ['abc123', 'def456'],
      harness.services,
      async (path, args) => {
        gitCalls.push({ path, args });
      }
    );

    assert.equal(completed, true);
    assert.deepEqual(gitCalls, [
      {
        path: workspacePath,
        args: ['cherry-pick', '--abort']
      }
    ]);
    assert.deepEqual(harness.infoMessages, ['Cherry-pick aborted. Workspace restored to the pre-cherry-pick state.']);
    assert.equal(harness.sourceControlOpens, 0);
    assert.equal(harness.refreshRequests.length, 1);
    assert.equal(harness.refreshRequests[0].intent, 'full-rebuild');
  } finally {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createServices(options: { readonly confirmResult?: boolean; readonly confirmResults?: readonly boolean[] } = {}): {
  readonly services: RefActionServices;
  readonly infoMessages: string[];
  readonly warningMessages: string[];
  readonly errorMessages: string[];
  readonly confirmRequests: ReadonlyArray<{ readonly message: string; readonly confirmLabel: string }>;
  readonly sourceControlOpens: number;
  readonly canceledPrepareRequests: readonly RevisionGraphRefreshRequest[];
  readonly refreshRequests: readonly RevisionGraphRefreshRequest[];
} {
  const infoMessages: string[] = [];
  const warningMessages: string[] = [];
  const errorMessages: string[] = [];
  const confirmRequests: Array<{ readonly message: string; readonly confirmLabel: string }> = [];
  const canceledPrepareRequests: RevisionGraphRefreshRequest[] = [];
  const refreshRequests: RevisionGraphRefreshRequest[] = [];
  let sourceControlOpens = 0;
  let confirmIndex = 0;

  return {
    services: {
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
        async promptRemoteBranchCheckout(options) {
          return { branchName: options.value, overrideBranchIfExists: false };
        },
        async pickCurrentBranchPushMode() {
          return 'normal';
        },
        async confirm(confirmOptions) {
          confirmRequests.push(confirmOptions);
          const result = options.confirmResults?.[confirmIndex] ?? options.confirmResult ?? true;
          confirmIndex += 1;
          return result;
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
        }
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
        prepare(request) {
          const normalizedRequest = normalizeRefreshRequest(request);
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
        async createTag() {},
        async resetBranch() {},
        async resetCurrentBranch() {},
        async resetWorkspace() {},
        async getRemoteNames() {
          return [];
        },
        async pushCurrentBranch() {
          return true;
        },
        async pushTag() {},
        async deleteRemoteTag() {},
        async deleteRemoteBranch() {},
        async unsetBranchUpstream() {},
        async abortMerge() {}
      },
      ancestryInspector: {
        async isRefAncestorOfHead() {
          return false;
        }
      },
      formatPath: (fsPath) => fsPath
    },
    infoMessages,
    warningMessages,
    errorMessages,
    confirmRequests,
    get sourceControlOpens() {
      return sourceControlOpens;
    },
    canceledPrepareRequests,
    refreshRequests
  };
}

function createCherryPickWorkspace(): string {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-revision-graph-cherry-pick-'));
  fs.mkdirSync(path.join(workspacePath, '.git'));
  fs.writeFileSync(path.join(workspacePath, '.git/CHERRY_PICK_HEAD'), `${'e'.repeat(40)}\n`);
  return workspacePath;
}

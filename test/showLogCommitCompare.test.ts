import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareLoadedShowLogCommits,
  compareLoadedShowLogCommitWithWorktree
} from '../src/showLog/commitCompare';
import type { RevisionLogEntry } from '../src/revisionGraphTypes';
import { createChange, createRepository } from './fakes';

test('compares two loaded show log commits through compare results', async () => {
  const change = createChange({ uriPath: '/workspace/repo/src/demo.ts' });
  const repository = createRepository({
    root: '/workspace/repo',
    diffBetween: [change]
  });
  const comparisons: Array<{
    readonly left: { readonly refName: string; readonly label: string };
    readonly right: { readonly refName: string; readonly label: string };
    readonly changes: readonly unknown[];
    readonly source: string | undefined;
  }> = [];
  const messages: string[] = [];

  await compareLoadedShowLogCommits(
    repository,
    [
      createLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' }),
      createLogEntry({ hash: 'b'.repeat(40), shortHash: 'bbbbbbb' })
    ],
    'a'.repeat(40),
    'b'.repeat(40),
    {
      async showBetweenRefs(_repository, left, right, changes, options) {
        comparisons.push({ left, right, changes, source: options?.source });
      },
      async showWithWorktree() {}
    },
    {
      showInformationMessage(message) {
        messages.push(message);
      },
      async showErrorMessage(message) {
        messages.push(message);
      }
    }
  );

  assert.deepEqual(comparisons, [
    {
      left: { refName: 'a'.repeat(40), label: 'aaaaaaa' },
      right: { refName: 'b'.repeat(40), label: 'bbbbbbb' },
      changes: [change],
      source: 'showLog'
    }
  ]);
  assert.deepEqual(messages, []);
});

test('ignores show log commit comparisons when a commit is not loaded', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffBetween: [createChange({ uriPath: '/workspace/repo/src/demo.ts' })]
  });
  let compareCalls = 0;

  await compareLoadedShowLogCommits(
    repository,
    [createLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' })],
    'a'.repeat(40),
    'b'.repeat(40),
    {
      async showBetweenRefs() {
        compareCalls += 1;
      },
      async showWithWorktree() {}
    },
    {
      showInformationMessage() {},
      async showErrorMessage() {}
    }
  );

  assert.equal(compareCalls, 0);
});

test('reports when loaded show log commits have no differences', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffBetween: []
  });
  const messages: string[] = [];

  await compareLoadedShowLogCommits(
    repository,
    [
      createLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' }),
      createLogEntry({ hash: 'b'.repeat(40), shortHash: 'bbbbbbb' })
    ],
    'a'.repeat(40),
    'b'.repeat(40),
    {
      async showBetweenRefs() {
        throw new Error('Compare results should not open for empty diffs.');
      },
      async showWithWorktree() {}
    },
    {
      showInformationMessage(message) {
        messages.push(message);
      },
      async showErrorMessage(message) {
        messages.push(message);
      }
    }
  );

  assert.deepEqual(messages, ['No differences found between aaaaaaa and bbbbbbb.']);
});

test('compares a loaded show log commit with the worktree through compare results', async () => {
  const change = createChange({ uriPath: '/workspace/repo/src/demo.ts' });
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: [change]
  });
  const comparisons: Array<{
    readonly target: { readonly refName: string; readonly label: string };
    readonly changes: readonly unknown[];
    readonly source: string | undefined;
  }> = [];

  await compareLoadedShowLogCommitWithWorktree(
    repository,
    [createLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' })],
    'a'.repeat(40),
    {
      async showBetweenRefs() {},
      async showWithWorktree(_repository, target, changes, options) {
        comparisons.push({ target, changes, source: options?.source });
      }
    },
    {
      showInformationMessage() {},
      async showErrorMessage() {}
    }
  );

  assert.deepEqual(comparisons, [
    {
      target: { refName: 'a'.repeat(40), label: 'aaaaaaa' },
      changes: [change],
      source: 'showLog'
    }
  ]);
});

test('reports when a loaded show log commit is already aligned with the worktree', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    diffWith: []
  });
  const messages: string[] = [];

  await compareLoadedShowLogCommitWithWorktree(
    repository,
    [createLogEntry({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa' })],
    'a'.repeat(40),
    {
      async showBetweenRefs() {},
      async showWithWorktree() {
        throw new Error('Compare results should not open for empty worktree diffs.');
      }
    },
    {
      showInformationMessage(message) {
        messages.push(message);
      },
      async showErrorMessage(message) {
        messages.push(message);
      }
    }
  );

  assert.deepEqual(messages, ['The worktree is already aligned with aaaaaaa.']);
});

function createLogEntry(
  overrides: Pick<RevisionLogEntry, 'hash' | 'shortHash'>
): RevisionLogEntry {
  return {
    hash: overrides.hash,
    shortHash: overrides.shortHash,
    author: 'Ada',
    date: '2026-05-09',
    subject: 'Demo commit',
    message: 'Demo commit',
    parentHashes: [],
    references: [],
    shortStat: undefined
  };
}

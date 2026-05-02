import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { hasConflictedMerge, isMergeInProgress } from '../src/gitState';
import { Status } from '../src/git';
import { createChange, createRepository } from './fakes';

test('hasConflictedMerge requires unresolved changes and a merge head', () => {
  const workspacePath = createTempWorkspace();
  try {
    fs.mkdirSync(path.join(workspacePath, '.git'));
    const conflict = createChange({ uriPath: path.join(workspacePath, 'src/conflict.ts'), status: Status.BOTH_MODIFIED });

    assert.equal(
      hasConflictedMerge(createRepository({ root: workspacePath, mergeChanges: [conflict] })),
      false
    );

    fs.writeFileSync(path.join(workspacePath, '.git/MERGE_HEAD'), `${'a'.repeat(40)}\n`);

    assert.equal(
      hasConflictedMerge(createRepository({ root: workspacePath, mergeChanges: [conflict] })),
      true
    );
    assert.equal(
      hasConflictedMerge(createRepository({ root: workspacePath })),
      false
    );
  } finally {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

test('isMergeInProgress supports gitdir files from worktrees', () => {
  const workspacePath = createTempWorkspace();
  try {
    const actualGitDir = path.join(workspacePath, '.git-worktree');
    fs.mkdirSync(actualGitDir);
    fs.writeFileSync(path.join(workspacePath, '.git'), `gitdir: ${path.relative(workspacePath, actualGitDir)}\n`);

    assert.equal(isMergeInProgress(createRepository({ root: workspacePath })), false);

    fs.writeFileSync(path.join(actualGitDir, 'MERGE_HEAD'), `${'b'.repeat(40)}\n`);

    assert.equal(isMergeInProgress(createRepository({ root: workspacePath })), true);
  } finally {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
});

function createTempWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'git-revision-graph-'));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { createSharedGitFixture } from './gitFixture';
import { execGit } from '../src/gitExec';
import {
  buildRevisionGraphGitLogArgs,
  parseRevisionGraphLog
} from '../src/revisionGraph/source/graphGit';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';

const execFile = promisify(execFileCallback);

test('shared Git fixture covers unusual paths, content, rename, and parser controls', async () => {
  const fixture = await createSharedGitFixture();
  try {
    const names = (await execFile(
      'git',
      ['-c', 'core.quotePath=false', 'ls-tree', '-r', '--name-only', fixture.initialCommit],
      { cwd: fixture.repositoryPath }
    )).stdout;
    assert.match(names, /space name\.txt/);
    assert.match(names, /unicodé-文件\.txt/);
    assert.match(names, /-option-like\.txt/);
    assert.match(names, /binary\.bin/);
    assert.match(names, /empty\.txt/);

    const rename = (await execFile(
      'git',
      ['diff', '--name-status', '-M', fixture.initialCommit, fixture.renameCommit],
      { cwd: fixture.repositoryPath }
    )).stdout;
    assert.match(rename, /R100\s+nested\/old name\.txt\s+nested\/new name\.txt/);
    assert.deepEqual(
      [...await fs.readFile(`${fixture.repositoryPath}/binary.bin`)],
      [0, 255, 1, 254]
    );

    const output = await execGit(
      fixture.repositoryPath,
      buildRevisionGraphGitLogArgs(10, createDefaultRevisionGraphProjectionOptions()),
      { timeoutMs: 15_000, maxOutputBytes: 1024 * 1024 }
    );
    const commits = parseRevisionGraphLog(output);
    assert.ok(commits.some((commit) => commit.subject.includes('\u001e record \u001f field')));
  } finally {
    await fixture.dispose();
  }
});

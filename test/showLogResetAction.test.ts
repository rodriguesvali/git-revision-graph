import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getShowLogResetCommitLabel,
  resetShowLogCommit
} from '../src/showLog/resetAction';
import type { Repository } from '../src/git';
import type { RefActionServices } from '../src/refActions';
import type { RevisionLogEntry } from '../src/revisionGraphTypes';
import { createRepository } from './fakes';

test('getShowLogResetCommitLabel prefers the short hash', () => {
  assert.equal(getShowLogResetCommitLabel(createEntry('abcdef123456', 'abc123'), 'abcdef123456'), 'abc123');
});

test('getShowLogResetCommitLabel falls back to the full hash prefix', () => {
  assert.equal(getShowLogResetCommitLabel(createEntry('abcdef123456', ''), 'abcdef123456'), 'abcdef12');
});

test('resetShowLogCommit ignores commits that are not loaded', async () => {
  const didReset = await resetShowLogCommit(
    createRepository({ root: '/workspace/repo' }),
    [],
    'abc123',
    {} as RefActionServices,
    undefined,
    async () => {
      throw new Error('Unexpected reset.');
    }
  );

  assert.equal(didReset, false);
});

test('resetShowLogCommit reports when Git action services are unavailable', async () => {
  const errors: string[] = [];
  const didReset = await resetShowLogCommit(
    createRepository({ root: '/workspace/repo' }),
    [createEntry('abc123', 'abc123')],
    'abc123',
    undefined,
    {
      async showErrorMessage(message) {
        errors.push(message);
      }
    }
  );

  assert.equal(didReset, false);
  assert.deepEqual(errors, ['Could not reset the branch because Git actions are not ready yet.']);
});

test('resetShowLogCommit calls the reset workflow with the commit label', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const services = {} as RefActionServices;
  const calls: Array<{
    readonly repository: Repository;
    readonly commitHash: string;
    readonly commitLabel: string;
    readonly services: RefActionServices;
  }> = [];

  const didReset = await resetShowLogCommit(
    repository,
    [createEntry('abcdef123456', 'abc123')],
    'abcdef123456',
    services,
    undefined,
    async (repository, commitHash, commitLabel, services) => {
      calls.push({ repository, commitHash, commitLabel, services });
      return true;
    }
  );

  assert.equal(didReset, true);
  assert.deepEqual(calls, [
    { repository, commitHash: 'abcdef123456', commitLabel: 'abc123', services }
  ]);
});

function createEntry(hash: string, shortHash: string): RevisionLogEntry {
  return {
    hash,
    shortHash,
    author: 'Ada',
    date: '2026-06-06',
    subject: 'Change',
    message: 'Change',
    parentHashes: [],
    references: [],
    shortStat: undefined
  };
}

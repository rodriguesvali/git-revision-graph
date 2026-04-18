import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShowLogLaneRows } from '../src/showLog/showLogLanes';
import type { RevisionLogEntry } from '../src/revisionGraphTypes';

function createEntry(overrides: Partial<RevisionLogEntry> & Pick<RevisionLogEntry, 'hash' | 'shortHash' | 'subject'>): RevisionLogEntry {
  return {
    author: 'Ada',
    date: '2026-04-18',
    message: overrides.subject,
    parentHashes: [],
    references: [],
    shortStat: undefined,
    ...overrides
  };
}

test('builds a single continuing lane for linear history', () => {
  const rows = buildShowLogLaneRows([
    createEntry({
      hash: 'a'.repeat(40),
      shortHash: 'aaaaaaa',
      subject: 'Tip',
      parentHashes: ['b'.repeat(40)]
    }),
    createEntry({
      hash: 'b'.repeat(40),
      shortHash: 'bbbbbbb',
      subject: 'Base'
    })
  ]);

  const topRow = rows.get('a'.repeat(40));
  assert.ok(topRow);
  assert.equal(topRow.nodeLane, 0);
  assert.equal(topRow.laneCount, 1);
  assert.deepEqual(topRow.continuingLanes, [0]);
  assert.deepEqual(topRow.secondaryParentLanes, []);
});

test('allocates an extra lane for merge parents', () => {
  const rows = buildShowLogLaneRows([
    createEntry({
      hash: 'm'.repeat(40),
      shortHash: 'mmmmmmm',
      subject: 'Merge',
      parentHashes: ['a'.repeat(40), 'b'.repeat(40)]
    }),
    createEntry({
      hash: 'a'.repeat(40),
      shortHash: 'aaaaaaa',
      subject: 'Mainline',
      parentHashes: ['r'.repeat(40)]
    }),
    createEntry({
      hash: 'b'.repeat(40),
      shortHash: 'bbbbbbb',
      subject: 'Side branch',
      parentHashes: ['r'.repeat(40)]
    })
  ]);

  const mergeRow = rows.get('m'.repeat(40));
  assert.ok(mergeRow);
  assert.equal(mergeRow.nodeLane, 0);
  assert.equal(mergeRow.laneCount >= 2, true);
  assert.deepEqual(mergeRow.secondaryParentLanes, [1]);
  assert.equal(typeof mergeRow.colorByLane[1], 'number');
});

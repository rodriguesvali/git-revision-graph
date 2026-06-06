import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShowLogLaneRows } from '../src/showLog/showLogLanes';
import { createRevisionLogEntry } from './fakes';

test('builds a single continuing lane for linear history', () => {
  const rows = buildShowLogLaneRows([
    createRevisionLogEntry({
      hash: 'a'.repeat(40),
      shortHash: 'aaaaaaa',
      subject: 'Tip',
      parentHashes: ['b'.repeat(40)]
    }),
    createRevisionLogEntry({
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
    createRevisionLogEntry({
      hash: 'm'.repeat(40),
      shortHash: 'mmmmmmm',
      subject: 'Merge',
      parentHashes: ['a'.repeat(40), 'b'.repeat(40)]
    }),
    createRevisionLogEntry({
      hash: 'a'.repeat(40),
      shortHash: 'aaaaaaa',
      subject: 'Mainline',
      parentHashes: ['r'.repeat(40)]
    }),
    createRevisionLogEntry({
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
  assert.deepEqual(mergeRow.mergeStartLanes, [1]);
  assert.equal(typeof mergeRow.colorByLane[1], 'number');
});

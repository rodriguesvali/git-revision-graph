import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCommitShortStat } from '../src/revisionGraph/repository/commitShortStat';

test('parses commit short stats with insertions and deletions', () => {
  assert.deepEqual(
    parseCommitShortStat(' 11 files changed, 228 insertions(+), 53 deletions(-)\n'),
    { files: 11, insertions: 228, deletions: 53 }
  );
});

test('parses one-sided and singular commit short stats', () => {
  assert.deepEqual(
    parseCommitShortStat(' 1 file changed, 4 insertions(+)\n'),
    { files: 1, insertions: 4, deletions: 0 }
  );
  assert.equal(parseCommitShortStat(''), undefined);
});

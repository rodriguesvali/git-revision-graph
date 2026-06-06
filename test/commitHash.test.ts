import test from 'node:test';
import assert from 'node:assert/strict';

import { formatShortCommitHash, SHORT_COMMIT_HASH_LENGTH } from '../src/commitHash';

test('formatShortCommitHash uses the shared host display length', () => {
  assert.equal(SHORT_COMMIT_HASH_LENGTH, 8);
  assert.equal(formatShortCommitHash('abcdef1234567890'), 'abcdef12');
  assert.equal(formatShortCommitHash('abc123'), 'abc123');
});

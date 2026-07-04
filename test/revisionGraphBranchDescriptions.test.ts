import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGitBranchDescriptions } from '../src/revisionGraph/repository/branchDescriptions';

test('parses local Git branch descriptions while preserving multiline content', () => {
  const descriptions = parseGitBranchDescriptions(
    'branch.feature/demo.description\nCheckout redesign\0' +
    'branch.task/4312-adjust-timeout.description\nLine one\nLine two\0'
  );

  assert.deepEqual([...descriptions], [
    ['feature/demo', 'Checkout redesign'],
    ['task/4312-adjust-timeout', 'Line one\nLine two']
  ]);
});

test('ignores malformed or empty branch description records', () => {
  const descriptions = parseGitBranchDescriptions(
    'core.editor\ncode\0branch.feature/demo.description\n   \0malformed'
  );

  assert.deepEqual([...descriptions], []);
});

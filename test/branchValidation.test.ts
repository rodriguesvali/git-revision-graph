import test from 'node:test';
import assert from 'node:assert/strict';

import { validateGitBranchName } from '../src/refActions/branchValidation';

test('validateGitBranchName accepts common branch names', () => {
  assert.equal(validateGitBranchName('main'), undefined);
  assert.equal(validateGitBranchName('feature/demo'), undefined);
  assert.equal(validateGitBranchName('release/2026.04'), undefined);
  assert.equal(validateGitBranchName('user/issue-123_fix'), undefined);
});

test('validateGitBranchName rejects invalid Git branch ref shapes', () => {
  const invalidNames = [
    '',
    ' main',
    'main ',
    'refs/heads/main',
    '-main',
    '@',
    '/feature',
    'feature/',
    'feature//demo',
    'feature..demo',
    'feature@{demo',
    'feature.',
    '.feature',
    'feature/.demo',
    'feature.lock',
    'feature/demo.lock',
    'feature demo',
    'feature~demo',
    'feature^demo',
    'feature:demo',
    'feature?demo',
    'feature*demo',
    'feature[demo',
    'feature\\demo'
  ];

  for (const name of invalidNames) {
    assert.equal(typeof validateGitBranchName(name), 'string', name);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateGitTagName } from '../src/refActions/tagValidation';

test('validateGitTagName accepts common release tag names', () => {
  assert.equal(validateGitTagName('v1.2.3'), undefined);
  assert.equal(validateGitTagName('release/2026.04'), undefined);
  assert.equal(validateGitTagName('product/v1.2.3-rc.1'), undefined);
});

test('validateGitTagName rejects duplicate tag names', () => {
  assert.equal(validateGitTagName('v1.2.3', ['v1.2.3']), 'Tag v1.2.3 already exists.');
});

test('validateGitTagName rejects invalid Git ref name shapes', () => {
  const invalidNames = [
    '',
    ' v1.0.0',
    'v1.0.0 ',
    'refs/tags/v1.0.0',
    '-v1.0.0',
    '@',
    '/release',
    'release/',
    'release//candidate',
    'release..candidate',
    'release@{candidate',
    'release.',
    '.release',
    'release/.candidate',
    'release.lock',
    'release/candidate.lock',
    'release candidate',
    'release~candidate',
    'release^candidate',
    'release:candidate',
    'release?candidate',
    'release*candidate',
    'release[candidate',
    'release\\candidate'
  ];

  for (const name of invalidNames) {
    assert.equal(typeof validateGitTagName(name), 'string', name);
  }
});

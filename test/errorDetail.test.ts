import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMissingUpstreamConfigurationError,
  isNonInteractiveGitAuthenticationError,
  toErrorDetail,
  toOperationError
} from '../src/errorDetail';

test('toErrorDetail prefers stderr and appends git metadata', () => {
  assert.equal(
    toErrorDetail({
      message: 'fallback message',
      stderr: ' fatal: failed\n',
      gitErrorCode: 'GitError',
      exitCode: 128
    }),
    'fatal: failed [GitError] (exit code: 128)'
  );
});

test('toOperationError prefixes normalized error details', () => {
  assert.equal(
    toOperationError('Could not run Git.', ' command failed\n'),
    'Could not run Git. command failed'
  );
});

test('isNonInteractiveGitAuthenticationError recognizes disabled credential prompts', () => {
  assert.equal(
    isNonInteractiveGitAuthenticationError({
      stderr: 'fatal: could not read Username for https://example.test: terminal prompts disabled'
    }),
    true
  );
  assert.equal(
    isNonInteractiveGitAuthenticationError({ stderr: 'fatal: authentication failed' }),
    false
  );
});

test('isMissingUpstreamConfigurationError recognizes Git upstream errors', () => {
  assert.equal(
    isMissingUpstreamConfigurationError({
      stderr: "fatal: branch 'release/2026-copy' has no upstream information"
    }),
    true
  );
  assert.equal(
    isMissingUpstreamConfigurationError({ stderr: 'fatal: some other git error' }),
    false
  );
});

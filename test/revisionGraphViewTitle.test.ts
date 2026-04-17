import test from 'node:test';
import assert from 'node:assert/strict';

import { getRevisionGraphViewTitle } from '../src/revisionGraph/viewTitle';
import { createHead, createRepository } from './fakes';

test('formats the revision graph title with the current branch name', () => {
  const repository = createRepository({
    root: '/workspace/repo',
    head: createHead('feature/next')
  });

  assert.equal(getRevisionGraphViewTitle(repository), 'Branch: feature/next');
});

test('falls back to detached head when the repository has no branch name', () => {
  const repository = createRepository({
    root: '/workspace/repo'
  });

  assert.equal(getRevisionGraphViewTitle(repository), 'Branch: Detached HEAD');
});

test('falls back to no repository when no repository is selected', () => {
  assert.equal(getRevisionGraphViewTitle(undefined), 'Branch: No Repository');
});

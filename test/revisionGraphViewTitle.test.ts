import test from 'node:test';
import assert from 'node:assert/strict';

import { getRevisionGraphViewTitle } from '../src/revisionGraph/viewTitle';
import { createHead, createRepository } from './fakes';

test('formats the revision graph title with repository and current branch names', () => {
  const repository = createRepository({
    root: '/workspace/EngTutor',
    head: createHead('auth_version')
  });

  assert.equal(getRevisionGraphViewTitle(repository), 'EngTutor: Branch: auth_version');
});

test('falls back to detached head when the repository has no branch name', () => {
  const repository = createRepository({
    root: '/workspace/RepoCase'
  });

  assert.equal(getRevisionGraphViewTitle(repository), 'RepoCase: Branch: Detached HEAD');
});

test('falls back to no repository when no repository is selected', () => {
  assert.equal(getRevisionGraphViewTitle(undefined), 'No Repository');
});

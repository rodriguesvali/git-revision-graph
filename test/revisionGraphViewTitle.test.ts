import test from 'node:test';
import assert from 'node:assert/strict';

import { getRevisionGraphViewTitle } from '../src/revisionGraph/viewTitle';
import { RefType } from '../src/git';
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

  assert.equal(getRevisionGraphViewTitle(repository), 'RepoCase: Detached HEAD');
});

test('falls back to no repository when no repository is selected', () => {
  assert.equal(getRevisionGraphViewTitle(undefined), 'No Repository');
});

test('identifies tag-detached HEAD without claiming the tag is an attached branch', () => {
  const repository = createRepository({ root: '/workspace/angular', head: { type: RefType.Tag, name: 'v22.3.0-next.2' } });
  assert.equal(getRevisionGraphViewTitle(repository), 'angular: Detached HEAD (Tag: v22.3.0-next.2)');
});

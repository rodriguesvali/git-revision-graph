import test from 'node:test';
import assert from 'node:assert/strict';

import { isSameRepositoryPath, reconcileCurrentRepository, sortRepositoriesByPath } from '../src/repositorySelection';
import { createRepository } from './fakes';

test('sorts repositories by path', () => {
  const repoB = createRepository({ root: '/workspace/b' });
  const repoA = createRepository({ root: '/workspace/a' });

  const sorted = sortRepositoriesByPath([repoB, repoA]);

  assert.deepEqual(
    sorted.map((repository) => repository.rootUri.fsPath),
    ['/workspace/a', '/workspace/b']
  );
});

test('keeps the current repository when it still exists after repository changes', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });

  const currentRepository = reconcileCurrentRepository([repoA, repoB], repoB);

  assert.equal(currentRepository, repoB);
});

test('selects the only repository when there is no current selection', () => {
  const repository = createRepository({ root: '/workspace/repo' });

  const currentRepository = reconcileCurrentRepository([repository], undefined);

  assert.equal(currentRepository, repository);
});

test('promotes the only remaining repository when the current one disappears', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });

  const currentRepository = reconcileCurrentRepository([repoA], repoB);

  assert.equal(currentRepository, repoA);
});

test('clears the current repository when it disappears and multiple repositories remain', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });
  const repoC = createRepository({ root: '/workspace/c' });

  const currentRepository = reconcileCurrentRepository([repoA, repoC], repoB);

  assert.equal(currentRepository, undefined);
});

test('compares repository identity by path', () => {
  const repoA = createRepository({ root: '/workspace/repo' });
  const repoAClone = createRepository({ root: '/workspace/repo' });
  const repoB = createRepository({ root: '/workspace/other' });

  assert.equal(isSameRepositoryPath(repoA, repoAClone), true);
  assert.equal(isSameRepositoryPath(repoA, repoB), false);
  assert.equal(isSameRepositoryPath(repoA, undefined), false);
});

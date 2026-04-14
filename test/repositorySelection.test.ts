import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSameRepositoryPath,
  reconcileCurrentRepository,
  shouldRefreshGraphForRepositorySetChange,
  shouldPromptForGraphRepositoryOnOpen,
  sortRepositoriesByPath
} from '../src/repositorySelection';
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

test('skips the repository picker while opening the view for the first time', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });

  assert.equal(
    shouldPromptForGraphRepositoryOnOpen([repoA, repoB], undefined, false),
    false
  );
});

test('prompts for a repository when reopening an already-resolved multi-repository view', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });

  assert.equal(
    shouldPromptForGraphRepositoryOnOpen([repoA, repoB], undefined, true),
    true
  );
});

test('skips a graph refresh when repository set changes do not affect the selected repository or empty state', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoAReplacement = createRepository({ root: '/workspace/a' });

  assert.equal(
    shouldRefreshGraphForRepositorySetChange(repoA, repoAReplacement, true, true),
    false
  );
  assert.equal(
    shouldRefreshGraphForRepositorySetChange(undefined, undefined, true, true),
    false
  );
});

test('refreshes the graph when repository selection or repository availability changes', () => {
  const repoA = createRepository({ root: '/workspace/a' });
  const repoB = createRepository({ root: '/workspace/b' });

  assert.equal(
    shouldRefreshGraphForRepositorySetChange(repoA, repoB, true, true),
    true
  );
  assert.equal(
    shouldRefreshGraphForRepositorySetChange(undefined, repoA, false, true),
    true
  );
  assert.equal(
    shouldRefreshGraphForRepositorySetChange(repoA, undefined, true, false),
    true
  );
});

test('compares repository identity by path', () => {
  const repoA = createRepository({ root: '/workspace/repo' });
  const repoAClone = createRepository({ root: '/workspace/repo' });
  const repoB = createRepository({ root: '/workspace/other' });

  assert.equal(isSameRepositoryPath(repoA, repoAClone), true);
  assert.equal(isSameRepositoryPath(repoA, repoB), false);
  assert.equal(isSameRepositoryPath(repoA, undefined), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRefContent } from '../src/refContentLoader';
import { createRepository } from './fakes';

test('ref content loader preserves a valid empty blob', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const content = await loadRefContent(
    {
      repositoryPath: '/workspace/repo',
      ref: 'main',
      filePath: '/workspace/repo/empty.txt'
    },
    [repository],
    async (_repositoryPath, args, options) => {
      assert.deepEqual(args, ['show', '--end-of-options', 'main:empty.txt']);
      assert.deepEqual(options, { maxOutputBytes: 24 * 1024 * 1024, timeoutMs: 15_000 });
      return '';
    }
  );

  assert.equal(content, '');
});

test('ref content loader surfaces Git failures instead of returning empty content', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  await assert.rejects(
    loadRefContent(
      {
        repositoryPath: '/workspace/repo',
        ref: 'missing',
        filePath: '/workspace/repo/file.txt'
      },
      [repository],
      async () => { throw new Error('missing blob'); }
    ),
    /Could not load the selected revision content.*missing blob/
  );
});

test('ref content loader rejects stale repositories and outside paths', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  await assert.rejects(
    loadRefContent(
      { repositoryPath: '/workspace/missing', ref: 'main', filePath: '/workspace/missing/file.txt' },
      [repository]
    ),
    /no longer open/
  );
  await assert.rejects(
    loadRefContent(
      { repositoryPath: '/workspace/repo', ref: 'main', filePath: '/workspace/other/file.txt' },
      [repository]
    ),
    /outside its repository/
  );
});

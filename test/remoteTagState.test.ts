import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRemoteTagPublicationState } from '../src/revisionGraph/remoteTagState';

test('resolveRemoteTagPublicationState returns published when any remote contains the tag', async () => {
  const calls: string[] = [];

  const state = await resolveRemoteTagPublicationState({
    repositoryPath: '/repo',
    remoteNames: ['origin', 'upstream'],
    tagName: 'v1.2.0',
    async execGit(_repositoryPath, args) {
      calls.push(args[3]);
      return {
        stdout: args[3] === 'upstream' ? 'abc123\trefs/tags/v1.2.0\n' : '',
        stderr: ''
      };
    }
  });

  assert.equal(state, 'published');
  assert.deepEqual(calls, ['origin', 'upstream']);
});

test('resolveRemoteTagPublicationState returns unpublished when all remotes resolve without the tag', async () => {
  const state = await resolveRemoteTagPublicationState({
    repositoryPath: '/repo',
    remoteNames: ['origin', 'upstream'],
    tagName: 'v1.2.0',
    async execGit() {
      return { stdout: '', stderr: '' };
    }
  });

  assert.equal(state, 'unpublished');
});

test('resolveRemoteTagPublicationState returns unknown when lookup fails and no remote is published', async () => {
  const state = await resolveRemoteTagPublicationState({
    repositoryPath: '/repo',
    remoteNames: ['origin', 'upstream'],
    tagName: 'v1.2.0',
    async execGit(_repositoryPath, args) {
      if (args[3] === 'origin') {
        throw new Error('network unavailable');
      }

      return { stdout: '', stderr: '' };
    }
  });

  assert.equal(state, 'unknown');
});

test('resolveRemoteTagPublicationState lets a published remote override earlier unknown lookups', async () => {
  const state = await resolveRemoteTagPublicationState({
    repositoryPath: '/repo',
    remoteNames: ['origin', 'upstream'],
    tagName: 'v1.2.0',
    async execGit(_repositoryPath, args) {
      if (args[3] === 'origin') {
        throw new Error('network unavailable');
      }

      return { stdout: 'abc123\trefs/tags/v1.2.0\n', stderr: '' };
    }
  });

  assert.equal(state, 'published');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  openShowLogCommitOnRemote,
  type ShowLogRemoteCommitServices
} from '../src/showLog/remoteCommitAction';
import { createRepository } from './fakes';

test('openShowLogCommitOnRemote opens a hosted commit URL', async () => {
  const openedUrls: string[] = [];
  const messages: string[] = [];
  const opened = await openShowLogCommitOnRemote(
    createRepository({
      root: '/workspace/repo',
      remotes: [
        { name: 'origin', fetchUrl: 'https://github.com/owner/project.git', pushUrl: undefined, isReadOnly: false }
      ]
    }),
    'abc123',
    createServices({
      async openExternal(url) {
        openedUrls.push(url);
      },
      async showInformationMessage(message) {
        messages.push(message);
      }
    })
  );

  assert.equal(opened, true);
  assert.deepEqual(openedUrls, ['https://github.com/owner/project/commit/abc123']);
  assert.deepEqual(messages, []);
});

test('openShowLogCommitOnRemote opens an Azure DevOps commit URL', async () => {
  const openedUrls: string[] = [];
  const opened = await openShowLogCommitOnRemote(
    createRepository({
      root: '/workspace/repo',
      remotes: [{
        name: 'origin',
        fetchUrl: 'git@ssh.dev.azure.com:v3/fabrikam/Project/Repo',
        pushUrl: undefined,
        isReadOnly: false
      }]
    }),
    'abc123',
    createServices({
      async openExternal(url) {
        openedUrls.push(url);
      }
    })
  );

  assert.equal(opened, true);
  assert.deepEqual(openedUrls, ['https://dev.azure.com/fabrikam/Project/_git/Repo/commit/abc123']);
});

test('openShowLogCommitOnRemote reports when no supported remote is configured', async () => {
  const openedUrls: string[] = [];
  const messages: string[] = [];
  const opened = await openShowLogCommitOnRemote(
    createRepository({
      root: '/workspace/repo',
      remotes: [
        { name: 'origin', fetchUrl: 'https://example.com/owner/project.git', pushUrl: undefined, isReadOnly: false }
      ]
    }),
    'abc123',
    createServices({
      async openExternal(url) {
        openedUrls.push(url);
      },
      async showInformationMessage(message) {
        messages.push(message);
      }
    })
  );

  assert.equal(opened, false);
  assert.deepEqual(openedUrls, []);
  assert.deepEqual(messages, ['No supported Git hosting remote is configured for this repository.']);
});

test('openShowLogCommitOnRemote reports a supported provider without a verified commit route', async () => {
  const messages: string[] = [];
  const opened = await openShowLogCommitOnRemote(
    createRepository({
      root: '/workspace/repo',
      remotes: [{
        name: 'origin',
        fetchUrl: 'https://example-123456789012-git.us-central1.sourcemanager.dev/project/repo.git',
        pushUrl: undefined,
        isReadOnly: false
      }]
    }),
    'abc123',
    createServices({
      async showInformationMessage(message) {
        messages.push(message);
      }
    })
  );

  assert.equal(opened, false);
  assert.deepEqual(messages, [
    'Google Secure Source Manager does not expose a verified commit link for this remote.'
  ]);
});

function createServices(
  overrides: Partial<ShowLogRemoteCommitServices> = {}
): ShowLogRemoteCommitServices {
  return {
    async openExternal() {},
    async showInformationMessage() {},
    ...overrides
  };
}

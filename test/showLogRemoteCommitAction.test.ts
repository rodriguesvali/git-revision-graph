import test from 'node:test';
import assert from 'node:assert/strict';

import {
  openShowLogCommitOnGitHub,
  type ShowLogRemoteCommitServices
} from '../src/showLog/remoteCommitAction';
import { createRepository } from './fakes';

test('openShowLogCommitOnGitHub opens the GitHub commit URL', async () => {
  const openedUrls: string[] = [];
  const messages: string[] = [];
  const opened = await openShowLogCommitOnGitHub(
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

test('openShowLogCommitOnGitHub reports when no GitHub remote is configured', async () => {
  const openedUrls: string[] = [];
  const messages: string[] = [];
  const opened = await openShowLogCommitOnGitHub(
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
  assert.deepEqual(messages, ['No GitHub remote is configured for this repository.']);
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

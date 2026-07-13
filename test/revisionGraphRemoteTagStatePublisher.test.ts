import test from 'node:test';
import assert from 'node:assert/strict';

import { createRepository } from './fakes';
import { RevisionGraphRemoteTagStatePublisher } from '../src/revisionGraph/remoteTagStatePublisher';
import type {
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../src/revisionGraphTypes';

test('RevisionGraphRemoteTagStatePublisher posts responses for the current repository state', () => {
  const repository = createRepository({ root: '/repo' });
  const state = createState();
  const messages: RevisionGraphViewHostMessage[] = [];
  const publisher = new RevisionGraphRemoteTagStatePublisher({
    getCurrentRepository: () => repository,
    getCurrentState: () => state,
    postHostMessage: (message) => messages.push(message)
  });

  const context = publisher.createRequestContext(repository);
  publisher.postIfCurrent(context, 'v2.0.0', 'published');

  assert.deepEqual(messages, [{
    type: 'set-remote-tag-state',
    tagName: 'v2.0.0',
    state: 'published'
  }]);
});

test('RevisionGraphRemoteTagStatePublisher discards responses after state replacement', () => {
  const repository = createRepository({ root: '/repo' });
  let state = createState();
  const messages: RevisionGraphViewHostMessage[] = [];
  const publisher = new RevisionGraphRemoteTagStatePublisher({
    getCurrentRepository: () => repository,
    getCurrentState: () => state,
    postHostMessage: (message) => messages.push(message)
  });

  const context = publisher.createRequestContext(repository);
  state = createState();
  publisher.postIfCurrent(context, 'v2.0.0', 'published');

  assert.deepEqual(messages, []);
});

test('RevisionGraphRemoteTagStatePublisher discards responses after repository replacement', () => {
  const repository = createRepository({ root: '/repo' });
  let currentRepository = repository;
  const state = createState();
  const messages: RevisionGraphViewHostMessage[] = [];
  const publisher = new RevisionGraphRemoteTagStatePublisher({
    getCurrentRepository: () => currentRepository,
    getCurrentState: () => state,
    postHostMessage: (message) => messages.push(message)
  });

  const context = publisher.createRequestContext(repository);
  currentRepository = createRepository({ root: '/other-repo' });
  publisher.postIfCurrent(context, 'v2.0.0', 'published');

  assert.deepEqual(messages, []);
});

function createState(): RevisionGraphViewState {
  return {} as RevisionGraphViewState;
}

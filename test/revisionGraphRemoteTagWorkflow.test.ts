import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import { RemoteTagPublicationState } from '../src/revisionGraphTypes';
import { RemoteTagPublicationRequestContext } from '../src/revisionGraph/remoteTagState';
import {
  RevisionGraphRemoteTagWorkflow,
  RevisionGraphRemoteTagWorkflowHost
} from '../src/revisionGraph/remoteTagWorkflow';

test('RevisionGraphRemoteTagWorkflow posts the resolved remote tag state for the current repository', async () => {
  const repository = createRepository('/repo');
  const posts: PostedRemoteTagState[] = [];
  const workflow = new RevisionGraphRemoteTagWorkflow(
    createHost({ repository, posts }),
    {
      async getRepositoryRemoteNames(currentRepository) {
        assert.equal(currentRepository, repository);
        return ['origin'];
      },
      async resolveRemoteTagPublicationState(options) {
        assert.deepEqual(options, {
          repositoryPath: '/repo',
          remoteNames: ['origin'],
          tagName: 'v1.0.0'
        });
        return 'published';
      }
    }
  );

  await workflow.resolveRemoteTagState('v1.0.0');

  assert.deepEqual(posts, [{
    contextRepositoryPath: '/repo',
    tagName: 'v1.0.0',
    state: 'published'
  }]);
});

test('RevisionGraphRemoteTagWorkflow reports unknown when remote tag state lookup fails', async () => {
  const posts: PostedRemoteTagState[] = [];
  const workflow = new RevisionGraphRemoteTagWorkflow(
    createHost({
      repository: createRepository('/repo'),
      posts
    }),
    {
      async getRepositoryRemoteNames() {
        throw new Error('repository unavailable');
      },
      async resolveRemoteTagPublicationState() {
        throw new Error('should not resolve remote tag state');
      }
    }
  );

  await workflow.resolveRemoteTagState('v1.0.0');

  assert.deepEqual(posts, [{
    contextRepositoryPath: '/repo',
    tagName: 'v1.0.0',
    state: 'unknown'
  }]);
});

test('RevisionGraphRemoteTagWorkflow posts published after a successful tag push', async () => {
  const repository = createRepository('/repo');
  const posts: PostedRemoteTagState[] = [];
  const pushedTargets: Array<{ readonly refName: string; readonly label: string; readonly kind: string }> = [];
  const workflow = new RevisionGraphRemoteTagWorkflow(
    createHost({ repository, posts }),
    {
      async pushTagResolvedReference(currentRepository, target) {
        assert.equal(currentRepository, repository);
        pushedTargets.push(target);
        return true;
      }
    }
  );

  await workflow.pushTag('v1.0.0', 'v1.0.0', 'tag');

  assert.deepEqual(pushedTargets, [{ refName: 'v1.0.0', label: 'v1.0.0', kind: 'tag' }]);
  assert.deepEqual(posts, [{
    contextRepositoryPath: '/repo',
    tagName: 'v1.0.0',
    state: 'published'
  }]);
});

test('RevisionGraphRemoteTagWorkflow skips remote tag actions without a current repository', async () => {
  let pushCount = 0;
  const workflow = new RevisionGraphRemoteTagWorkflow(
    createHost(),
    {
      async pushTagResolvedReference() {
        pushCount += 1;
        return true;
      }
    }
  );

  await workflow.pushTag('v1.0.0', 'v1.0.0', 'tag');

  assert.equal(pushCount, 0);
});

interface PostedRemoteTagState {
  readonly contextRepositoryPath: string | undefined;
  readonly tagName: string;
  readonly state: RemoteTagPublicationState;
}

function createHost(options: {
  readonly repository?: Repository;
  readonly posts?: PostedRemoteTagState[];
} = {}): RevisionGraphRemoteTagWorkflowHost {
  const actionServices = {} as RefActionServices;
  return {
    actionServices,
    getCurrentRepository() {
      return options.repository;
    },
    postCurrentState() {},
    createRemoteTagPublicationRequestContext(repository): RemoteTagPublicationRequestContext {
      return {
        repositoryPath: repository.rootUri.fsPath,
        state: {}
      };
    },
    postRemoteTagStateIfCurrent(requestContext, tagName, state) {
      options.posts?.push({
        contextRepositoryPath: requestContext.repositoryPath,
        tagName,
        state
      });
    }
  };
}

function createRepository(repositoryPath: string): Repository {
  return {
    rootUri: {
      fsPath: repositoryPath
    }
  } as Repository;
}

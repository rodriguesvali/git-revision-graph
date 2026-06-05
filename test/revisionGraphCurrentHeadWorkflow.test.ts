import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import {
  RevisionGraphCurrentHeadWorkflow,
  RevisionGraphCurrentHeadWorkflowHost
} from '../src/revisionGraph/currentHeadWorkflow';

test('RevisionGraphCurrentHeadWorkflow runs current HEAD actions with the current repository', async () => {
  const repository = createRepository('/repo');
  const calls: string[] = [];
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({ repository }),
    {
      async syncCurrentHeadWithUpstream(currentRepository) {
        calls.push(currentRepository.rootUri.fsPath);
        return true;
      }
    }
  );

  await workflow.syncCurrentHead();

  assert.deepEqual(calls, ['/repo']);
});

test('RevisionGraphCurrentHeadWorkflow posts current state when an action does not schedule refresh', async () => {
  let postCurrentStateCount = 0;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pullCurrentBranchFromUpstream() {
        return false;
      }
    }
  );

  await workflow.pullCurrentHead();

  assert.equal(postCurrentStateCount, 1);
});

test('RevisionGraphCurrentHeadWorkflow does not post current state when an action schedules refresh', async () => {
  let postCurrentStateCount = 0;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      repository: createRepository('/repo'),
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pushCurrentBranchToUpstream() {
        return true;
      }
    }
  );

  await workflow.pushCurrentHead();

  assert.equal(postCurrentStateCount, 0);
});

test('RevisionGraphCurrentHeadWorkflow posts current state when no repository is selected', async () => {
  let pushCount = 0;
  let postCurrentStateCount = 0;
  const workflow = new RevisionGraphCurrentHeadWorkflow(
    createHost({
      postCurrentState() {
        postCurrentStateCount += 1;
      }
    }),
    {
      async pushCurrentBranchToUpstream() {
        pushCount += 1;
        return true;
      }
    }
  );

  await workflow.pushCurrentHead();

  assert.equal(pushCount, 0);
  assert.equal(postCurrentStateCount, 1);
});

function createHost(options: {
  readonly repository?: Repository;
  postCurrentState?(): void;
} = {}): RevisionGraphCurrentHeadWorkflowHost {
  return {
    actionServices: {} as RefActionServices,
    getCurrentRepository() {
      return options.repository;
    },
    postCurrentState() {
      options.postCurrentState?.();
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

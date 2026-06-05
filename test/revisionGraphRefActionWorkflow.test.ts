import test from 'node:test';
import assert from 'node:assert/strict';

import { Repository } from '../src/git';
import { RefActionServices } from '../src/refActions';
import {
  RevisionGraphRefActionWorkflow,
  RevisionGraphRefActionWorkflowHost
} from '../src/revisionGraph/refActionWorkflow';

test('RevisionGraphRefActionWorkflow runs checkout with the current repository and graph target', async () => {
  const repository = createRepository('/repo');
  const checkouts: Array<{ readonly repositoryPath: string; readonly refName: string; readonly label: string; readonly kind: string | undefined }> = [];
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost({ repository }),
    {
      async checkoutResolvedReference(currentRepository, target) {
        checkouts.push({
          repositoryPath: currentRepository.rootUri.fsPath,
          refName: target.refName,
          label: target.label,
          kind: target.kind
        });
      }
    }
  );

  await workflow.checkout('main', 'head');

  assert.deepEqual(checkouts, [{
    repositoryPath: '/repo',
    refName: 'main',
    label: 'main',
    kind: 'head'
  }]);
});

test('RevisionGraphRefActionWorkflow skips reference actions without a current repository', async () => {
  let checkoutCount = 0;
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost(),
    {
      async checkoutResolvedReference() {
        checkoutCount += 1;
      }
    }
  );

  await workflow.checkout('main', 'head');

  assert.equal(checkoutCount, 0);
});

test('RevisionGraphRefActionWorkflow preserves reset workspace options', async () => {
  const includeUntrackedValues: boolean[] = [];
  const workflow = new RevisionGraphRefActionWorkflow(
    createHost({
      repository: createRepository('/repo')
    }),
    {
      async resetCurrentBranchWorkspace(_repository, includeUntracked) {
        includeUntrackedValues.push(includeUntracked);
      }
    }
  );

  await workflow.resetCurrentWorkspace(true);
  await workflow.resetCurrentWorkspace(false);

  assert.deepEqual(includeUntrackedValues, [true, false]);
});

function createHost(options: {
  readonly repository?: Repository;
} = {}): RevisionGraphRefActionWorkflowHost {
  return {
    actionServices: {} as RefActionServices,
    getCurrentRepository() {
      return options.repository;
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

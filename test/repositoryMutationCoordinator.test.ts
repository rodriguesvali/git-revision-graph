import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMutationGuardedRepository,
  RepositoryMutationCoordinator
} from '../src/repositoryMutationCoordinator';
import type { Repository } from '../src/git';

test('repository mutation coordinator rejects overlapping work for the same repository', async () => {
  const coordinator = new RepositoryMutationCoordinator();
  let releaseFirst: (() => void) | undefined;
  const first = coordinator.run('/repo', async () => {
    await new Promise<void>((resolve) => { releaseFirst = resolve; });
    return 'first';
  });

  const second = await coordinator.run('/repo', () => 'second');
  assert.deepEqual(second, { status: 'rejected' });

  releaseFirst?.();
  assert.deepEqual(await first, { status: 'completed', value: 'first' });
});

test('repository mutation coordinator allows different repositories concurrently', async () => {
  const coordinator = new RepositoryMutationCoordinator();
  let releaseFirst: (() => void) | undefined;
  const first = coordinator.run('/repo-a', async () => {
    await new Promise<void>((resolve) => { releaseFirst = resolve; });
  });

  const second = await coordinator.run('/repo-b', () => 'second');
  assert.deepEqual(second, { status: 'completed', value: 'second' });

  releaseFirst?.();
  await first;
});

test('repository mutation coordinator releases a repository after failure', async () => {
  const coordinator = new RepositoryMutationCoordinator();

  await assert.rejects(
    coordinator.run('/repo', () => { throw new Error('failed'); }),
    /failed/
  );

  assert.deepEqual(
    await coordinator.run('/repo', () => 'recovered'),
    { status: 'completed', value: 'recovered' }
  );
});

test('repository mutation coordinator invalidates guarded Git calls after a prompt', async () => {
  const coordinator = new RepositoryMutationCoordinator();
  let continuePrompt: (() => void) | undefined;
  let checkoutCount = 0;
  const repository = {
    rootUri: { fsPath: '/repo' },
    async checkout() {
      checkoutCount += 1;
    }
  } as unknown as Repository;

  const operation = coordinator.run('/repo', async (lease) => {
    await new Promise<void>((resolve) => { continuePrompt = resolve; });
    await createMutationGuardedRepository(repository, lease).checkout('main');
  });

  coordinator.invalidate('/repo');
  continuePrompt?.();

  await assert.rejects(operation, { name: 'AbortError' });
  assert.equal(checkoutCount, 0);
});

test('repository mutation coordinator releases leases after cancellation', async () => {
  const coordinator = new RepositoryMutationCoordinator();
  let continueOperation: (() => void) | undefined;
  const operation = coordinator.run('/repo', async (lease) => {
    await new Promise<void>((resolve) => { continueOperation = resolve; });
    lease.assertCurrent();
  });

  coordinator.invalidate('/repo');
  assert.deepEqual(
    await coordinator.run('/repo', () => 'overlap'),
    { status: 'rejected' }
  );
  continueOperation?.();
  await assert.rejects(operation, { name: 'AbortError' });

  assert.deepEqual(
    await coordinator.run('/repo', () => 'next'),
    { status: 'completed', value: 'next' }
  );
});

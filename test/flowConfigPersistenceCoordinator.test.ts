import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  FlowConfigPersistenceCoordinator,
  RepositoryFlowConfigOptionsPersister
} from '../src/revisionGraph/flow';

test('Flow config persistence serializes updates for the same repository', async () => {
  const firstWrite = createDeferred();
  const started: boolean[] = [];
  const coordinator = new FlowConfigPersistenceCoordinator(async (_root, _settings, update) => {
    started.push(update.enabled ?? false);
    if (started.length === 1) {
      await firstWrite.promise;
    }
    return { ok: true, path: '/workspace/repository/.git-revision-graph-flow.json' };
  });

  const first = coordinator.enqueue('/workspace/repository', undefined, { enabled: true });
  await flushPromises();
  const second = coordinator.enqueue('/workspace/repository', undefined, { enabled: false });
  await flushPromises();

  assert.deepEqual(started, [true]);
  firstWrite.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(started, [true, false]);
});

test('Flow config persistence keeps different repositories independent', async () => {
  const writesStarted = createDeferred();
  const releases = [createDeferred(), createDeferred()];
  let started = 0;
  const coordinator = new FlowConfigPersistenceCoordinator(async (root) => {
    const index = started;
    started += 1;
    if (started === 2) {
      writesStarted.resolve();
    }
    await releases[index].promise;
    return { ok: true, path: path.join(root, '.git-revision-graph-flow.json') };
  });

  const first = coordinator.enqueue('/workspace/repository-a', undefined, { enabled: true });
  const second = coordinator.enqueue('/workspace/repository-b', undefined, { enabled: false });
  await writesStarted.promise;

  assert.equal(started, 2);
  releases[0].resolve();
  releases[1].resolve();
  await Promise.all([first, second]);
});

test('Flow config persistence continues the queue after a failed write', async () => {
  const calls: boolean[] = [];
  const persister: RepositoryFlowConfigOptionsPersister = async (_root, _settings, update) => {
    calls.push(update.enabled ?? false);
    if (calls.length === 1) {
      throw new Error('filesystem failure');
    }
    return { ok: true, path: '/workspace/repository/.git-revision-graph-flow.json' };
  };
  const coordinator = new FlowConfigPersistenceCoordinator(persister);

  const failed = coordinator.enqueue('/workspace/repository', undefined, { enabled: true });
  const succeeded = coordinator.enqueue('/workspace/repository', undefined, { enabled: false });

  await assert.rejects(failed, /filesystem failure/);
  await succeeded;
  assert.deepEqual(calls, [true, false]);
});

test('Flow config persistence preserves the latest rapid update', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'flow-config-persistence-'));
  const configPath = path.join(root, '.git-revision-graph-flow.json');
  await writeFile(configPath, JSON.stringify({ schemaVersion: 1, enabled: true, marker: 'preserved' }));
  const coordinator = new FlowConfigPersistenceCoordinator();

  try {
    await Promise.all([
      coordinator.enqueue(root, undefined, { enabled: false }),
      coordinator.enqueue(root, undefined, { enabled: true }),
      coordinator.enqueue(root, undefined, { enabled: false })
    ]);

    const persisted = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
    assert.equal(persisted.enabled, false);
    assert.equal(persisted.marker, 'preserved');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function createDeferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => resolvePromise?.()
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

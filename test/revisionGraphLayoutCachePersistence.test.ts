import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY,
  ProjectedGraphLayoutCachePersistence,
  type ProjectedGraphLayoutCachePersistenceServices,
  type ProjectedGraphLayoutCacheState
} from '../src/revisionGraph/layout/cachePersistence';
import type { SerializedProjectedGraphLayoutCacheEntry } from '../src/revisionGraph/layout/layeredLayout';

test('ProjectedGraphLayoutCachePersistence restores persisted cache entries', () => {
  const persistedCache = [createCacheEntry('persisted')];
  const restoredCaches: Array<readonly SerializedProjectedGraphLayoutCacheEntry[] | undefined> = [];
  const persistence = new ProjectedGraphLayoutCachePersistence(
    createState(persistedCache),
    createServices({
      restoreCache(entries) {
        restoredCaches.push(entries);
      },
      serializeCache() {
        return persistedCache;
      }
    })
  );

  persistence.restore();

  assert.deepEqual(restoredCaches, [persistedCache]);
});

test('ProjectedGraphLayoutCachePersistence rewrites normalized restored cache entries', async () => {
  const persistedCache = [createCacheEntry('persisted')];
  const normalizedCache = [createCacheEntry('normalized')];
  const state = createState(persistedCache);
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return normalizedCache;
      }
    })
  );

  persistence.restore();
  await Promise.resolve();

  assert.deepEqual(state.updates, [
    { key: PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, value: normalizedCache }
  ]);
});

test('ProjectedGraphLayoutCachePersistence skips unchanged persisted cache writes', async () => {
  const persistedCache = [createCacheEntry('persisted')];
  const state = createState(persistedCache);
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return persistedCache;
      }
    })
  );

  persistence.restore();
  await persistence.persist();

  assert.deepEqual(state.updates, []);
});

test('ProjectedGraphLayoutCachePersistence clears persisted cache when serialization fails', async () => {
  const state = createState([createCacheEntry('persisted')]);
  const warnings: string[] = [];
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        throw new Error('Nope.');
      },
      warn(message) {
        warnings.push(message);
      }
    })
  );

  await persistence.persist();

  assert.deepEqual(state.updates, [
    { key: PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, value: undefined }
  ]);
  assert.deepEqual(warnings, ['Failed to serialize the revision graph layout cache.']);
});

test('ProjectedGraphLayoutCachePersistence clears in-memory and persisted cache', async () => {
  const state = createState([createCacheEntry('persisted')]);
  const timers: Array<() => void> = [];
  let clearedCacheCount = 0;
  let clearedTimers = 0;
  let persistence!: ProjectedGraphLayoutCachePersistence;

  persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      clearCache() {
        clearedCacheCount += 1;
        persistence.schedulePersist();
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {
        clearedTimers += 1;
      }
    }),
    10
  );

  persistence.schedulePersist();
  await persistence.clear();

  assert.equal(clearedCacheCount, 1);
  assert.equal(timers.length, 2);
  assert.equal(clearedTimers, 2);
  assert.deepEqual(state.updates, [
    { key: PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, value: undefined }
  ]);
});

test('ProjectedGraphLayoutCachePersistence debounces scheduled writes and flushes on dispose', async () => {
  const persistedCache: SerializedProjectedGraphLayoutCacheEntry[] = [];
  const nextCache = [createCacheEntry('next')];
  const state = createState(persistedCache);
  const timers: Array<() => void> = [];
  let clearedTimers = 0;
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return nextCache;
      },
      setTimeout(callback) {
        timers.push(callback);
        return callback;
      },
      clearTimeout() {
        clearedTimers += 1;
      }
    }),
    10
  );

  persistence.schedulePersist();
  persistence.schedulePersist();
  persistence.dispose();
  await Promise.resolve();

  assert.equal(timers.length, 2);
  assert.equal(clearedTimers, 2);
  assert.deepEqual(state.updates, [
    { key: PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, value: nextCache }
  ]);
});

test('ProjectedGraphLayoutCachePersistence serializes writes without letting stale state win', async () => {
  const firstCache = [createCacheEntry('first')];
  const secondCache = [createCacheEntry('second')];
  const firstUpdate = createDeferred<void>();
  const startedUpdates: Array<SerializedProjectedGraphLayoutCacheEntry[] | undefined> = [];
  let currentCache = firstCache;
  const state: ProjectedGraphLayoutCacheState = {
    get(_key, defaultValue) {
      return defaultValue;
    },
    async update(_key, value) {
      startedUpdates.push(value);
      if (startedUpdates.length === 1) {
        await firstUpdate.promise;
      }
    }
  };
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return currentCache;
      }
    })
  );

  const firstPersist = persistence.persist();
  await Promise.resolve();
  currentCache = secondCache;
  const secondPersist = persistence.persist();
  await Promise.resolve();

  assert.deepEqual(startedUpdates, [firstCache]);

  firstUpdate.resolve(undefined);
  await Promise.all([firstPersist, secondPersist]);

  assert.deepEqual(startedUpdates, [firstCache, secondCache]);
});

test('ProjectedGraphLayoutCachePersistence orders clear after an active write', async () => {
  const nextCache = [createCacheEntry('next')];
  const firstUpdate = createDeferred<void>();
  const startedUpdates: Array<SerializedProjectedGraphLayoutCacheEntry[] | undefined> = [];
  const state: ProjectedGraphLayoutCacheState = {
    get(_key, defaultValue) {
      return defaultValue;
    },
    async update(_key, value) {
      startedUpdates.push(value);
      if (startedUpdates.length === 1) {
        await firstUpdate.promise;
      }
    }
  };
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return nextCache;
      }
    })
  );

  const persist = persistence.persist();
  await Promise.resolve();
  const clear = persistence.clear();
  await Promise.resolve();

  assert.deepEqual(startedUpdates, [nextCache]);

  firstUpdate.resolve(undefined);
  await Promise.all([persist, clear]);

  assert.deepEqual(startedUpdates, [nextCache, undefined]);
});

test('ProjectedGraphLayoutCachePersistence continues queued writes after an update failure', async () => {
  const firstCache = [createCacheEntry('first')];
  const secondCache = [createCacheEntry('second')];
  const updates: Array<SerializedProjectedGraphLayoutCacheEntry[] | undefined> = [];
  const warnings: string[] = [];
  let currentCache = firstCache;
  let failNextUpdate = true;
  const state: ProjectedGraphLayoutCacheState = {
    get(_key, defaultValue) {
      return defaultValue;
    },
    async update(_key, value) {
      updates.push(value);
      if (failNextUpdate) {
        failNextUpdate = false;
        throw new Error('Workspace state is temporarily unavailable.');
      }
    }
  };
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return currentCache;
      },
      warn(message) {
        warnings.push(message);
      }
    })
  );

  await persistence.persist();
  currentCache = secondCache;
  await persistence.persist();

  assert.deepEqual(updates, [firstCache, undefined, secondCache]);
  assert.deepEqual(warnings, ['Failed to persist the revision graph layout cache.']);
});

test('ProjectedGraphLayoutCachePersistence flush waits for active writes and persists the latest snapshot', async () => {
  const firstCache = [createCacheEntry('first')];
  const latestCache = [createCacheEntry('latest')];
  const firstUpdate = createDeferred<void>();
  const updates: Array<SerializedProjectedGraphLayoutCacheEntry[] | undefined> = [];
  let currentCache = firstCache;
  const state: ProjectedGraphLayoutCacheState = {
    get(_key, defaultValue) {
      return defaultValue;
    },
    async update(_key, value) {
      updates.push(value);
      if (updates.length === 1) {
        await firstUpdate.promise;
      }
    }
  };
  const persistence = new ProjectedGraphLayoutCachePersistence(
    state,
    createServices({
      serializeCache() {
        return currentCache;
      }
    })
  );

  const firstPersist = persistence.persist();
  await Promise.resolve();
  currentCache = latestCache;
  const flush = persistence.flush();
  let flushed = false;
  void flush.then(() => {
    flushed = true;
  });
  await Promise.resolve();

  assert.equal(flushed, false);
  assert.deepEqual(updates, [firstCache]);

  firstUpdate.resolve(undefined);
  await Promise.all([firstPersist, flush]);

  assert.equal(flushed, true);
  assert.deepEqual(updates, [firstCache, latestCache]);
});

function createCacheEntry(key: string): SerializedProjectedGraphLayoutCacheEntry {
  return {
    key,
    positions: [['commit', { x: 10, y: 20 }]]
  };
}

function createState(initialCache: SerializedProjectedGraphLayoutCacheEntry[]): ProjectedGraphLayoutCacheState & {
  readonly updates: Array<{
    readonly key: string;
    readonly value: SerializedProjectedGraphLayoutCacheEntry[] | undefined;
  }>;
} {
  const updates: Array<{
    readonly key: string;
    readonly value: SerializedProjectedGraphLayoutCacheEntry[] | undefined;
  }> = [];

  return {
    updates,
    get(key, defaultValue) {
      assert.equal(key, PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY);
      return initialCache as typeof defaultValue;
    },
    async update(key, value) {
      updates.push({ key, value });
    }
  };
}

function createServices(
  overrides: Partial<ProjectedGraphLayoutCachePersistenceServices>
): ProjectedGraphLayoutCachePersistenceServices {
  return {
    restoreCache() {},
    serializeCache() {
      return [];
    },
    setTimeout(callback) {
      return callback;
    },
    clearTimeout() {},
    warn() {},
    ...overrides
  };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

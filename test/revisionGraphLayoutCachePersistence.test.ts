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

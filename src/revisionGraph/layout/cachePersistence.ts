import type * as vscode from 'vscode';

import {
  clearProjectedGraphLayoutCache,
  restoreProjectedGraphLayoutCache,
  serializeProjectedGraphLayoutCache,
  type SerializedProjectedGraphLayoutCacheEntry
} from './layeredLayout';

export const PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY = 'gitRevisionGraph.projectedGraphLayoutCache.v1';
export const PROJECTED_GRAPH_LAYOUT_CACHE_SAVE_DELAY_MS = 500;

export interface ProjectedGraphLayoutCacheState {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: SerializedProjectedGraphLayoutCacheEntry[] | undefined): Thenable<void>;
}

export interface ProjectedGraphLayoutCachePersistenceServices {
  clearCache?: () => void;
  restoreCache(entries: readonly SerializedProjectedGraphLayoutCacheEntry[] | undefined): void;
  serializeCache(): SerializedProjectedGraphLayoutCacheEntry[];
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
  warn(message: string, error: unknown): void;
}

const defaultServices: ProjectedGraphLayoutCachePersistenceServices = {
  clearCache: clearProjectedGraphLayoutCache,
  restoreCache: restoreProjectedGraphLayoutCache,
  serializeCache: serializeProjectedGraphLayoutCache,
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
  warn: (message, error) => console.warn(message, error)
};

export class ProjectedGraphLayoutCachePersistence implements vscode.Disposable {
  private saveTimer: unknown;
  private lastPersistedCacheJson: string | undefined;
  private persistenceTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly state: ProjectedGraphLayoutCacheState,
    private readonly services: ProjectedGraphLayoutCachePersistenceServices = defaultServices,
    private readonly saveDelayMs = PROJECTED_GRAPH_LAYOUT_CACHE_SAVE_DELAY_MS
  ) {}

  restore(): void {
    try {
      const persistedCache = this.state.get<SerializedProjectedGraphLayoutCacheEntry[]>(
        PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY,
        []
      );
      this.services.restoreCache(persistedCache);
      const restoredCache = this.services.serializeCache();
      const persistedCacheJson = serializeCacheForComparison(persistedCache ?? []);
      const restoredCacheJson = serializeCacheForComparison(restoredCache);
      this.lastPersistedCacheJson = persistedCacheJson;
      if (persistedCacheJson !== restoredCacheJson) {
        void this.persist(true);
      }
    } catch (error) {
      this.services.warn('Failed to restore the persisted revision graph layout cache.', error);
      this.services.restoreCache(undefined);
      this.lastPersistedCacheJson = undefined;
      void this.clearPersistedCache();
    }
  }

  schedulePersist(): void {
    if (this.saveTimer) {
      this.services.clearTimeout(this.saveTimer);
    }

    this.saveTimer = this.services.setTimeout(() => {
      this.saveTimer = undefined;
      void this.persist();
    }, this.saveDelayMs);
  }

  async persist(force = false): Promise<void> {
    let serializedCache: SerializedProjectedGraphLayoutCacheEntry[];
    try {
      serializedCache = this.services.serializeCache();
    } catch (error) {
      this.services.warn('Failed to serialize the revision graph layout cache.', error);
      await this.clearPersistedCache();
      return;
    }

    await this.enqueuePersistence(async () => {
      const serializedCacheJson = serializeCacheForComparison(serializedCache);
      if (!force && serializedCacheJson === this.lastPersistedCacheJson) {
        return;
      }

      try {
        await this.state.update(
          PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY,
          serializedCache.length > 0 ? serializedCache : undefined
        );
        this.lastPersistedCacheJson = serializedCacheJson;
      } catch (error) {
        this.services.warn('Failed to persist the revision graph layout cache.', error);
        await this.clearPersistedCacheNow();
      }
    });
  }

  async clear(): Promise<void> {
    if (this.saveTimer) {
      this.services.clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }

    try {
      if (this.services.clearCache) {
        this.services.clearCache();
      } else {
        this.services.restoreCache(undefined);
      }
      if (this.saveTimer) {
        this.services.clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
      }
      await this.clearPersistedCache();
    } catch (error) {
      this.services.warn('Failed to clear the revision graph layout cache.', error);
    }
  }

  dispose(): void {
    if (this.saveTimer) {
      this.services.clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }

    void this.persist();
  }

  async flush(): Promise<void> {
    await this.persist();
    await this.persistenceTail;
  }

  private async clearPersistedCache(): Promise<void> {
    await this.enqueuePersistence(() => this.clearPersistedCacheNow());
  }

  private async clearPersistedCacheNow(): Promise<void> {
    try {
      await this.state.update(PROJECTED_GRAPH_LAYOUT_CACHE_STATE_KEY, undefined);
      this.lastPersistedCacheJson = serializeCacheForComparison([]);
    } catch (error) {
      this.services.warn('Failed to clear the persisted revision graph layout cache.', error);
    }
  }

  private enqueuePersistence(operation: () => Promise<void>): Promise<void> {
    const queued = this.persistenceTail.then(operation, operation);
    this.persistenceTail = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }
}

function serializeCacheForComparison(
  cache: readonly SerializedProjectedGraphLayoutCacheEntry[]
): string {
  return JSON.stringify(cache);
}

import { createHash } from 'node:crypto';

import { ProjectedGraph, RevisionGraphOrganizationStrategy } from '../model/commitGraphTypes';
import { calculateD3DagSugiyamaLayout } from './d3DagSugiyamaLayout';
import { calculateGitAwareProjectedGraphLayout } from './gitAwareLayout';
import { calculatePortedTortoiseMajorOpsLayout } from './portedTortoiseMajorOpsLayout';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const PROJECTED_GRAPH_LAYOUT_CACHE_MAX_ENTRIES = 12;
export const PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS = 2500;
const PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY: RevisionGraphOrganizationStrategy = 'gitAware';
const PROJECTED_GRAPH_LAYOUT_STRATEGY_VERSION: Record<RevisionGraphOrganizationStrategy, string> = {
  gitAware: 'git-aware-v12',
  portedTortoiseMajorOps: 'ported-tortoise-major-ops-v1',
  d3DagSugiyama: 'd3-dag-sugiyama-v1'
};

const projectedGraphLayoutCache = new Map<string, ProjectedGraphLayoutCacheEntry>();
const projectedGraphLayoutCacheChangeListeners = new Set<() => void>();

interface ProjectedGraphLayoutCacheEntry {
  promise: Promise<Map<string, ProjectedGraphLayoutPosition>>;
  positions?: Map<string, ProjectedGraphLayoutPosition>;
}

export interface SerializedProjectedGraphLayoutCacheEntry {
  readonly key: string;
  readonly positions: readonly [string, ProjectedGraphLayoutPosition][];
}

export interface ProjectedGraphLayoutCacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
}

let projectedGraphLayoutCacheHits = 0;
let projectedGraphLayoutCacheMisses = 0;

export interface ProjectedGraphLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export async function layoutProjectedGraph(
  projection: ProjectedGraph,
  strategy: RevisionGraphOrganizationStrategy = PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  if (projection.nodes.length === 0) {
    return new Map();
  }

  const cacheKey = buildProjectedGraphLayoutCacheKey(projection, strategy);
  const cachedLayoutEntry = projectedGraphLayoutCache.get(cacheKey);
  if (cachedLayoutEntry) {
    projectedGraphLayoutCache.delete(cacheKey);
    projectedGraphLayoutCache.set(cacheKey, cachedLayoutEntry);
    projectedGraphLayoutCacheHits += 1;
    return cloneLayoutPositions(await cachedLayoutEntry.promise);
  }

  projectedGraphLayoutCacheMisses += 1;
  const cacheEntry: ProjectedGraphLayoutCacheEntry = {
    promise: calculateProjectedGraphLayout(projection, strategy)
  };
  cacheEntry.promise = cacheEntry.promise
    .then((positions) => {
      cacheEntry.positions = cloneLayoutPositions(positions);
      notifyProjectedGraphLayoutCacheChanged();
      return positions;
    })
    .catch((error) => {
      projectedGraphLayoutCache.delete(cacheKey);
      throw error;
    });
  projectedGraphLayoutCache.set(cacheKey, cacheEntry);
  pruneProjectedGraphLayoutCache();

  return cloneLayoutPositions(await cacheEntry.promise);
}

export function buildProjectedGraphLayoutCacheKey(
  projection: ProjectedGraph,
  strategy: RevisionGraphOrganizationStrategy = PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY
): string {
  const hash = createHash('sha256');
  const strategyKey = PROJECTED_GRAPH_LAYOUT_STRATEGY_VERSION[strategy];
  hash.update(strategyKey);

  for (const node of projection.nodes) {
    hash.update('\0node\0');
    hash.update(node.hash);
    hash.update('\0');
    hash.update(String(estimateRevisionGraphNodeWidth(node)));
    hash.update('\0');
    hash.update(String(estimateRevisionGraphNodeHeight(node)));
    hash.update('\0');
    hash.update(node.isBoundary ? 'boundary' : 'commit');
    for (const ref of [...node.refs].sort(compareLayoutCacheRefs)) {
      hash.update('\0ref\0');
      hash.update(ref.kind);
      hash.update('\0');
      hash.update(ref.name);
    }
  }

  for (const edge of projection.edges) {
    hash.update('\0edge\0');
    hash.update(edge.from);
    hash.update('\0');
    hash.update(edge.to);
  }

  return `${strategyKey}:${hash.digest('base64url')}`;
}

export function getProjectedGraphLayoutCacheStats(): ProjectedGraphLayoutCacheStats {
  return {
    entries: projectedGraphLayoutCache.size,
    hits: projectedGraphLayoutCacheHits,
    misses: projectedGraphLayoutCacheMisses
  };
}

export function clearProjectedGraphLayoutCache(): void {
  projectedGraphLayoutCache.clear();
  projectedGraphLayoutCacheHits = 0;
  projectedGraphLayoutCacheMisses = 0;
  notifyProjectedGraphLayoutCacheChanged();
}

export function serializeProjectedGraphLayoutCache(): SerializedProjectedGraphLayoutCacheEntry[] {
  return [...projectedGraphLayoutCache.entries()]
    .flatMap(([key, entry]) => entry.positions && entry.positions.size <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS
      ? [{
          key,
          positions: [...entry.positions.entries()]
        }]
      : []
    );
}

export function restoreProjectedGraphLayoutCache(
  entries: readonly SerializedProjectedGraphLayoutCacheEntry[] | undefined
): void {
  projectedGraphLayoutCache.clear();
  projectedGraphLayoutCacheHits = 0;
  projectedGraphLayoutCacheMisses = 0;

  for (const entry of entries ?? []) {
    if (!isSerializedProjectedGraphLayoutCacheEntry(entry)) {
      continue;
    }

    const positions = new Map(entry.positions);
    projectedGraphLayoutCache.set(entry.key, {
      positions,
      promise: Promise.resolve(cloneLayoutPositions(positions))
    });
    pruneProjectedGraphLayoutCache();
  }
}

export function onProjectedGraphLayoutCacheDidChange(listener: () => void): { dispose(): void } {
  projectedGraphLayoutCacheChangeListeners.add(listener);
  return {
    dispose() {
      projectedGraphLayoutCacheChangeListeners.delete(listener);
    }
  };
}

async function calculateProjectedGraphLayout(
  projection: ProjectedGraph,
  strategy: RevisionGraphOrganizationStrategy
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  switch (strategy) {
    case 'd3DagSugiyama':
      return calculateD3DagSugiyamaLayout(projection);
    case 'portedTortoiseMajorOps':
      return calculatePortedTortoiseMajorOpsLayout(projection);
    case 'gitAware':
      return calculateGitAwareProjectedGraphLayout(projection);
  }
}

function compareLayoutCacheRefs(
  left: ProjectedGraph['nodes'][number]['refs'][number],
  right: ProjectedGraph['nodes'][number]['refs'][number]
): number {
  return left.kind.localeCompare(right.kind) ||
    left.name.localeCompare(right.name);
}

function cloneLayoutPositions(
  positions: ReadonlyMap<string, ProjectedGraphLayoutPosition>
): Map<string, ProjectedGraphLayoutPosition> {
  return new Map(positions);
}

function pruneProjectedGraphLayoutCache(): void {
  while (projectedGraphLayoutCache.size > PROJECTED_GRAPH_LAYOUT_CACHE_MAX_ENTRIES) {
    const oldestKey = projectedGraphLayoutCache.keys().next().value;
    if (!oldestKey) {
      return;
    }

    projectedGraphLayoutCache.delete(oldestKey);
  }
}

function notifyProjectedGraphLayoutCacheChanged(): void {
  for (const listener of projectedGraphLayoutCacheChangeListeners) {
    listener();
  }
}

function isSerializedProjectedGraphLayoutCacheEntry(
  entry: unknown
): entry is SerializedProjectedGraphLayoutCacheEntry {
  const positions = (entry as { positions?: unknown } | undefined)?.positions;
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { key?: unknown }).key === 'string' &&
    Array.isArray(positions) &&
    positions.length <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS &&
    positions.every(isSerializedPositionEntry)
  );
}

function isSerializedPositionEntry(entry: unknown): entry is [string, ProjectedGraphLayoutPosition] {
  return (
    Array.isArray(entry) &&
    entry.length === 2 &&
    typeof entry[0] === 'string' &&
    typeof entry[1] === 'object' &&
    entry[1] !== null &&
    typeof (entry[1] as { x?: unknown }).x === 'number' &&
    typeof (entry[1] as { y?: unknown }).y === 'number'
  );
}

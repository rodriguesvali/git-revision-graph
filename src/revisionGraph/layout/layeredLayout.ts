import { createHash } from 'node:crypto';

import { isAbortError, throwIfAborted } from '../../errors';
import { ProjectedGraph } from '../model/commitGraphTypes';
import {
  calculateD3DagSugiyamaLayout,
  D3DagSugiyamaEdgeRoute,
  D3DagSugiyamaLayoutInput,
  D3DagSugiyamaLayoutProfile,
  selectD3DagSugiyamaLayoutProfile
} from './d3DagSugiyamaLayout';
import { calculateD3DagSugiyamaLayoutInWorker } from './d3DagSugiyamaLayoutWorkerHost';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const PROJECTED_GRAPH_LAYOUT_CACHE_MAX_ENTRIES = 12;
export const PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS = 2500;
export const PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTES = 5000;
const PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTE_POINTS = 32;
const PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY = 'd3-dag-sugiyama-v4';

const projectedGraphLayoutCache = new Map<string, ProjectedGraphLayoutCacheEntry>();
const projectedGraphLayoutCacheChangeListeners = new Set<() => void>();

interface ProjectedGraphLayoutCacheEntry {
  promise: Promise<ProjectedGraphLayoutResult>;
  positions?: Map<string, ProjectedGraphLayoutPosition>;
  edgeRoutes?: Map<string, D3DagSugiyamaEdgeRoute>;
}

export interface SerializedProjectedGraphLayoutCacheEntry {
  readonly key: string;
  readonly positions: readonly [string, ProjectedGraphLayoutPosition][];
  readonly edgeRoutes?: readonly [string, D3DagSugiyamaEdgeRoute][];
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

export interface ProjectedGraphLayoutResult {
  readonly positions: Map<string, ProjectedGraphLayoutPosition>;
  readonly edgeRoutes: Map<string, D3DagSugiyamaEdgeRoute>;
}

export async function layoutProjectedGraph(
  projection: ProjectedGraph,
  signal?: AbortSignal
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  return (await layoutProjectedGraphWithRoutes(projection, signal)).positions;
}

export async function layoutProjectedGraphWithRoutes(
  projection: ProjectedGraph,
  signal?: AbortSignal
): Promise<ProjectedGraphLayoutResult> {
  if (projection.nodes.length === 0) {
    return {
      positions: new Map(),
      edgeRoutes: new Map()
    };
  }

  throwIfAborted(signal, 'The d3-dag layout was aborted.');
  const cacheKey = buildProjectedGraphLayoutCacheKey(projection);
  const cachedLayoutEntry = projectedGraphLayoutCache.get(cacheKey);
  if (cachedLayoutEntry) {
    projectedGraphLayoutCache.delete(cacheKey);
    projectedGraphLayoutCache.set(cacheKey, cachedLayoutEntry);
    projectedGraphLayoutCacheHits += 1;
    throwIfAborted(signal, 'The d3-dag layout was aborted.');
    return cloneLayoutResult(await cachedLayoutEntry.promise);
  }

  projectedGraphLayoutCacheMisses += 1;
  const cacheEntry: ProjectedGraphLayoutCacheEntry = {
    promise: calculateProjectedGraphLayout(projection, signal)
  };
  cacheEntry.promise = cacheEntry.promise
    .then((result) => {
      cacheEntry.positions = cloneLayoutPositions(result.positions);
      cacheEntry.edgeRoutes = cloneLayoutEdgeRoutes(result.edgeRoutes);
      notifyProjectedGraphLayoutCacheChanged();
      return result;
    })
    .catch((error) => {
      projectedGraphLayoutCache.delete(cacheKey);
      throw error;
    });
  projectedGraphLayoutCache.set(cacheKey, cacheEntry);
  pruneProjectedGraphLayoutCache();

  return cloneLayoutResult(await cacheEntry.promise);
}

export function buildProjectedGraphLayoutCacheKey(projection: ProjectedGraph): string {
  const hash = createHash('sha256');
  hash.update(PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY);
  hash.update('\0profile\0');
  hash.update(getProjectedGraphLayoutProfile(projection));

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

  return `${PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY}:${hash.digest('base64url')}`;
}

export function getProjectedGraphLayoutProfile(projection: ProjectedGraph): D3DagSugiyamaLayoutProfile {
  return selectD3DagSugiyamaLayoutProfile(createD3DagSugiyamaLayoutInput(projection));
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
          positions: [...entry.positions.entries()],
          edgeRoutes: shouldPersistLayoutEdgeRoutes(entry.edgeRoutes)
            ? [...entry.edgeRoutes.entries()]
            : undefined
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
    const edgeRoutes = new Map(entry.edgeRoutes ?? []);
    projectedGraphLayoutCache.set(entry.key, {
      positions,
      edgeRoutes,
      promise: Promise.resolve({
        positions: cloneLayoutPositions(positions),
        edgeRoutes: cloneLayoutEdgeRoutes(edgeRoutes)
      })
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
  signal: AbortSignal | undefined
): Promise<ProjectedGraphLayoutResult> {
  const layoutInput = createD3DagSugiyamaLayoutInput(projection);
  try {
    return toProjectedGraphLayoutResult(await calculateD3DagSugiyamaLayoutInWorker(layoutInput, signal));
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throwIfAborted(signal, 'The d3-dag layout was aborted.');
    return toProjectedGraphLayoutResult(calculateD3DagSugiyamaLayout(layoutInput));
  }
}

function createD3DagSugiyamaLayoutInput(projection: ProjectedGraph): D3DagSugiyamaLayoutInput {
  return {
    nodes: projection.nodes,
    edges: projection.edges
  };
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

function cloneLayoutEdgeRoutes(
  edgeRoutes: ReadonlyMap<string, D3DagSugiyamaEdgeRoute>
): Map<string, D3DagSugiyamaEdgeRoute> {
  return new Map(
    [...edgeRoutes.entries()].map(([key, route]) => [
      key,
      {
        from: route.from,
        to: route.to,
        points: route.points.map((point) => ({ x: point.x, y: point.y }))
      }
    ])
  );
}

function cloneLayoutResult(result: ProjectedGraphLayoutResult): ProjectedGraphLayoutResult {
  return {
    positions: cloneLayoutPositions(result.positions),
    edgeRoutes: cloneLayoutEdgeRoutes(result.edgeRoutes)
  };
}

function toProjectedGraphLayoutResult(result: {
  readonly positions: ReadonlyMap<string, ProjectedGraphLayoutPosition>;
  readonly edgeRoutes: ReadonlyMap<string, D3DagSugiyamaEdgeRoute>;
}): ProjectedGraphLayoutResult {
  return {
    positions: cloneLayoutPositions(result.positions),
    edgeRoutes: cloneLayoutEdgeRoutes(result.edgeRoutes)
  };
}

function shouldPersistLayoutEdgeRoutes(
  edgeRoutes: ReadonlyMap<string, D3DagSugiyamaEdgeRoute> | undefined
): edgeRoutes is ReadonlyMap<string, D3DagSugiyamaEdgeRoute> {
  return !!edgeRoutes &&
    edgeRoutes.size <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTES &&
    [...edgeRoutes.values()].every((route) =>
      route.points.length <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTE_POINTS
    );
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
    positions.every(isSerializedPositionEntry) &&
    isSerializedEdgeRouteEntries((entry as { edgeRoutes?: unknown }).edgeRoutes)
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

function isSerializedEdgeRouteEntries(
  entries: unknown
): entries is [string, D3DagSugiyamaEdgeRoute][] | undefined {
  return entries === undefined ||
    (
      Array.isArray(entries) &&
      entries.length <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTES &&
      entries.every(isSerializedEdgeRouteEntry)
    );
}

function isSerializedEdgeRouteEntry(entry: unknown): entry is [string, D3DagSugiyamaEdgeRoute] {
  return (
    Array.isArray(entry) &&
    entry.length === 2 &&
    typeof entry[0] === 'string' &&
    isSerializedEdgeRoute(entry[1])
  );
}

function isSerializedEdgeRoute(route: unknown): route is D3DagSugiyamaEdgeRoute {
  const points = (route as { points?: unknown } | undefined)?.points;
  return (
    typeof route === 'object' &&
    route !== null &&
    typeof (route as { from?: unknown }).from === 'string' &&
    typeof (route as { to?: unknown }).to === 'string' &&
    Array.isArray(points) &&
    points.length >= 2 &&
    points.length <= PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_ROUTE_POINTS &&
    points.every(isSerializedLayoutPoint)
  );
}

function isSerializedLayoutPoint(point: unknown): point is ProjectedGraphLayoutPosition {
  return (
    typeof point === 'object' &&
    point !== null &&
    typeof (point as { x?: unknown }).x === 'number' &&
    Number.isFinite((point as { x: number }).x) &&
    typeof (point as { y?: unknown }).y === 'number' &&
    Number.isFinite((point as { y: number }).y)
  );
}

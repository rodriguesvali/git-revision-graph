import { createHash } from 'node:crypto';
import ELK, { ElkNode } from 'elkjs/lib/elk.bundled';

import { ProjectedGraph } from '../model/commitGraphTypes';
import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const elk = new ELK();

const ELK_FALLBACK_SPACING = 52;
const ELK_FALLBACK_LAYER_SPACING = 96;
const PROJECTED_GRAPH_LAYOUT_CACHE_MAX_ENTRIES = 12;
const PROJECTED_GRAPH_LAYOUT_OPTIONS_KEY = JSON.stringify({
  algorithm: 'org.eclipse.elk.layered',
  direction: 'DOWN',
  edgeRouting: 'POLYLINE',
  nodeNodeSpacing: 52,
  nodeNodeBetweenLayersSpacing: 72,
  crossingMinimizationStrategy: 'LAYER_SWEEP',
  nodePlacementStrategy: 'NETWORK_SIMPLEX'
});

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
  projection: ProjectedGraph
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  if (projection.nodes.length === 0) {
    return new Map();
  }

  const cacheKey = buildProjectedGraphLayoutCacheKey(projection);
  const cachedLayoutEntry = projectedGraphLayoutCache.get(cacheKey);
  if (cachedLayoutEntry) {
    projectedGraphLayoutCache.delete(cacheKey);
    projectedGraphLayoutCache.set(cacheKey, cachedLayoutEntry);
    projectedGraphLayoutCacheHits += 1;
    return cloneLayoutPositions(await cachedLayoutEntry.promise);
  }

  projectedGraphLayoutCacheMisses += 1;
  const cacheEntry: ProjectedGraphLayoutCacheEntry = {
    promise: calculateProjectedGraphLayout(projection)
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

export function buildProjectedGraphLayoutCacheKey(projection: ProjectedGraph): string {
  const hash = createHash('sha256');
  hash.update(PROJECTED_GRAPH_LAYOUT_OPTIONS_KEY);

  for (const node of projection.nodes) {
    hash.update('\0node\0');
    hash.update(node.hash);
    hash.update('\0');
    hash.update(String(estimateRevisionGraphNodeWidth(node)));
    hash.update('\0');
    hash.update(String(estimateRevisionGraphNodeHeight(node)));
  }

  for (const edge of projection.edges) {
    hash.update('\0edge\0');
    hash.update(edge.from);
    hash.update('\0');
    hash.update(edge.to);
  }

  return `elk-layered-v1:${hash.digest('base64url')}`;
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
    .flatMap(([key, entry]) => entry.positions
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
  projection: ProjectedGraph
): Promise<Map<string, ProjectedGraphLayoutPosition>> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered',
      'org.eclipse.elk.direction': 'DOWN',
      'org.eclipse.elk.edgeRouting': 'POLYLINE',
      'org.eclipse.elk.spacing.nodeNode': '52',
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
    },
    children: projection.nodes.map((node) => ({
      id: node.hash,
      width: estimateRevisionGraphNodeWidth(node),
      height: estimateRevisionGraphNodeHeight(node)
    })),
    edges: projection.edges.map((edge, index) => ({
      id: `edge:${index}:${edge.from}:${edge.to}`,
      sources: [edge.from],
      targets: [edge.to]
    }))
  };

  const layout = await elk.layout(graph);
  const positions = new Map<string, ProjectedGraphLayoutPosition>();
  const fallbackXByHash = new Map<string, number>();
  const fallbackYByHash = new Map<string, number>();
  let nextFallbackX = 0;

  for (const [index, node] of projection.nodes.entries()) {
    fallbackXByHash.set(node.hash, nextFallbackX);
    fallbackYByHash.set(node.hash, index * ELK_FALLBACK_LAYER_SPACING);
    nextFallbackX += estimateRevisionGraphNodeWidth(node) + ELK_FALLBACK_SPACING;
  }

  for (const [index, node] of (layout.children ?? []).entries()) {
    positions.set(node.id, {
      x: node.x ?? fallbackXByHash.get(node.id) ?? index * (220 + ELK_FALLBACK_SPACING),
      y: node.y ?? fallbackYByHash.get(node.id) ?? index * ELK_FALLBACK_LAYER_SPACING
    });
  }

  return positions;
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
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { key?: unknown }).key === 'string' &&
    Array.isArray((entry as { positions?: unknown }).positions) &&
    (entry as { positions: unknown[] }).positions.every(isSerializedPositionEntry)
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

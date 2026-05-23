import { ProjectedGraph, ProjectedGraphEdge, ProjectedGraphNode } from '../model/commitGraphTypes';
import {
  estimateRevisionGraphNodeWidth
} from './nodeSizing';

const DEFAULT_LAYER_SPACING = 96;
const DEFAULT_NODE_SPACING = 52;
const MAINLINE_REF_SCORE = 1_000_000;
const FIRST_PARENT_CONTINUATION_SCORE = 250_000;
const SIDE_LEFT = -1;
const SIDE_RIGHT = 1;

export interface GitAwareProjectedGraphLayoutPosition {
  readonly x: number;
  readonly y: number;
}

interface BranchComponent {
  readonly hashes: readonly string[];
  readonly minRow: number;
  readonly maxRow: number;
  readonly anchorRow: number;
  readonly weight: number;
  readonly key: string;
}

interface AssignedBranchComponent extends BranchComponent {
  readonly side: number;
  readonly distance: number;
}

export function calculateGitAwareProjectedGraphLayout(
  projection: ProjectedGraph
): Map<string, GitAwareProjectedGraphLayoutPosition> {
  const mainlinePath = detectMainlinePath(projection);
  const mainlineHashes = new Set(mainlinePath);
  const rowByHash = buildLayerRows(projection, mainlinePath);
  const branchComponents = buildBranchComponents(projection, rowByHash, mainlineHashes);
  const assignedComponents = assignBranchComponentSides(branchComponents);
  const laneSpacing = getLaneSpacing(projection);
  const maxLeftDistance = assignedComponents.reduce(
    (max, component) => Math.max(max, component.side === SIDE_LEFT ? component.distance : 0),
    0
  );
  const mainlineLane = maxLeftDistance;
  const laneByHash = new Map<string, number>();

  for (const hash of mainlineHashes) {
    laneByHash.set(hash, mainlineLane);
  }

  for (const component of assignedComponents) {
    const lane = mainlineLane + component.side * component.distance;
    for (const hash of component.hashes) {
      laneByHash.set(hash, lane);
    }
  }

  const positions = new Map<string, GitAwareProjectedGraphLayoutPosition>();
  for (const node of projection.nodes) {
    positions.set(node.hash, {
      x: (laneByHash.get(node.hash) ?? mainlineLane) * laneSpacing,
      y: (rowByHash.get(node.hash) ?? 0) * DEFAULT_LAYER_SPACING
    });
  }

  return positions;
}

function buildLayerRows(
  projection: ProjectedGraph,
  mainlinePath: readonly string[]
): Map<string, number> {
  const rawRowByHash = new Map<string, number>();
  const childEdgesByHash = buildChildEdgesByHash(projection);

  for (const [row, hash] of mainlinePath.entries()) {
    rawRowByHash.set(hash, row);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of projection.edges) {
      const childRow = rawRowByHash.get(edge.from);
      const parentRow = rawRowByHash.get(edge.to);
      if (parentRow !== undefined && childRow === undefined) {
        rawRowByHash.set(edge.from, parentRow - 1);
        changed = true;
      } else if (childRow !== undefined && parentRow === undefined) {
        rawRowByHash.set(edge.to, childRow + 1);
        changed = true;
      }
    }
  }

  const fallbackRowByHash = buildFallbackLayerRows(projection, childEdgesByHash);
  for (const node of projection.nodes) {
    if (!rawRowByHash.has(node.hash)) {
      rawRowByHash.set(node.hash, fallbackRowByHash.get(node.hash) ?? 0);
    }
  }

  const orderedRows = [...new Set(rawRowByHash.values())].sort((left, right) => left - right);
  const compactRowByRawRow = new Map(orderedRows.map((row, index) => [row, index] as const));
  return new Map(
    [...rawRowByHash.entries()].map(([hash, row]) => [hash, compactRowByRawRow.get(row) ?? row] as const)
  );
}

function buildFallbackLayerRows(
  projection: ProjectedGraph,
  childEdgesByHash: ReadonlyMap<string, readonly ProjectedGraphEdge[]>
): Map<string, number> {
  const rawRowByHash = new Map<string, number>(
    projection.nodes.map((node) => [node.hash, 0] as const)
  );

  for (const node of projection.nodes) {
    const nodeRow = rawRowByHash.get(node.hash) ?? 0;
    for (const edge of childEdgesByHash.get(node.hash) ?? []) {
      if (!rawRowByHash.has(edge.to)) {
        continue;
      }

      rawRowByHash.set(edge.to, Math.max(rawRowByHash.get(edge.to) ?? 0, nodeRow + 1));
    }
  }

  return rawRowByHash;
}

function detectMainlinePath(projection: ProjectedGraph): string[] {
  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  const childEdgesByHash = buildChildEdgesByHash(projection);
  const startNode = chooseMainlineStartNode(projection.nodes);
  const mainlinePath: string[] = [];
  const mainlineHashes = new Set<string>();
  let currentHash: string | undefined = startNode?.hash;

  while (currentHash && !mainlineHashes.has(currentHash)) {
    mainlineHashes.add(currentHash);
    mainlinePath.push(currentHash);
    const candidates = childEdgesByHash.get(currentHash) ?? [];
    if (candidates.length === 0) {
      break;
    }

    const next = candidates
      .map((edge, index) => ({
        hash: edge.to,
        index,
        node: nodeByHash.get(edge.to)
      }))
      .filter((candidate): candidate is { readonly hash: string; readonly index: number; readonly node: ProjectedGraphNode } =>
        candidate.node !== undefined
      )
      .sort((left, right) =>
        getMainlineContinuationScore(right.node, right.index) -
        getMainlineContinuationScore(left.node, left.index) ||
        left.node.hash.localeCompare(right.node.hash)
      )[0];

    currentHash = next?.hash;
  }

  return mainlinePath;
}

function chooseMainlineStartNode(nodes: readonly ProjectedGraphNode[]): ProjectedGraphNode | undefined {
  return [...nodes]
    .map((node, index) => ({ node, index }))
    .sort((left, right) =>
      getMainlineStartScore(right.node, right.index) -
      getMainlineStartScore(left.node, left.index) ||
      left.node.hash.localeCompare(right.node.hash)
    )[0]?.node;
}

function getMainlineStartScore(node: ProjectedGraphNode, index: number): number {
  return getRefPriorityScore(node) + Math.max(0, 10_000 - index);
}

function getMainlineContinuationScore(node: ProjectedGraphNode, edgeIndex: number): number {
  return getRefPriorityScore(node) +
    (edgeIndex === 0 ? FIRST_PARENT_CONTINUATION_SCORE : 0);
}

function getRefPriorityScore(node: ProjectedGraphNode): number {
  let score = 0;
  for (const ref of node.refs) {
    const normalizedName = ref.name.toLowerCase();
    if (ref.kind === 'head') {
      score = Math.max(score, MAINLINE_REF_SCORE);
    } else if (ref.kind === 'branch' && isMainlineBranchName(normalizedName)) {
      score = Math.max(score, 900_000);
    } else if (ref.kind === 'remote' && isMainlineRemoteName(normalizedName)) {
      score = Math.max(score, 850_000);
    } else if (ref.kind === 'branch') {
      score = Math.max(score, 120_000);
    } else if (ref.kind === 'remote') {
      score = Math.max(score, 80_000);
    } else if (ref.kind === 'tag' && isReleaseLikeRefName(normalizedName)) {
      score = Math.max(score, 40_000);
    } else if (ref.kind === 'tag') {
      score = Math.max(score, 20_000);
    }
  }

  return score;
}

function isMainlineBranchName(name: string): boolean {
  return name === 'main' || name === 'master' || name === 'trunk';
}

function isMainlineRemoteName(name: string): boolean {
  return name === 'origin/head' ||
    name === 'origin/main' ||
    name === 'origin/master' ||
    name.endsWith('/head') ||
    name.endsWith('/main') ||
    name.endsWith('/master');
}

function isReleaseLikeRefName(name: string): boolean {
  return /^v?\d+(?:[._-]\d+)+/.test(name) ||
    name.startsWith('rel_') ||
    name.startsWith('release');
}

function buildChildEdgesByHash(projection: ProjectedGraph): Map<string, ProjectedGraphEdge[]> {
  const edgesByHash = new Map<string, ProjectedGraphEdge[]>();
  for (const edge of projection.edges) {
    const edges = edgesByHash.get(edge.from);
    if (edges) {
      edges.push(edge);
    } else {
      edgesByHash.set(edge.from, [edge]);
    }
  }

  return edgesByHash;
}

function buildBranchComponents(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  mainlineHashes: ReadonlySet<string>
): BranchComponent[] {
  const nonMainlineHashes = new Set(
    projection.nodes
      .map((node) => node.hash)
      .filter((hash) => !mainlineHashes.has(hash))
  );
  const adjacency = buildNonMainlineAdjacency(projection, nonMainlineHashes);
  const visited = new Set<string>();
  const components: BranchComponent[] = [];

  for (const hash of nonMainlineHashes) {
    if (visited.has(hash)) {
      continue;
    }

    const queue = [hash];
    const hashes: string[] = [];
    visited.add(hash);
    for (let index = 0; index < queue.length; index += 1) {
      const currentHash = queue[index];
      hashes.push(currentHash);
      for (const neighbor of adjacency.get(currentHash) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }

        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(buildBranchComponent(projection, rowByHash, mainlineHashes, hashes));
  }

  return components.sort(compareBranchComponents);
}

function buildNonMainlineAdjacency(
  projection: ProjectedGraph,
  nonMainlineHashes: ReadonlySet<string>
): Map<string, string[]> {
  const adjacency = new Map([...nonMainlineHashes].map((hash) => [hash, [] as string[]] as const));
  for (const edge of projection.edges) {
    if (!nonMainlineHashes.has(edge.from) || !nonMainlineHashes.has(edge.to)) {
      continue;
    }

    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  return adjacency;
}

function buildBranchComponent(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  mainlineHashes: ReadonlySet<string>,
  hashes: readonly string[]
): BranchComponent {
  const hashSet = new Set(hashes);
  const rows = hashes.map((hash) => rowByHash.get(hash) ?? 0);
  const anchorRows: number[] = [];
  for (const edge of projection.edges) {
    if (hashSet.has(edge.from) && mainlineHashes.has(edge.to)) {
      anchorRows.push(rowByHash.get(edge.to) ?? 0);
    } else if (mainlineHashes.has(edge.from) && hashSet.has(edge.to)) {
      anchorRows.push(rowByHash.get(edge.from) ?? 0);
    }
  }

  const sortedHashes = [...hashes].sort();
  return {
    hashes: sortedHashes,
    minRow: minNumber(rows, 0),
    maxRow: maxNumber(rows, 0),
    anchorRow: minNumber(anchorRows, minNumber(rows, 0)),
    weight: hashes.length + getComponentRefWeight(projection, hashSet),
    key: sortedHashes.join('\0')
  };
}

function getComponentRefWeight(projection: ProjectedGraph, hashes: ReadonlySet<string>): number {
  let weight = 0;
  for (const node of projection.nodes) {
    if (hashes.has(node.hash)) {
      weight += node.refs.length * 0.25;
    }
  }

  return weight;
}

function compareBranchComponents(left: BranchComponent, right: BranchComponent): number {
  return left.anchorRow - right.anchorRow ||
    right.weight - left.weight ||
    left.minRow - right.minRow ||
    left.key.localeCompare(right.key);
}

function assignBranchComponentSides(components: readonly BranchComponent[]): AssignedBranchComponent[] {
  const sideState = new Map<number, { weight: number; intervalsByDistance: Map<number, Array<readonly [number, number]>> }>([
    [SIDE_LEFT, { weight: 0, intervalsByDistance: new Map() }],
    [SIDE_RIGHT, { weight: 0, intervalsByDistance: new Map() }]
  ]);
  const assigned: AssignedBranchComponent[] = [];

  for (const component of components) {
    const leftWeight = sideState.get(SIDE_LEFT)?.weight ?? 0;
    const rightWeight = sideState.get(SIDE_RIGHT)?.weight ?? 0;
    const side = leftWeight <= rightWeight ? SIDE_LEFT : SIDE_RIGHT;
    const distance = reserveComponentDistance(component, sideState.get(side)?.intervalsByDistance ?? new Map());
    const state = sideState.get(side);
    if (state) {
      state.weight += component.weight;
    }
    assigned.push({
      ...component,
      side,
      distance
    });
  }

  return assigned;
}

function reserveComponentDistance(
  component: BranchComponent,
  intervalsByDistance: Map<number, Array<readonly [number, number]>>
): number {
  let distance = 1;
  while (hasOverlappingInterval(intervalsByDistance.get(distance) ?? [], component.minRow, component.maxRow)) {
    distance += 1;
  }

  const intervals = intervalsByDistance.get(distance) ?? [];
  intervals.push([component.minRow, component.maxRow]);
  intervalsByDistance.set(distance, intervals);
  return distance;
}

function hasOverlappingInterval(
  intervals: readonly (readonly [number, number])[],
  minRow: number,
  maxRow: number
): boolean {
  return intervals.some(([existingMinRow, existingMaxRow]) =>
    minRow <= existingMaxRow && maxRow >= existingMinRow
  );
}

function getLaneSpacing(projection: ProjectedGraph): number {
  let spacing = 220;
  for (const node of projection.nodes) {
    spacing = Math.max(spacing, estimateRevisionGraphNodeWidth(node) + DEFAULT_NODE_SPACING);
  }

  return spacing;
}

function minNumber(values: readonly number[], fallback: number): number {
  let min = Infinity;
  for (const value of values) {
    min = Math.min(min, value);
  }

  return Number.isFinite(min) ? min : fallback;
}

function maxNumber(values: readonly number[], fallback: number): number {
  let max = -Infinity;
  for (const value of values) {
    max = Math.max(max, value);
  }

  return Number.isFinite(max) ? max : fallback;
}

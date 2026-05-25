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

  applyVersionFamilyContinuityLanes(projection, rowByHash, laneByHash, mainlineHashes);
  applyLinearPathContinuityLanes(projection, rowByHash, laneByHash, mainlineHashes);
  applyStructuralBarycenterLanes(projection, laneByHash, mainlineHashes);
  applyLayerBarycenterOrdering(projection, rowByHash, laneByHash, mainlineHashes);

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
  const mainlineHashes = new Set(mainlinePath);

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

  enforceTopologicalRowOrder(rawRowByHash, projection.edges);
  pullLateralComponentsTowardVisibleForks(rawRowByHash, projection, mainlineHashes);
  pullIsolatedRefsTowardVisibleParents(rawRowByHash, projection, mainlineHashes);

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

function enforceTopologicalRowOrder(
  rowByHash: Map<string, number>,
  edges: readonly ProjectedGraphEdge[]
): void {
  for (let iteration = 0; iteration < rowByHash.size; iteration += 1) {
    let changed = false;
    for (const edge of edges) {
      const childRow = rowByHash.get(edge.from);
      const parentRow = rowByHash.get(edge.to);
      if (childRow === undefined || parentRow === undefined || parentRow > childRow) {
        continue;
      }

      rowByHash.set(edge.to, childRow + 1);
      changed = true;
    }

    if (!changed) {
      return;
    }
  }
}

function pullLateralComponentsTowardVisibleForks(
  rowByHash: Map<string, number>,
  projection: ProjectedGraph,
  mainlineHashes: ReadonlySet<string>
): void {
  const nonMainlineHashes = new Set(
    projection.nodes
      .map((node) => node.hash)
      .filter((hash) => !mainlineHashes.has(hash))
  );
  const adjacency = buildNonMainlineAdjacency(projection, nonMainlineHashes);
  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  const visited = new Set<string>();

  for (const hash of nonMainlineHashes) {
    if (visited.has(hash)) {
      continue;
    }

    const component = collectRelatedComponent(hash, adjacency, visited);
    const hasVisibleRef = component.some((componentHash) =>
      (nodeByHash.get(componentHash)?.refs.length ?? 0) > 0
    );
    if (component.length < 2 || !hasVisibleRef) {
      continue;
    }

    const safeShift = getSafeComponentRowShift(new Set(component), rowByHash, projection.edges);
    if (safeShift <= 0) {
      continue;
    }

    for (const componentHash of component) {
      const row = rowByHash.get(componentHash);
      if (row !== undefined) {
        rowByHash.set(componentHash, row + safeShift);
      }
    }
  }
}

function getSafeComponentRowShift(
  componentHashes: ReadonlySet<string>,
  rowByHash: ReadonlyMap<string, number>,
  edges: readonly ProjectedGraphEdge[]
): number {
  let safeShift = Number.POSITIVE_INFINITY;

  for (const edge of edges) {
    if (!componentHashes.has(edge.from) || componentHashes.has(edge.to)) {
      continue;
    }

    const childRow = rowByHash.get(edge.from);
    const parentRow = rowByHash.get(edge.to);
    if (childRow === undefined || parentRow === undefined) {
      continue;
    }

    safeShift = Math.min(safeShift, parentRow - childRow - 1);
  }

  return Number.isFinite(safeShift) ? safeShift : 0;
}

function pullIsolatedRefsTowardVisibleParents(
  rowByHash: Map<string, number>,
  projection: ProjectedGraph,
  mainlineHashes: ReadonlySet<string>
): void {
  const parentEdgesByHash = buildChildEdgesByHash(projection);
  const childCountByHash = new Map<string, number>();

  for (const edge of projection.edges) {
    childCountByHash.set(edge.to, (childCountByHash.get(edge.to) ?? 0) + 1);
  }

  for (const node of projection.nodes) {
    const currentRow = rowByHash.get(node.hash);
    if (
      currentRow === undefined ||
      node.refs.length === 0 ||
      node.isBoundary ||
      mainlineHashes.has(node.hash) ||
      (childCountByHash.get(node.hash) ?? 0) > 0
    ) {
      continue;
    }

    const parentRows = (parentEdgesByHash.get(node.hash) ?? [])
      .map((edge) => rowByHash.get(edge.to))
      .filter((row): row is number => row !== undefined);
    if (parentRows.length === 0) {
      continue;
    }

    const closestAllowedRow = Math.min(...parentRows) - 1;
    if (closestAllowedRow > currentRow) {
      rowByHash.set(node.hash, closestAllowedRow);
    }
  }
}

function applyVersionFamilyContinuityLanes(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  laneByHash: Map<string, number>,
  mainlineHashes: ReadonlySet<string>
): void {
  const familyByHash = buildVersionFamilyByHash(projection.nodes);
  const relatedByHash = new Map<string, string[]>();

  for (const edge of projection.edges) {
    const fromFamily = familyByHash.get(edge.from);
    const toFamily = familyByHash.get(edge.to);
    if (!fromFamily || fromFamily !== toFamily) {
      continue;
    }

    appendRelatedHash(relatedByHash, edge.from, edge.to);
    appendRelatedHash(relatedByHash, edge.to, edge.from);
  }

  const visited = new Set<string>();
  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  for (const hash of familyByHash.keys()) {
    if (visited.has(hash)) {
      continue;
    }

    const component = collectRelatedComponent(hash, relatedByHash, visited);
    if (component.length < 2) {
      continue;
    }

    const anchorLane = chooseVersionFamilyAnchorLane(component, nodeByHash, rowByHash, laneByHash, mainlineHashes);
    if (anchorLane === undefined) {
      continue;
    }

    for (const componentHash of component) {
      if (!mainlineHashes.has(componentHash)) {
        laneByHash.set(componentHash, anchorLane);
      }
    }
  }
}

function buildVersionFamilyByHash(nodes: readonly ProjectedGraphNode[]): Map<string, string> {
  const familyByHash = new Map<string, string>();
  for (const node of nodes) {
    const family = getNodeVersionFamily(node);
    if (family) {
      familyByHash.set(node.hash, family);
    }
  }

  return familyByHash;
}

function getNodeVersionFamily(node: ProjectedGraphNode): string | undefined {
  const candidates = node.refs
    .map((ref) => ({ family: getRefVersionFamily(ref.name), score: getVersionFamilyRefScore(ref.kind) }))
    .filter((candidate): candidate is { readonly family: string; readonly score: number } =>
      candidate.family !== undefined
    )
    .sort((left, right) => right.score - left.score || left.family.localeCompare(right.family));
  return candidates[0]?.family;
}

function getRefVersionFamily(refName: string): string | undefined {
  const normalizedName = refName.toLowerCase().replace(/^origin\//, '');
  const match = normalizedName.match(/^v?(\d+)\.(\d+)(?:\.|$)/);
  return match ? `${match[1]}.${match[2]}` : undefined;
}

function getVersionFamilyRefScore(kind: ProjectedGraphNode['refs'][number]['kind']): number {
  switch (kind) {
    case 'head':
    case 'branch':
    case 'remote':
      return 3;
    case 'tag':
      return 2;
    case 'stash':
      return 1;
  }
}

function appendRelatedHash(
  relatedByHash: Map<string, string[]>,
  hash: string,
  relatedHash: string
): void {
  const related = relatedByHash.get(hash) ?? [];
  related.push(relatedHash);
  relatedByHash.set(hash, related);
}

function collectRelatedComponent(
  startHash: string,
  relatedByHash: ReadonlyMap<string, readonly string[]>,
  visited: Set<string>
): string[] {
  const queue = [startHash];
  const component: string[] = [];
  visited.add(startHash);

  for (let index = 0; index < queue.length; index += 1) {
    const hash = queue[index];
    component.push(hash);
    for (const relatedHash of relatedByHash.get(hash) ?? []) {
      if (visited.has(relatedHash)) {
        continue;
      }

      visited.add(relatedHash);
      queue.push(relatedHash);
    }
  }

  return component;
}

function chooseVersionFamilyAnchorLane(
  hashes: readonly string[],
  nodeByHash: ReadonlyMap<string, ProjectedGraphNode>,
  rowByHash: ReadonlyMap<string, number>,
  laneByHash: ReadonlyMap<string, number>,
  mainlineHashes: ReadonlySet<string>
): number | undefined {
  const candidates = hashes
    .map((hash) => ({
      hash,
      lane: laneByHash.get(hash),
      node: nodeByHash.get(hash),
      row: rowByHash.get(hash) ?? Number.MAX_SAFE_INTEGER,
      isMainline: mainlineHashes.has(hash)
    }))
    .filter((candidate): candidate is {
      readonly hash: string;
      readonly lane: number;
      readonly node: ProjectedGraphNode;
      readonly row: number;
      readonly isMainline: boolean;
    } => candidate.lane !== undefined && candidate.node !== undefined);

  return candidates
    .sort((left, right) =>
      Number(right.isMainline) - Number(left.isMainline) ||
      getRefPriorityScore(right.node) - getRefPriorityScore(left.node) ||
      left.row - right.row ||
      left.hash.localeCompare(right.hash)
    )[0]?.lane;
}

function applyLinearPathContinuityLanes(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  laneByHash: Map<string, number>,
  mainlineHashes: ReadonlySet<string>
): void {
  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  const parentCountByHash = new Map<string, number>();
  const childCountByHash = new Map<string, number>();

  for (const edge of projection.edges) {
    parentCountByHash.set(edge.from, (parentCountByHash.get(edge.from) ?? 0) + 1);
    childCountByHash.set(edge.to, (childCountByHash.get(edge.to) ?? 0) + 1);
  }

  const relatedByHash = new Map<string, string[]>();
  for (const edge of projection.edges) {
    const child = nodeByHash.get(edge.from);
    const parent = nodeByHash.get(edge.to);
    if (!child || !parent || child.isBoundary || parent.isBoundary) {
      continue;
    }

    if (mainlineHashes.has(edge.from) || mainlineHashes.has(edge.to)) {
      continue;
    }

    if ((parentCountByHash.get(edge.from) ?? 0) !== 1 || (childCountByHash.get(edge.to) ?? 0) !== 1) {
      continue;
    }

    appendRelatedHash(relatedByHash, edge.from, edge.to);
    appendRelatedHash(relatedByHash, edge.to, edge.from);
  }

  const visited = new Set<string>();
  for (const hash of relatedByHash.keys()) {
    if (visited.has(hash)) {
      continue;
    }

    const component = collectRelatedComponent(hash, relatedByHash, visited);
    if (component.length < 2) {
      continue;
    }

    const anchorLane = chooseLinearPathAnchorLane(component, nodeByHash, rowByHash, laneByHash);
    if (anchorLane === undefined) {
      continue;
    }

    for (const componentHash of component) {
      laneByHash.set(componentHash, anchorLane);
    }
  }
}

function chooseLinearPathAnchorLane(
  hashes: readonly string[],
  nodeByHash: ReadonlyMap<string, ProjectedGraphNode>,
  rowByHash: ReadonlyMap<string, number>,
  laneByHash: ReadonlyMap<string, number>
): number | undefined {
  const laneCounts = new Map<number, number>();
  for (const hash of hashes) {
    const lane = laneByHash.get(hash);
    if (lane !== undefined) {
      laneCounts.set(lane, (laneCounts.get(lane) ?? 0) + 1);
    }
  }

  if (laneCounts.size === 0) {
    return undefined;
  }

  const strongestLaneCount = maxNumber([...laneCounts.values()], 0);
  const strongestLanes = [...laneCounts.entries()]
    .filter(([, count]) => count === strongestLaneCount)
    .map(([lane]) => lane);
  if (strongestLanes.length === 1) {
    return strongestLanes[0];
  }

  return hashes
    .map((hash) => ({
      hash,
      lane: laneByHash.get(hash),
      node: nodeByHash.get(hash),
      row: rowByHash.get(hash) ?? Number.MAX_SAFE_INTEGER
    }))
    .filter((candidate): candidate is {
      readonly hash: string;
      readonly lane: number;
      readonly node: ProjectedGraphNode;
      readonly row: number;
    } =>
      candidate.lane !== undefined &&
      candidate.node !== undefined &&
      strongestLanes.includes(candidate.lane)
    )
    .sort((left, right) =>
      getRefPriorityScore(right.node) - getRefPriorityScore(left.node) ||
      left.row - right.row ||
      left.hash.localeCompare(right.hash)
    )[0]?.lane;
}

function applyLayerBarycenterOrdering(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  laneByHash: Map<string, number>,
  mainlineHashes: ReadonlySet<string>
): void {
  const rows = new Map<number, ProjectedGraphNode[]>();
  for (const node of projection.nodes) {
    const row = rowByHash.get(node.hash);
    if (row === undefined || mainlineHashes.has(node.hash) || node.refs.length > 0 || node.isBoundary) {
      continue;
    }

    const nodes = rows.get(row) ?? [];
    nodes.push(node);
    rows.set(row, nodes);
  }

  const neighborLanesByHash = buildNeighborLanesByHash(projection, laneByHash);
  for (const nodes of rows.values()) {
    const candidates = nodes.filter((node) =>
      laneByHash.has(node.hash) &&
      (neighborLanesByHash.get(node.hash)?.length ?? 0) > 0
    );
    const laneSlots = uniqueNumbers(
      candidates
        .map((node) => laneByHash.get(node.hash))
        .filter((lane): lane is number => lane !== undefined)
    ).sort((left, right) => left - right);
    if (candidates.length < 2 || laneSlots.length !== candidates.length) {
      continue;
    }

    const orderedCandidates = [...candidates].sort((left, right) =>
      getNodeBarycenter(left.hash, neighborLanesByHash, laneByHash) -
      getNodeBarycenter(right.hash, neighborLanesByHash, laneByHash) ||
      (laneByHash.get(left.hash) ?? 0) - (laneByHash.get(right.hash) ?? 0) ||
      left.hash.localeCompare(right.hash)
    );

    for (const [index, node] of orderedCandidates.entries()) {
      laneByHash.set(node.hash, laneSlots[index] ?? (laneByHash.get(node.hash) ?? 0));
    }
  }
}

function buildNeighborLanesByHash(
  projection: ProjectedGraph,
  laneByHash: ReadonlyMap<string, number>
): Map<string, number[]> {
  const neighborLanesByHash = new Map<string, number[]>();
  for (const edge of projection.edges) {
    appendNeighborLane(neighborLanesByHash, edge.from, laneByHash.get(edge.to));
    appendNeighborLane(neighborLanesByHash, edge.to, laneByHash.get(edge.from));
  }

  return neighborLanesByHash;
}

function appendNeighborLane(
  neighborLanesByHash: Map<string, number[]>,
  hash: string,
  lane: number | undefined
): void {
  if (lane === undefined) {
    return;
  }

  const lanes = neighborLanesByHash.get(hash) ?? [];
  lanes.push(lane);
  neighborLanesByHash.set(hash, lanes);
}

function getNodeBarycenter(
  hash: string,
  neighborLanesByHash: ReadonlyMap<string, readonly number[]>,
  laneByHash: ReadonlyMap<string, number>
): number {
  const neighborLanes = neighborLanesByHash.get(hash);
  return neighborLanes && neighborLanes.length > 0
    ? medianNumber(neighborLanes)
    : (laneByHash.get(hash) ?? 0);
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

function applyStructuralBarycenterLanes(
  projection: ProjectedGraph,
  laneByHash: Map<string, number>,
  mainlineHashes: ReadonlySet<string>
): void {
  const structuralHashes = new Set(
    projection.nodes
      .filter((node) => node.refs.length === 0 && !node.isBoundary && !mainlineHashes.has(node.hash))
      .map((node) => node.hash)
  );
  if (structuralHashes.size === 0) {
    return;
  }

  const neighborLanesByHash = new Map<string, number[]>();
  for (const edge of projection.edges) {
    if (structuralHashes.has(edge.from)) {
      const neighborLane = laneByHash.get(edge.to);
      if (neighborLane !== undefined) {
        const lanes = neighborLanesByHash.get(edge.from) ?? [];
        lanes.push(neighborLane);
        neighborLanesByHash.set(edge.from, lanes);
      }
    }

    if (structuralHashes.has(edge.to)) {
      const neighborLane = laneByHash.get(edge.from);
      if (neighborLane !== undefined) {
        const lanes = neighborLanesByHash.get(edge.to) ?? [];
        lanes.push(neighborLane);
        neighborLanesByHash.set(edge.to, lanes);
      }
    }
  }

  for (const hash of structuralHashes) {
    const neighborLanes = uniqueNumbers(neighborLanesByHash.get(hash) ?? []);
    if (neighborLanes.length < 2) {
      continue;
    }

    laneByHash.set(hash, medianNumber(neighborLanes));
  }
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
  const nodeByHash = new Map(projection.nodes.map((node) => [node.hash, node] as const));
  const mainlineAnchorRowsByHash = buildMainlineAnchorRowsByHash(
    projection,
    rowByHash,
    mainlineHashes,
    nonMainlineHashes
  );
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

    components.push(buildBranchComponent(rowByHash, nodeByHash, mainlineAnchorRowsByHash, hashes));
  }

  return components.sort(compareBranchComponents);
}

function buildMainlineAnchorRowsByHash(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>,
  mainlineHashes: ReadonlySet<string>,
  nonMainlineHashes: ReadonlySet<string>
): Map<string, number[]> {
  const anchorRowsByHash = new Map<string, number[]>();
  for (const edge of projection.edges) {
    if (nonMainlineHashes.has(edge.from) && mainlineHashes.has(edge.to)) {
      const anchorRows = anchorRowsByHash.get(edge.from) ?? [];
      anchorRows.push(rowByHash.get(edge.to) ?? 0);
      anchorRowsByHash.set(edge.from, anchorRows);
    } else if (mainlineHashes.has(edge.from) && nonMainlineHashes.has(edge.to)) {
      const anchorRows = anchorRowsByHash.get(edge.to) ?? [];
      anchorRows.push(rowByHash.get(edge.from) ?? 0);
      anchorRowsByHash.set(edge.to, anchorRows);
    }
  }

  return anchorRowsByHash;
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
  rowByHash: ReadonlyMap<string, number>,
  nodeByHash: ReadonlyMap<string, ProjectedGraphNode>,
  mainlineAnchorRowsByHash: ReadonlyMap<string, readonly number[]>,
  hashes: readonly string[]
): BranchComponent {
  const rows: number[] = [];
  const anchorRows: number[] = [];
  let refWeight = 0;
  for (const hash of hashes) {
    rows.push(rowByHash.get(hash) ?? 0);
    refWeight += (nodeByHash.get(hash)?.refs.length ?? 0) * 0.25;
    for (const anchorRow of mainlineAnchorRowsByHash.get(hash) ?? []) {
      anchorRows.push(anchorRow);
    }
  }

  const sortedHashes = [...hashes].sort();
  return {
    hashes: sortedHashes,
    minRow: minNumber(rows, 0),
    maxRow: maxNumber(rows, 0),
    anchorRow: minNumber(anchorRows, minNumber(rows, 0)),
    weight: hashes.length + refWeight,
    key: sortedHashes.join('\0')
  };
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

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function medianNumber(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) {
    return ordered[middle] ?? 0;
  }

  return ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
}

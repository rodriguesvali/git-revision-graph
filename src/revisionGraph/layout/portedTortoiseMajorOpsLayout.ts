import { ProjectedGraph, ProjectedGraphEdge } from '../model/commitGraphTypes';
import { estimateRevisionGraphNodeWidth } from './nodeSizing';

const DEFAULT_LAYER_SPACING = 96;
const MIN_LANE_SPACING = 76;
const SWEEP_ITERATIONS = 8;

export interface PortedTortoiseMajorOpsLayoutPosition {
  readonly x: number;
  readonly y: number;
}

export function calculatePortedTortoiseMajorOpsLayout(
  projection: ProjectedGraph
): Map<string, PortedTortoiseMajorOpsLayoutPosition> {
  const rowByHash = buildTopologicalRows(projection);
  const rowHashes = buildRowHashes(projection, rowByHash);
  orderRowsByBarycenter(rowHashes, projection.edges);
  const maxRowWidth = rowHashes.reduce((max, hashes) => Math.max(max, hashes.length), 1);
  const laneSpacing = getLaneSpacing(projection);
  const positions = new Map<string, PortedTortoiseMajorOpsLayoutPosition>();

  for (const [row, hashes] of rowHashes.entries()) {
    const rowOffset = (maxRowWidth - hashes.length) / 2;
    for (const [index, hash] of hashes.entries()) {
      positions.set(hash, {
        x: (rowOffset + index) * laneSpacing,
        y: row * DEFAULT_LAYER_SPACING
      });
    }
  }

  return positions;
}

function buildTopologicalRows(projection: ProjectedGraph): Map<string, number> {
  const rowByHash = new Map<string, number>(projection.nodes.map((node) => [node.hash, 0] as const));

  for (let iteration = 0; iteration < projection.nodes.length; iteration += 1) {
    let changed = false;

    for (const edge of projection.edges) {
      const childRow = rowByHash.get(edge.from);
      const parentRow = rowByHash.get(edge.to);
      if (childRow === undefined || parentRow === undefined || parentRow > childRow) {
        continue;
      }

      rowByHash.set(edge.to, childRow + 1);
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  const compactRows = [...new Set(rowByHash.values())].sort((left, right) => left - right);
  const compactRowByRawRow = new Map(compactRows.map((row, index) => [row, index] as const));
  return new Map(
    [...rowByHash.entries()].map(([hash, row]) => [hash, compactRowByRawRow.get(row) ?? row] as const)
  );
}

function buildRowHashes(
  projection: ProjectedGraph,
  rowByHash: ReadonlyMap<string, number>
): string[][] {
  const rows: string[][] = [];

  for (const node of projection.nodes) {
    const row = rowByHash.get(node.hash) ?? 0;
    rows[row] ??= [];
    rows[row].push(node.hash);
  }

  return rows;
}

function orderRowsByBarycenter(
  rowHashes: string[][],
  edges: readonly ProjectedGraphEdge[]
): void {
  if (rowHashes.length < 2) {
    return;
  }

  for (let iteration = 0; iteration < SWEEP_ITERATIONS; iteration += 1) {
    for (let row = 1; row < rowHashes.length; row += 1) {
      sortRowByNeighborBarycenter(rowHashes, edges, row, row - 1);
    }

    for (let row = rowHashes.length - 2; row >= 0; row -= 1) {
      sortRowByNeighborBarycenter(rowHashes, edges, row, row + 1);
    }
  }
}

function sortRowByNeighborBarycenter(
  rowHashes: string[][],
  edges: readonly ProjectedGraphEdge[],
  row: number,
  neighborRow: number
): void {
  const hashes = rowHashes[row];
  const neighborOrder = new Map(rowHashes[neighborRow]?.map((hash, index) => [hash, index] as const) ?? []);
  const originalOrder = new Map(hashes.map((hash, index) => [hash, index] as const));

  hashes.sort((left, right) => {
    const leftScore = getNeighborBarycenter(left, edges, neighborOrder);
    const rightScore = getNeighborBarycenter(right, edges, neighborOrder);
    const leftResolved = leftScore ?? originalOrder.get(left) ?? 0;
    const rightResolved = rightScore ?? originalOrder.get(right) ?? 0;

    return leftResolved - rightResolved || (originalOrder.get(left) ?? 0) - (originalOrder.get(right) ?? 0);
  });
}

function getNeighborBarycenter(
  hash: string,
  edges: readonly ProjectedGraphEdge[],
  neighborOrder: ReadonlyMap<string, number>
): number | undefined {
  let total = 0;
  let count = 0;

  for (const edge of edges) {
    const neighborHash = edge.from === hash ? edge.to : edge.to === hash ? edge.from : undefined;
    if (!neighborHash) {
      continue;
    }

    const order = neighborOrder.get(neighborHash);
    if (order === undefined) {
      continue;
    }

    total += order;
    count += 1;
  }

  return count > 0 ? total / count : undefined;
}

function getLaneSpacing(projection: ProjectedGraph): number {
  const widestNode = projection.nodes.reduce(
    (max, node) => Math.max(max, estimateRevisionGraphNodeWidth(node)),
    0
  );

  return Math.max(MIN_LANE_SPACING, Math.ceil(widestNode / 10) * 10 + 36);
}

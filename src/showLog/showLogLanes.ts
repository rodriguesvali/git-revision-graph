import type { RevisionLogEntry } from '../revisionGraphTypes';

export interface ShowLogLaneRow {
  readonly laneCount: number;
  readonly nodeLane: number;
  readonly continuingLanes: readonly number[];
  readonly secondaryParentLanes: readonly number[];
  readonly mergeStartLanes: readonly number[];
  readonly colorByLane: Readonly<Record<number, number>>;
}

const DEFAULT_COLOR_INDEX = 0;

export function buildShowLogLaneRows(entries: readonly RevisionLogEntry[]): Map<string, ShowLogLaneRow> {
  const rows = new Map<string, ShowLogLaneRow>();
  const activeLanes: Array<string | undefined> = [];
  const laneColors = new Map<number, number>();
  let nextColorIndex = 0;

  for (const entry of entries) {
    let nodeLane = activeLanes.indexOf(entry.hash);
    if (nodeLane < 0) {
      nodeLane = firstEmptyLane(activeLanes);
      if (nodeLane === -1) {
        nodeLane = activeLanes.length;
      }
    }

    if (!laneColors.has(nodeLane)) {
      laneColors.set(nodeLane, nextColorIndex++);
    }

    const nodeColorIndex = laneColors.get(nodeLane) ?? DEFAULT_COLOR_INDEX;
    const activeBefore = listActiveLanes(activeLanes);
    const nextActive = [...activeLanes];
    nextActive[nodeLane] = undefined;

    if (entry.parentHashes.length > 0) {
      nextActive[nodeLane] = entry.parentHashes[0];
      laneColors.set(nodeLane, nodeColorIndex);
    } else {
      laneColors.delete(nodeLane);
    }

    const secondaryParentLanes: number[] = [];
    for (const parentHash of entry.parentHashes.slice(1)) {
      let parentLane = nextActive.indexOf(parentHash);
      if (parentLane < 0) {
        parentLane = firstEmptyLane(nextActive);
        if (parentLane === -1) {
          parentLane = nextActive.length;
        }
        nextActive[parentLane] = parentHash;
      }

      if (!laneColors.has(parentLane)) {
        laneColors.set(parentLane, nextColorIndex++);
      }
      secondaryParentLanes.push(parentLane);
    }

    const activeAfter = listActiveLanes(nextActive);
    const continuingLanes = [...new Set([...activeBefore, ...activeAfter, nodeLane])].sort((left, right) => left - right);
    const mergeStartLanes = secondaryParentLanes.filter((lane) => !activeBefore.includes(lane));
    const laneCount = Math.max(nodeLane, ...continuingLanes, ...secondaryParentLanes, 0) + 1;
    const colorByLane = buildColorByLaneMap(laneColors, continuingLanes, secondaryParentLanes, nodeLane, nodeColorIndex);

    rows.set(entry.hash, {
      laneCount,
      nodeLane,
      continuingLanes,
      secondaryParentLanes,
      mergeStartLanes,
      colorByLane
    });

    activeLanes.splice(0, activeLanes.length, ...nextActive);
  }

  return rows;
}

function listActiveLanes(lanes: readonly (string | undefined)[]): number[] {
  return lanes
    .map((value, index) => (value ? index : -1))
    .filter((index) => index >= 0);
}

function firstEmptyLane(lanes: readonly (string | undefined)[]): number {
  return lanes.findIndex((value) => !value);
}

function buildColorByLaneMap(
  laneColors: ReadonlyMap<number, number>,
  continuingLanes: readonly number[],
  secondaryParentLanes: readonly number[],
  nodeLane: number,
  nodeColorIndex: number
): Readonly<Record<number, number>> {
  const indexes = [...new Set([...continuingLanes, ...secondaryParentLanes, nodeLane])];
  const colorByLane: Record<number, number> = {};
  for (const lane of indexes) {
    colorByLane[lane] = laneColors.get(lane) ?? (lane === nodeLane ? nodeColorIndex : DEFAULT_COLOR_INDEX);
  }

  return colorByLane;
}

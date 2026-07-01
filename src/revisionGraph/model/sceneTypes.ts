import type { RevisionGraphRef } from './commitGraphTypes';

export interface RevisionGraphNode {
  readonly hash: string;
  readonly refs: readonly RevisionGraphRef[];
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly x: number;
  readonly row: number;
  readonly lane: number;
}

export interface RevisionGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly route?: readonly RevisionGraphEdgeRoutePoint[];
}

export interface RevisionGraphEdgeRoutePoint {
  readonly x: number;
  readonly y: number;
}

export interface RevisionGraphScene {
  readonly nodes: readonly RevisionGraphNode[];
  readonly edges: readonly RevisionGraphEdge[];
  readonly laneCount: number;
  readonly rowCount: number;
}

export interface RevisionGraphNodeLayout {
  readonly hash: string;
  readonly lane: number;
  readonly row: number;
  readonly x: number;
  readonly width: number;
  readonly height: number;
  readonly defaultLeft: number;
  readonly defaultTop: number;
}

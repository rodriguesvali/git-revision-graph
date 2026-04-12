import { RevisionGraphProjectionOptions } from '../../../revisionGraphData';
import { RevisionGraphNodeLayout } from '../shared';

export type RevisionGraphReference = {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: string;
  readonly title: string;
};

export type RevisionGraphClientEdge = {
  readonly from: string;
  readonly to: string;
};

export interface RenderRevisionGraphScriptOptions {
  readonly nonce: string;
  readonly references: readonly RevisionGraphReference[];
  readonly currentHeadName: string | undefined;
  readonly currentHeadUpstreamName: string | undefined;
  readonly isWorkspaceDirty: boolean;
  readonly projectionOptions: RevisionGraphProjectionOptions;
  readonly autoArrangeOnInit: boolean;
  readonly mergeBlockedTargets: readonly string[];
  readonly zoomLevels: readonly number[];
  readonly graphNodes: readonly RevisionGraphNodeLayout[];
  readonly graphEdges: readonly RevisionGraphClientEdge[];
  readonly primaryAncestorPathsByHash: Readonly<Record<string, readonly string[]>>;
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
}

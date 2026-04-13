import { RevisionGraphProjectionOptions, RevisionGraphRef, RevisionGraphScene } from './revisionGraphData';
import { RevisionGraphNodeLayout } from './revisionGraph/webview/shared';

export const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';

export type RevisionGraphMessage =
  | { readonly type: 'webview-ready' }
  | { readonly type: 'refresh' }
  | { readonly type: 'open-source-control' }
  | { readonly type: 'choose-repository' }
  | { readonly type: 'set-projection-options'; readonly options: Partial<RevisionGraphProjectionOptions> }
  | { readonly type: 'compare-selected'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'show-log'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'open-unified-diff'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'compare-with-worktree'; readonly refName: string }
  | { readonly type: 'checkout'; readonly refName: string; readonly refKind: string }
  | { readonly type: 'create-branch'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'sync-current-head' }
  | { readonly type: 'delete'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'merge'; readonly refName: string };

export interface RevisionGraphViewReference {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: RevisionGraphRef['kind'];
  readonly title: string;
}

export interface RevisionGraphViewState {
  readonly viewMode: 'ready' | 'empty';
  readonly hasRepositories: boolean;
  readonly repositoryPath: string | undefined;
  readonly currentHeadName: string | undefined;
  readonly currentHeadUpstreamName: string | undefined;
  readonly isWorkspaceDirty: boolean;
  readonly projectionOptions: RevisionGraphProjectionOptions;
  readonly mergeBlockedTargets: readonly string[];
  readonly primaryAncestorPathsByHash: Readonly<Record<string, readonly string[]>>;
  readonly autoArrangeOnInit: boolean;
  readonly scene: RevisionGraphScene;
  readonly nodeLayouts: readonly RevisionGraphNodeLayout[];
  readonly references: readonly RevisionGraphViewReference[];
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
  readonly emptyMessage: string | undefined;
  readonly loading: boolean;
  readonly loadingLabel: string | undefined;
  readonly errorMessage: string | undefined;
}

export interface RevisionGraphViewMetadataPatch {
  readonly preserveSelection: boolean;
  readonly preserveViewport: boolean;
  readonly currentHeadName: string | undefined;
  readonly currentHeadUpstreamName: string | undefined;
  readonly isWorkspaceDirty: boolean;
  readonly mergeBlockedTargets: readonly string[];
  readonly autoArrangeOnInit: boolean;
  readonly scene: RevisionGraphScene;
  readonly nodeLayouts: readonly RevisionGraphNodeLayout[];
  readonly references: readonly RevisionGraphViewReference[];
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
}

export type RevisionGraphViewHostMessage =
  | { readonly type: 'init-state'; readonly state: RevisionGraphViewState }
  | { readonly type: 'update-state'; readonly state: RevisionGraphViewState }
  | { readonly type: 'patch-metadata'; readonly patch: RevisionGraphViewMetadataPatch }
  | { readonly type: 'set-loading'; readonly label: string }
  | { readonly type: 'set-error'; readonly message: string };

export function createDefaultRevisionGraphProjectionOptions(): RevisionGraphProjectionOptions {
  return {
    refScope: 'all',
    showTags: true,
    showBranchingsAndMerges: false
  };
}

export interface RevisionLogEntry {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly date: string;
  readonly subject: string;
}

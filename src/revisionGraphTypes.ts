import { RevisionGraphProjectionOptions, RevisionGraphRef, RevisionGraphScene } from './revisionGraphData';
import { RevisionGraphNodeLayout } from './revisionGraph/webview/shared';

export const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';
export const SHOW_LOG_VIEW_ID = 'gitRefs.showLogView';

export type RevisionLogSource =
  | {
    readonly kind: 'target';
    readonly revision: string;
    readonly label: string;
  }
  | {
    readonly kind: 'range';
    readonly baseRevision: string;
    readonly baseLabel: string;
    readonly compareRevision: string;
    readonly compareLabel: string;
  };

export type RevisionGraphMessage =
  | { readonly type: 'webview-ready' }
  | { readonly type: 'refresh' }
  | { readonly type: 'fetch-current-repository' }
  | { readonly type: 'open-source-control' }
  | { readonly type: 'choose-repository' }
  | { readonly type: 'abort-merge' }
  | { readonly type: 'set-projection-options'; readonly options: Partial<RevisionGraphProjectionOptions> }
  | {
    readonly type: 'compare-selected';
    readonly baseRevision: string;
    readonly baseLabel: string;
    readonly compareRevision: string;
    readonly compareLabel: string;
  }
  | { readonly type: 'show-log'; readonly source: RevisionLogSource }
  | { readonly type: 'open-unified-diff'; readonly baseRevision: string; readonly compareRevision: string }
  | { readonly type: 'compare-with-worktree'; readonly revision: string; readonly label: string }
  | { readonly type: 'copy-commit-hash'; readonly commitHash: string }
  | { readonly type: 'checkout'; readonly refName: string; readonly refKind: string }
  | {
    readonly type: 'create-branch';
    readonly revision: string;
    readonly label: string;
    readonly refKind: RevisionGraphRef['kind'] | 'commit';
  }
  | {
    readonly type: 'create-tag';
    readonly revision: string;
    readonly label: string;
    readonly refKind: RevisionGraphRef['kind'] | 'commit';
  }
  | { readonly type: 'resolve-remote-tag-state'; readonly refName: string }
  | { readonly type: 'push-tag'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'delete-remote-tag'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'publish-branch'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphRef['kind'] }
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
  readonly publishedLocalBranchNames: readonly string[];
  readonly isWorkspaceDirty: boolean;
  readonly hasMergeConflicts: boolean;
  readonly hasConflictedMerge: boolean;
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
  readonly publishedLocalBranchNames: readonly string[];
  readonly isWorkspaceDirty: boolean;
  readonly hasMergeConflicts: boolean;
  readonly hasConflictedMerge: boolean;
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
}

export type RevisionGraphViewHostMessage =
  | { readonly type: 'init-state'; readonly state: RevisionGraphViewState }
  | { readonly type: 'update-state'; readonly state: RevisionGraphViewState }
  | { readonly type: 'patch-metadata'; readonly patch: RevisionGraphViewMetadataPatch }
  | { readonly type: 'set-remote-tag-state'; readonly tagName: string; readonly isPublished: boolean }
  | { readonly type: 'set-loading'; readonly label: string; readonly mode?: 'blocking' | 'subtle' }
  | { readonly type: 'set-error'; readonly message: string };

export function createDefaultRevisionGraphProjectionOptions(): RevisionGraphProjectionOptions {
  return {
    refScope: 'all',
    showTags: true,
    showRemoteBranches: true,
    showStashes: true,
    showCurrentBranchDescendants: false
  };
}

export function normalizeRevisionGraphProjectionOptionsForScope(
  options: RevisionGraphProjectionOptions
): RevisionGraphProjectionOptions {
  return options.refScope === 'current'
    ? options
    : {
        ...options,
        showCurrentBranchDescendants: false
      };
}

export interface RevisionLogEntry {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly message: string;
  readonly parentHashes: readonly string[];
  readonly references: readonly RevisionGraphRef[];
  readonly shortStat:
    | {
      readonly files: number;
      readonly insertions: number;
      readonly deletions: number;
    }
    | undefined;
}

import type {
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './revisionGraph/model/commitGraphTypes';
import type {
  RevisionGraphNodeLayout,
  RevisionGraphScene
} from './revisionGraph/model/sceneTypes';
import type { RevisionLogSource } from './revisionGraph/revisionLogTypes';

export type { RevisionLogEntry, RevisionLogSource } from './revisionGraph/revisionLogTypes';

export const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';
export const REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE = 'gitRefs.revisionGraphEditorPanel';
export const SHOW_LOG_VIEW_ID = 'gitRefs.showLogView';

export type RevisionGraphMessage =
  | { readonly type: 'webview-ready' }
  | {
    readonly type: 'load-trace';
    readonly phase: string;
    readonly durationMs: number;
    readonly detail?: string;
    readonly requestId?: number;
  }
  | { readonly type: 'refresh' }
  | { readonly type: 'refresh-with-empty-cache' }
  | { readonly type: 'fetch-current-repository' }
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
  | { readonly type: 'load-commit-short-stat'; readonly commitHash: string }
  | { readonly type: 'open-commit-on-github'; readonly commitHash: string }
  | { readonly type: 'copy-ref-name'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'checkout'; readonly refName: string; readonly refKind: string }
  | {
    readonly type: 'reset-to-commit';
    readonly commitHash: string;
    readonly label: string;
    readonly targetKind: RevisionGraphRef['kind'] | 'commit';
    readonly targetName?: string;
  }
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
  | { readonly type: 'pull-current-head' }
  | { readonly type: 'push-current-head'; readonly mode: 'normal' | 'force-with-lease' | 'force' }
  | { readonly type: 'stash-save' }
  | { readonly type: 'stash-apply'; readonly refName: string }
  | { readonly type: 'stash-pop'; readonly refName: string }
  | { readonly type: 'stash-drop'; readonly refName: string }
  | { readonly type: 'delete'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'merge'; readonly refName: string };

export interface RevisionGraphViewReference {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: RevisionGraphRef['kind'];
  readonly title: string;
  readonly description?: string;
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
  readonly primaryAncestorNextByHash: Readonly<Record<string, string>>;
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

export type RemoteTagPublicationState = 'published' | 'unpublished' | 'unknown';

export interface RevisionGraphCommitShortStat {
  readonly files: number;
  readonly insertions: number;
  readonly deletions: number;
}

export interface RevisionGraphHostTraceContext {
  readonly requestId: number;
  readonly sentAtMs: number;
}

export type RevisionGraphViewHostMessage =
  | { readonly type: 'init-state'; readonly state: RevisionGraphViewState; readonly trace?: RevisionGraphHostTraceContext }
  | { readonly type: 'update-state'; readonly state: RevisionGraphViewState; readonly trace?: RevisionGraphHostTraceContext }
  | { readonly type: 'set-remote-tag-state'; readonly tagName: string; readonly state: RemoteTagPublicationState }
  | { readonly type: 'set-commit-short-stat'; readonly commitHash: string; readonly shortStat: RevisionGraphCommitShortStat | null }
  | { readonly type: 'set-loading'; readonly label: string; readonly mode?: 'blocking' | 'subtle' }
  | { readonly type: 'set-error'; readonly message: string };

export function createDefaultRevisionGraphProjectionOptions(): RevisionGraphProjectionOptions {
  return {
    refScope: 'all',
    showTags: true,
    showRemoteBranches: true,
    showStashes: true,
    showMergeCommits: false,
    showCurrentBranchDescendants: false,
    revisionRange: undefined,
    descendantFocus: undefined
  };
}

export function normalizeRevisionGraphProjectionOptionsForScope(
  options: RevisionGraphProjectionOptions
): RevisionGraphProjectionOptions {
  return {
    ...options,
    showCurrentBranchDescendants: options.refScope === 'current'
  };
}

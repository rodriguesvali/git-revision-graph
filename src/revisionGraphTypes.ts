import type {
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './revisionGraph/model/commitGraphTypes';
import type {
  RevisionGraphNodeLayout,
  RevisionGraphScene
} from './revisionGraph/model/sceneTypes';
import type { FlowGovernanceViewState } from './revisionGraph/flow/flowTypes';

export type { RevisionLogEntry, RevisionLogSource } from './revisionGraph/revisionLogTypes';

export type RevisionGraphMessage = RevisionGraphProtocol.Message;
export type RevisionGraphMergeRefKind = RevisionGraphProtocol.MergeRefKind;
export type RevisionGraphProjectionOptionsUpdate = RevisionGraphProtocol.ProjectionOptionsUpdate;

export const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';
export const REVISION_GRAPH_EDITOR_PANEL_VIEW_TYPE = 'gitRefs.revisionGraphEditorPanel';
export const SHOW_LOG_VIEW_ID = 'gitRefs.showLogView';

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
  readonly flowGovernance?: FlowGovernanceViewState;
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
  | {
    readonly type: 'show-flow-pr-context';
    readonly sourceRefName: string;
    readonly targetRefName: string;
    readonly title: string;
    readonly description: string;
  }
  | {
    readonly type: 'show-flow-branch-form';
    readonly branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
    readonly sourceRefName: string;
  }
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

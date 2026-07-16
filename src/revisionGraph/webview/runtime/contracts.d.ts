/// <reference path="../../protocol.d.ts" />

type RevisionGraphWebviewRefKind = RevisionGraphProtocol.RefKind;
type RevisionGraphWebviewMergeRefKind = RevisionGraphProtocol.MergeRefKind;
type RevisionGraphWebviewTargetKind = RevisionGraphProtocol.TargetKind;
type RevisionGraphWebviewFlowBranchKind = 'release' | 'feature' | 'hotfix' | 'task' | 'bug';

interface RevisionGraphWebviewTarget {
  readonly id?: string;
  readonly hash: string;
  readonly revision: string;
  readonly label: string;
  readonly name: string;
  readonly kind: RevisionGraphWebviewTargetKind;
}

type RevisionGraphWebviewProjectionOptions = RevisionGraphProtocol.ProjectionOptionsUpdate;
type RevisionGraphWebviewFlowGovernanceOptions = RevisionGraphProtocol.FlowGovernanceOptionsUpdate;

interface RevisionGraphWebviewHostReference extends Record<string, unknown> {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: RevisionGraphWebviewRefKind;
}

interface RevisionGraphWebviewHostScene extends Record<string, unknown> {
  readonly nodes: readonly Record<string, unknown>[];
  readonly edges: readonly Record<string, unknown>[];
}

interface RevisionGraphWebviewHostState extends Record<string, unknown> {
  readonly viewMode: 'ready' | 'empty';
  readonly hasRepositories: boolean;
  readonly repositoryPath?: string;
  readonly currentHeadName?: string;
  readonly currentHeadUpstreamName?: string;
  readonly publishedLocalBranchNames: readonly string[];
  readonly isWorkspaceDirty: boolean;
  readonly hasMergeConflicts: boolean;
  readonly hasConflictedMerge: boolean;
  readonly projectionOptions: RevisionGraphWebviewProjectionOptions;
  readonly mergeBlockedTargets: readonly string[];
  readonly primaryAncestorNextByHash: Readonly<Record<string, string>>;
  readonly scene: RevisionGraphWebviewHostScene;
  readonly nodeLayouts: readonly Record<string, unknown>[];
  readonly references: readonly RevisionGraphWebviewHostReference[];
  readonly flowGovernance?: Record<string, unknown>;
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
  readonly emptyMessage?: string;
  readonly loading: boolean;
  readonly loadingLabel?: string;
  readonly errorMessage?: string;
}

type RevisionGraphWebviewMessage = RevisionGraphProtocol.Message;

type RevisionGraphWebviewMessageOf<
  Type extends RevisionGraphWebviewMessage['type']
> = RevisionGraphProtocol.MessageOf<Type>;

type RevisionGraphWebviewHostMessage =
  | { readonly type: 'init-state' | 'update-state'; readonly state: RevisionGraphWebviewHostState; readonly trace?: Record<string, unknown> }
  | { readonly type: 'set-remote-tag-state'; readonly tagName: string; readonly state: string }
  | { readonly type: 'set-commit-short-stat'; readonly commitHash: string; readonly shortStat: Record<string, unknown> | null }
  | { readonly type: 'show-flow-pr-context'; readonly sourceRefName: string; readonly targetRefName: string; readonly title: string; readonly description: string }
  | { readonly type: 'show-flow-branch-form'; readonly branchKind: RevisionGraphWebviewFlowBranchKind; readonly sourceRefName: string }
  | { readonly type: 'set-loading'; readonly label: string; readonly mode?: 'blocking' | 'subtle' }
  | { readonly type: 'set-error'; readonly message: string };

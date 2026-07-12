type RevisionGraphWebviewRefKind = 'head' | 'branch' | 'remote' | 'tag' | 'stash';
type RevisionGraphWebviewTargetKind = RevisionGraphWebviewRefKind | 'commit';

interface RevisionGraphWebviewTarget {
  readonly hash: string;
  readonly revision: string;
  readonly label: string;
  readonly name: string;
  readonly kind: RevisionGraphWebviewTargetKind;
}

interface RevisionGraphWebviewProjectionOptions {
  readonly refScope?: 'all' | 'current' | 'remoteHead' | 'local';
  readonly showTags?: boolean;
  readonly showRemoteBranches?: boolean;
  readonly showStashes?: boolean;
  readonly showMergeCommits?: boolean;
  readonly revisionRange?: {
    readonly baseRevision: string;
    readonly baseLabel: string;
    readonly compareRevision: string;
    readonly compareLabel: string;
  } | null;
  readonly descendantFocus?: {
    readonly anchorRevision: string;
    readonly anchorLabel: string;
  } | null;
}

interface RevisionGraphWebviewFlowGovernanceOptions {
  readonly enabled?: boolean;
}

type RevisionGraphWebviewMessage =
  | { readonly type: 'webview-ready' }
  | { readonly type: 'load-trace'; readonly phase: string; readonly durationMs: number; readonly detail?: string; readonly requestId?: number }
  | { readonly type: 'refresh' }
  | { readonly type: 'refresh-with-empty-cache' }
  | { readonly type: 'fetch-current-repository' }
  | { readonly type: 'choose-repository' }
  | { readonly type: 'abort-merge' }
  | { readonly type: 'set-projection-options'; readonly options: RevisionGraphWebviewProjectionOptions }
  | { readonly type: 'set-flow-governance-options'; readonly options: RevisionGraphWebviewFlowGovernanceOptions }
  | { readonly type: 'start-flow-branch'; readonly branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix'; readonly sourceRefName: string; readonly name: string; readonly description?: string }
  | { readonly type: 'prepare-flow-equalization'; readonly targetRefName: string; readonly originRefName: string; readonly description: string }
  | { readonly type: 'copy-flow-pr-context'; readonly sourceRefName: string; readonly targetRefName: string }
  | { readonly type: 'open-flow-pr-url'; readonly sourceRefName: string; readonly targetRefName: string }
  | { readonly type: 'copy-flow-pr-context-field'; readonly sourceRefName: string; readonly targetRefName: string; readonly field: 'title' | 'description' }
  | { readonly type: 'compare-selected'; readonly baseRevision: string; readonly baseLabel: string; readonly compareRevision: string; readonly compareLabel: string }
  | { readonly type: 'show-log'; readonly source: { readonly kind: 'target'; readonly revision: string; readonly label: string } | { readonly kind: 'range'; readonly baseRevision: string; readonly baseLabel: string; readonly compareRevision: string; readonly compareLabel: string } }
  | { readonly type: 'open-unified-diff'; readonly baseRevision: string; readonly compareRevision: string }
  | { readonly type: 'compare-with-worktree'; readonly revision: string; readonly label: string }
  | { readonly type: 'copy-commit-hash'; readonly commitHash: string }
  | { readonly type: 'load-commit-short-stat'; readonly commitHash: string }
  | { readonly type: 'open-commit-on-github'; readonly commitHash: string }
  | { readonly type: 'copy-ref-name'; readonly refName: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'checkout'; readonly refName: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'reset-to-commit'; readonly commitHash: string; readonly label: string; readonly targetKind: RevisionGraphWebviewTargetKind; readonly targetName?: string }
  | { readonly type: 'sync-current-head' }
  | { readonly type: 'pull-current-head' }
  | { readonly type: 'stash-save' }
  | { readonly type: 'push-current-head'; readonly mode: 'normal' | 'force-with-lease' | 'force' }
  | { readonly type: 'stash-apply'; readonly refName: string }
  | { readonly type: 'stash-pop'; readonly refName: string }
  | { readonly type: 'stash-drop'; readonly refName: string }
  | { readonly type: 'publish-branch'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'push-tag'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'delete-remote-tag'; readonly refName: string; readonly label: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'create-branch'; readonly revision: string; readonly label: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'create-tag'; readonly revision: string; readonly label: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'resolve-remote-tag-state'; readonly refName: string }
  | { readonly type: 'delete'; readonly refName: string; readonly refKind: RevisionGraphWebviewTargetKind }
  | { readonly type: 'merge'; readonly refName: string };

type RevisionGraphWebviewMessageOf<
  Type extends RevisionGraphWebviewMessage['type'],
  Message extends RevisionGraphWebviewMessage = RevisionGraphWebviewMessage
> = Message extends { readonly type: Type } ? Message : never;

type RevisionGraphWebviewHostMessage =
  | { readonly type: 'init-state' | 'update-state'; readonly state: Record<string, unknown>; readonly trace?: Record<string, unknown> }
  | { readonly type: 'set-remote-tag-state'; readonly tagName: string; readonly state: string }
  | { readonly type: 'set-commit-short-stat'; readonly commitHash: string; readonly shortStat: Record<string, unknown> | null }
  | { readonly type: 'show-flow-pr-context'; readonly sourceRefName: string; readonly targetRefName: string; readonly title: string; readonly description: string }
  | { readonly type: 'set-loading'; readonly label: string; readonly mode?: 'blocking' | 'subtle' }
  | { readonly type: 'set-error'; readonly message: string };

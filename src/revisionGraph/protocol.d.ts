declare namespace RevisionGraphProtocol {
  type RefKind = 'head' | 'branch' | 'remote' | 'tag' | 'stash';
  type TargetKind = RefKind | 'commit';
  type CheckoutRefKind = Extract<RefKind, 'head' | 'branch' | 'remote'>;
  type PublishBranchRefKind = Extract<RefKind, 'head' | 'branch'>;
  type DeletableRefKind = Extract<RefKind, 'branch' | 'remote' | 'tag'>;
  type MergeRefKind = Extract<RefKind, 'branch' | 'remote' | 'tag'>;

  interface RevisionRange {
    readonly baseRevision: string;
    readonly baseLabel: string;
    readonly compareRevision: string;
    readonly compareLabel: string;
  }

  interface DescendantFocus {
    readonly anchorRevision: string;
    readonly anchorLabel: string;
  }

  interface ProjectionOptionsUpdate {
    readonly refScope?: 'all' | 'current' | 'remoteHead' | 'local';
    readonly showTags?: boolean;
    readonly showRemoteBranches?: boolean;
    readonly showStashes?: boolean;
    readonly showMergeCommits?: boolean;
    readonly showCurrentBranchDescendants?: boolean;
    readonly revisionRange?: RevisionRange | null;
    readonly descendantFocus?: DescendantFocus | null;
  }

  interface FlowGovernanceOptionsUpdate {
    readonly enabled?: boolean;
  }

  type RevisionLogSource =
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

  type Message =
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
    | { readonly type: 'set-projection-options'; readonly options: ProjectionOptionsUpdate }
    | { readonly type: 'set-flow-governance-options'; readonly options: FlowGovernanceOptionsUpdate }
    | {
      readonly type: 'start-flow-branch';
      readonly phase: 'prepare';
      readonly branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
      readonly sourceRefName: string;
    }
    | {
      readonly type: 'start-flow-branch';
      readonly branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
      readonly sourceRefName: string;
      readonly name: string;
      readonly description: string;
    }
    | {
      readonly type: 'prepare-flow-equalization';
      readonly targetRefName: string;
      readonly originRefName: string;
      readonly description: string;
    }
    | { readonly type: 'copy-flow-pr-context'; readonly sourceRefName: string; readonly targetRefName: string }
    | {
      readonly type: 'copy-flow-pr-context-field';
      readonly sourceRefName: string;
      readonly targetRefName: string;
      readonly field: 'title' | 'description';
    }
    | { readonly type: 'open-flow-pr-url'; readonly sourceRefName: string; readonly targetRefName: string }
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
    | { readonly type: 'open-commit-on-remote'; readonly commitHash: string }
    | { readonly type: 'copy-ref-name'; readonly refName: string; readonly refKind: RefKind }
    | { readonly type: 'checkout'; readonly refName: string; readonly refKind: CheckoutRefKind }
    | {
      readonly type: 'reset-to-commit';
      readonly commitHash: string;
      readonly label: string;
      readonly targetKind: TargetKind;
      readonly targetName?: string;
    }
    | {
      readonly type: 'create-branch';
      readonly revision: string;
      readonly label: string;
      readonly refKind: TargetKind;
    }
    | {
      readonly type: 'create-tag';
      readonly revision: string;
      readonly label: string;
      readonly refKind: TargetKind;
    }
    | { readonly type: 'resolve-remote-tag-state'; readonly refName: string }
    | { readonly type: 'push-tag'; readonly refName: string; readonly label: string; readonly refKind: 'tag' }
    | { readonly type: 'delete-remote-tag'; readonly refName: string; readonly label: string; readonly refKind: 'tag' }
    | {
      readonly type: 'publish-branch';
      readonly refName: string;
      readonly label: string;
      readonly refKind: PublishBranchRefKind;
    }
    | { readonly type: 'sync-current-head' }
    | { readonly type: 'pull-current-head' }
    | { readonly type: 'push-current-head'; readonly mode: 'normal' | 'force-with-lease' | 'force' }
    | { readonly type: 'stash-save' }
    | { readonly type: 'stash-apply'; readonly refName: string }
    | { readonly type: 'stash-pop'; readonly refName: string }
    | { readonly type: 'stash-drop'; readonly refName: string }
    | { readonly type: 'delete'; readonly refName: string; readonly refKind: DeletableRefKind }
    | {
      readonly type: 'merge';
      readonly refName: string;
      readonly refKind: MergeRefKind;
      readonly commitHash: string;
    };

  type MessageType = Message['type'];
  type MessageOf<Type extends MessageType> = Extract<Message, { readonly type: Type }>;
}

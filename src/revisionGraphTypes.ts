import { RevisionGraphProjectionOptions, RevisionGraphRef } from './revisionGraphData';

export const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';

export type RevisionGraphMessage =
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

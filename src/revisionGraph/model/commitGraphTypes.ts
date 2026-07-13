export interface RevisionGraphRef {
  readonly name: string;
  readonly kind: RevisionGraphProtocol.RefKind;
}

export interface ParsedRevisionGraphCommit {
  readonly hash: string;
  readonly parents: readonly string[];
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly refs: readonly RevisionGraphRef[];
}

export interface CommitGraphCommit extends ParsedRevisionGraphCommit {
  readonly children: readonly string[];
  readonly isBoundary: boolean;
}

export interface CommitGraph {
  readonly orderedCommits: readonly CommitGraphCommit[];
  readonly commitsByHash: ReadonlyMap<string, CommitGraphCommit>;
  readonly simplification: 'none' | 'git-decoration';
}

export interface RevisionGraphProjectionOptions {
  readonly refScope: 'all' | 'current' | 'remoteHead' | 'local';
  readonly showTags: boolean;
  readonly showRemoteBranches: boolean;
  readonly showStashes: boolean;
  readonly showMergeCommits: boolean;
  readonly showCurrentBranchDescendants: boolean;
  readonly revisionRange: RevisionGraphRevisionRange | undefined;
  readonly descendantFocus: RevisionGraphDescendantFocus | undefined;
}

export interface RevisionGraphRevisionRange {
  readonly baseRevision: string;
  readonly baseLabel: string;
  readonly compareRevision: string;
  readonly compareLabel: string;
}

export interface RevisionGraphDescendantFocus {
  readonly anchorRevision: string;
  readonly anchorLabel: string;
}

export interface ProjectedGraphNode {
  readonly hash: string;
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly refs: readonly RevisionGraphRef[];
  readonly isBoundary: boolean;
}

export interface ProjectedGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly through: readonly string[];
}

export interface ProjectedGraph {
  readonly sourceGraph: CommitGraph;
  readonly nodes: readonly ProjectedGraphNode[];
  readonly edges: readonly ProjectedGraphEdge[];
  readonly visibleHashes: ReadonlySet<string>;
}

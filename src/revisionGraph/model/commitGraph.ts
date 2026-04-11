import {
  CommitGraph,
  CommitGraphCommit,
  ParsedRevisionGraphCommit,
  RevisionGraphRef
} from './commitGraphTypes';

export function buildCommitGraph(commits: readonly ParsedRevisionGraphCommit[]): CommitGraph {
  return buildCommitGraphWithSimplification(commits, 'none');
}

export function buildCommitGraphWithSimplification(
  commits: readonly ParsedRevisionGraphCommit[],
  simplification: CommitGraph['simplification']
): CommitGraph {
  const orderedCommits: CommitGraphCommit[] = commits.map((commit) => ({
    hash: commit.hash,
    parents: [...commit.parents],
    children: [],
    author: commit.author,
    date: commit.date,
    subject: commit.subject,
    refs: sortRefs(commit.refs),
    isBoundary: false
  }));
  const commitsByHash = new Map<string, CommitGraphCommit>(
    orderedCommits.map((commit) => [commit.hash, commit] as const)
  );
  const boundaryCommits: CommitGraphCommit[] = [];

  for (const commit of orderedCommits) {
    for (const parentHash of commit.parents) {
      let parent = commitsByHash.get(parentHash);
      if (!parent) {
        parent = {
          hash: parentHash,
          parents: [],
          children: [],
          author: '',
          date: '',
          subject: '',
          refs: [],
          isBoundary: true
        };
        commitsByHash.set(parentHash, parent);
        boundaryCommits.push(parent);
      }

      if (!parent.children.includes(commit.hash)) {
        (parent.children as string[]).push(commit.hash);
      }
    }
  }

  return {
    orderedCommits: [...orderedCommits, ...boundaryCommits],
    commitsByHash,
    simplification
  };
}

function sortRefs(refs: readonly RevisionGraphRef[]): RevisionGraphRef[] {
  const rank: Record<RevisionGraphRef['kind'], number> = {
    head: 0,
    branch: 1,
    remote: 2,
    tag: 3
  };

  return [...refs].sort((left, right) => {
    const byKind = rank[left.kind] - rank[right.kind];
    return byKind !== 0 ? byKind : left.name.localeCompare(right.name);
  });
}

export interface RevisionGraphRef {
  readonly name: string;
  readonly kind: 'head' | 'branch' | 'remote' | 'tag';
}

export interface RevisionGraphCommit {
  readonly hash: string;
  readonly parents: readonly string[];
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly refs: readonly RevisionGraphRef[];
}

export interface RevisionGraphNode {
  readonly hash: string;
  readonly refs: readonly RevisionGraphRef[];
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly row: number;
  readonly lane: number;
}

export interface RevisionGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly fromRow: number;
  readonly fromLane: number;
  readonly toRow: number;
  readonly toLane: number;
}

export interface RevisionGraphScene {
  readonly nodes: readonly RevisionGraphNode[];
  readonly edges: readonly RevisionGraphEdge[];
  readonly laneCount: number;
  readonly rowCount: number;
}

type RevisionGraphRefKind = RevisionGraphRef['kind'];

interface CommitLaneLayout {
  readonly hash: string;
  readonly row: number;
  readonly lane: number;
}

const FIELD_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';

export function parseRevisionGraphLog(
  output: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRefKind>
): RevisionGraphCommit[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash, parents, author, date, subject, decorations] = record.split(FIELD_SEPARATOR);
      return {
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        author,
        date,
        subject,
        refs: parseDecorationRefs(decorations ?? '', refKindsByName)
      };
    });
}

export function buildRevisionGraphScene(commits: readonly RevisionGraphCommit[]): RevisionGraphScene {
  const commitLayout = layoutCommitLanes(commits);
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit] as const));
  const layoutByHash = new Map(commitLayout.map((layout) => [layout.hash, layout] as const));

  const rawNodes = commits
    .filter((commit) => commit.refs.length > 0)
    .map<RevisionGraphNode>((commit) => {
      const layout = layoutByHash.get(commit.hash);
      if (!layout) {
        throw new Error(`Missing layout for commit ${commit.hash}`);
      }

      return {
        hash: commit.hash,
        refs: sortRefs(commit.refs),
        author: commit.author,
        date: commit.date,
        subject: commit.subject,
        row: layout.row,
        lane: layout.lane
      };
    });
  const nodes = compactNodeRows(compactNodeLanes(rawNodes));

  const nodeByHash = new Map(nodes.map((node) => [node.hash, node] as const));
  const edges: RevisionGraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const node of nodes) {
    const commit = commitByHash.get(node.hash);
    if (!commit) {
      continue;
    }

    const nearestAncestor = findNearestReferencedAncestor(commit.parents, commitByHash, nodeByHash);
    if (!nearestAncestor) {
      continue;
    }

    const target = nodeByHash.get(nearestAncestor);
    if (!target) {
      continue;
    }

    const key = `${node.hash}->${nearestAncestor}`;
    if (edgeKeys.has(key)) {
      continue;
    }

    edgeKeys.add(key);
    edges.push({
      from: node.hash,
      to: nearestAncestor,
      fromRow: node.row,
      fromLane: node.lane,
      toRow: target.row,
      toLane: target.lane
    });
  }

  const laneCount = nodes.reduce((max, node) => Math.max(max, node.lane + 1), 0);
  const rowCount = nodes.reduce((max, node) => Math.max(max, node.row + 1), 0);

  return {
    nodes,
    edges,
    laneCount: Math.max(laneCount, 1),
    rowCount: Math.max(rowCount, 1)
  };
}

export function buildPrimaryAncestorPaths(
  commits: readonly RevisionGraphCommit[],
  scene: RevisionGraphScene
): Record<string, string[]> {
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit] as const));
  const visibleHashes = new Set(scene.nodes.map((node) => node.hash));
  const pathsByHash: Record<string, string[]> = {};

  for (const node of scene.nodes) {
    const path = [node.hash];
    const visited = new Set(path);
    let currentCommit = commitByHash.get(node.hash);

    while (currentCommit?.parents[0]) {
      const firstParentHash = currentCommit.parents[0];
      if (visited.has(firstParentHash)) {
        break;
      }

      visited.add(firstParentHash);
      if (visibleHashes.has(firstParentHash)) {
        path.push(firstParentHash);
      }

      currentCommit = commitByHash.get(firstParentHash);
    }

    pathsByHash[node.hash] = path;
  }

  return pathsByHash;
}

export function filterRevisionGraphCommitsToAncestors(
  commits: readonly RevisionGraphCommit[],
  refName: string,
  refKind?: RevisionGraphRef['kind']
): RevisionGraphCommit[] {
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit] as const));
  const targetHashes = commits
    .filter((commit) =>
      commit.refs.some((ref) => ref.name === refName && (refKind === undefined || ref.kind === refKind))
    )
    .map((commit) => commit.hash);

  if (targetHashes.length === 0) {
    return [];
  }

  const reachable = new Set<string>();
  const queue = [...targetHashes];

  while (queue.length > 0) {
    const hash = queue.shift();
    if (!hash || reachable.has(hash)) {
      continue;
    }

    reachable.add(hash);
    const commit = commitByHash.get(hash);
    if (!commit) {
      continue;
    }

    queue.push(...commit.parents);
  }

  return commits.filter((commit) => reachable.has(commit.hash));
}

export function parseDecorationRefs(
  decorations: string,
  refKindsByName?: ReadonlyMap<string, RevisionGraphRefKind>
): RevisionGraphRef[] {
  if (!decorations) {
    return [];
  }

  return decorations
    .split(', ')
    .map((label) => label.trim())
    .filter(Boolean)
    .map<RevisionGraphRef>((label) => {
      if (label.startsWith('HEAD -> ')) {
        return { name: label.slice('HEAD -> '.length), kind: 'head' };
      }

      if (label.startsWith('tag: ')) {
        return { name: label.slice('tag: '.length), kind: 'tag' };
      }

      const knownKind = refKindsByName?.get(label);
      if (knownKind) {
        return { name: label, kind: knownKind };
      }

      if (label.includes('/')) {
        return { name: label, kind: 'remote' };
      }

      return { name: label, kind: 'branch' };
    });
}

export function getRevisionGraphGitFormat(): string {
  return `%H${FIELD_SEPARATOR}%P${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ad${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%D${RECORD_SEPARATOR}`;
}

function layoutCommitLanes(commits: readonly RevisionGraphCommit[]): CommitLaneLayout[] {
  const nodes: CommitLaneLayout[] = [];
  const activeLanes: Array<string | undefined> = [];

  for (const [row, commit] of commits.entries()) {
    const existingLane = activeLanes.indexOf(commit.hash);
    const lane = existingLane >= 0 ? existingLane : findAvailableLane(activeLanes);

    activeLanes[lane] = commit.parents[0];
    for (const parent of commit.parents.slice(1)) {
      const parentLane = activeLanes.indexOf(parent);
      if (parentLane === -1) {
        activeLanes[findAvailableLane(activeLanes)] = parent;
      }
    }

    trimTrailingEmptyLanes(activeLanes);
    nodes.push({ hash: commit.hash, row, lane });
  }

  return nodes;
}

function compactNodeRows(nodes: readonly RevisionGraphNode[]): RevisionGraphNode[] {
  return [...nodes]
    .sort((left, right) => left.row - right.row)
    .map((node, row) => ({
      ...node,
      row
    }));
}

function compactNodeLanes(nodes: readonly RevisionGraphNode[]): RevisionGraphNode[] {
  const compactLaneByOriginal = new Map<number, number>();
  const orderedOriginalLanes = [...new Set(nodes.map((node) => node.lane))].sort((left, right) => left - right);

  for (const [compactLane, originalLane] of orderedOriginalLanes.entries()) {
    compactLaneByOriginal.set(originalLane, compactLane);
  }

  return nodes.map((node) => ({
    ...node,
    lane: compactLaneByOriginal.get(node.lane) ?? node.lane
  }));
}

function findNearestReferencedAncestor(
  parentHashes: readonly string[],
  commitByHash: ReadonlyMap<string, RevisionGraphCommit>,
  nodeByHash: ReadonlyMap<string, RevisionGraphNode>
): string | undefined {
  const firstParentAncestor = findFirstParentReferencedAncestor(parentHashes[0], commitByHash, nodeByHash);
  if (firstParentAncestor) {
    return firstParentAncestor;
  }

  const queue = [...parentHashes];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const hash = queue.shift();
    if (!hash || visited.has(hash)) {
      continue;
    }

    visited.add(hash);
    if (nodeByHash.has(hash)) {
      return hash;
    }

    const commit = commitByHash.get(hash);
    if (!commit) {
      continue;
    }

    queue.push(...commit.parents);
  }

  return undefined;
}

function findFirstParentReferencedAncestor(
  startHash: string | undefined,
  commitByHash: ReadonlyMap<string, RevisionGraphCommit>,
  nodeByHash: ReadonlyMap<string, RevisionGraphNode>
): string | undefined {
  const visited = new Set<string>();
  let currentHash = startHash;

  while (currentHash && !visited.has(currentHash)) {
    visited.add(currentHash);
    if (nodeByHash.has(currentHash)) {
      return currentHash;
    }

    currentHash = commitByHash.get(currentHash)?.parents[0];
  }

  return undefined;
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

function findAvailableLane(activeLanes: Array<string | undefined>): number {
  const firstEmpty = activeLanes.findIndex((lane) => lane === undefined);
  if (firstEmpty >= 0) {
    return firstEmpty;
  }

  activeLanes.push(undefined);
  return activeLanes.length - 1;
}

function trimTrailingEmptyLanes(activeLanes: Array<string | undefined>): void {
  while (activeLanes.length > 0 && activeLanes.at(-1) === undefined) {
    activeLanes.pop();
  }
}

type RevisionGraphWebviewPrimaryPathDirection = 'ancestor' | 'descendant';
type RevisionGraphWebviewEdgeEndpoint = 'from' | 'to';

interface RevisionGraphWebviewPrimaryPathNode {
  readonly hash: string;
  readonly lane?: number;
  readonly row?: number;
  readonly defaultLeft?: number;
}

interface RevisionGraphWebviewPrimaryPathEdge {
  readonly from: string;
  readonly to: string;
}

interface RevisionGraphWebviewPrimaryPathContext {
  readonly primaryAncestorNextByHash: Readonly<Record<string, string>>;
  readonly parentMap: ReadonlyMap<string, readonly string[]>;
  readonly childMap: ReadonlyMap<string, readonly string[]>;
  readonly headDistanceByHash: ReadonlyMap<string, number>;
  readonly nodesByHash: ReadonlyMap<string, RevisionGraphWebviewPrimaryPathNode>;
}

function buildRevisionGraphWebviewDirectionalMap(
  nodes: readonly RevisionGraphWebviewPrimaryPathNode[],
  edges: readonly RevisionGraphWebviewPrimaryPathEdge[],
  sourceKey: RevisionGraphWebviewEdgeEndpoint,
  targetKey: RevisionGraphWebviewEdgeEndpoint
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of nodes) {
    map.set(node.hash, []);
  }
  for (const edge of edges) {
    const source = edge[sourceKey];
    const target = edge[targetKey];
    const targets = map.get(source);
    if (targets) {
      targets.push(target);
      continue;
    }
    map.set(source, [target]);
  }
  return map;
}

function buildRevisionGraphWebviewDistanceMap(
  startHash: string,
  adjacencyMap: ReadonlyMap<string, readonly string[]>
): Map<string, number> {
  const distances = new Map<string, number>([[startHash, 0]]);
  const queue = [startHash];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const hash = queue[queueIndex];
    queueIndex += 1;
    const baseDistance = distances.get(hash) ?? 0;
    for (const nextHash of adjacencyMap.get(hash) ?? []) {
      if (!distances.has(nextHash)) {
        distances.set(nextHash, baseDistance + 1);
        queue.push(nextHash);
      }
    }
  }
  return distances;
}

function getRevisionGraphWebviewPrimaryAncestorPath(
  startHash: string,
  context: RevisionGraphWebviewPrimaryPathContext
): readonly string[] {
  const compactPath = buildRevisionGraphWebviewPrimaryAncestorPath(startHash, context.primaryAncestorNextByHash);
  return compactPath.length > 1
    ? compactPath
    : traceRevisionGraphWebviewPrimaryPath(startHash, 'ancestor', context);
}

function traceRevisionGraphWebviewPrimaryPath(
  startHash: string,
  direction: RevisionGraphWebviewPrimaryPathDirection,
  context: RevisionGraphWebviewPrimaryPathContext
): readonly string[] {
  const path = [startHash];
  const visited = new Set(path);
  let currentHash = startHash;

  while (true) {
    const nextHash = selectRevisionGraphWebviewPrimaryNeighbor(currentHash, visited, direction, context);
    if (!nextHash) {
      break;
    }
    path.push(nextHash);
    visited.add(nextHash);
    currentHash = nextHash;
  }

  return path;
}

function buildRevisionGraphWebviewPrimaryAncestorPath(
  startHash: string,
  primaryAncestorNextByHash: Readonly<Record<string, string>>
): readonly string[] {
  const path = [startHash];
  const visited = new Set(path);
  let currentHash = startHash;

  while (true) {
    const nextHash = primaryAncestorNextByHash[currentHash];
    if (!nextHash || visited.has(nextHash)) {
      break;
    }
    path.push(nextHash);
    visited.add(nextHash);
    currentHash = nextHash;
  }

  return path;
}

function selectRevisionGraphWebviewPrimaryNeighbor(
  currentHash: string,
  visited: ReadonlySet<string>,
  direction: RevisionGraphWebviewPrimaryPathDirection,
  context: RevisionGraphWebviewPrimaryPathContext
): string | undefined {
  const adjacencyMap = direction === 'ancestor' ? context.parentMap : context.childMap;
  const candidates = (adjacencyMap.get(currentHash) ?? []).filter((hash) => !visited.has(hash));
  if (candidates.length === 0) {
    return undefined;
  }

  const preferredCandidates = filterRevisionGraphWebviewPreferredPathCandidates(
    currentHash,
    candidates,
    direction,
    context.headDistanceByHash
  );
  const pool = preferredCandidates.length > 0 ? preferredCandidates : candidates;
  return [...pool].sort((leftHash, rightHash) =>
    scoreRevisionGraphWebviewPathCandidate(currentHash, leftHash, direction, context)
    - scoreRevisionGraphWebviewPathCandidate(currentHash, rightHash, direction, context)
  )[0];
}

function filterRevisionGraphWebviewPreferredPathCandidates(
  currentHash: string,
  candidates: readonly string[],
  direction: RevisionGraphWebviewPrimaryPathDirection,
  headDistanceByHash: ReadonlyMap<string, number>
): readonly string[] {
  if (direction === 'descendant') {
    const onHeadPath = candidates.filter((hash) => headDistanceByHash.has(hash));
    return onHeadPath.length > 0 ? onHeadPath : [];
  }

  const currentHeadDistance = headDistanceByHash.get(currentHash);
  if (currentHeadDistance === undefined) {
    return [];
  }

  const forwardHeadPath = candidates.filter((hash) => {
    const candidateHeadDistance = headDistanceByHash.get(hash);
    return candidateHeadDistance !== undefined && candidateHeadDistance > currentHeadDistance;
  });
  return forwardHeadPath.length > 0 ? forwardHeadPath : [];
}

function scoreRevisionGraphWebviewPathCandidate(
  currentHash: string,
  candidateHash: string,
  direction: RevisionGraphWebviewPrimaryPathDirection,
  context: RevisionGraphWebviewPrimaryPathContext
): number {
  const currentNode = context.nodesByHash.get(currentHash);
  const candidateNode = context.nodesByHash.get(candidateHash);
  const laneDelta = Math.abs((candidateNode?.lane || 0) - (currentNode?.lane || 0));
  const rowDistance = Math.abs((candidateNode?.row || 0) - (currentNode?.row || 0));
  const horizontalDistance = Math.abs((candidateNode?.defaultLeft || 0) - (currentNode?.defaultLeft || 0));
  const candidateHeadDistance = context.headDistanceByHash.get(candidateHash);

  if (direction === 'descendant' && candidateHeadDistance !== undefined) {
    return candidateHeadDistance * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
  }

  if (direction === 'ancestor') {
    const currentHeadDistance = context.headDistanceByHash.get(currentHash);
    if (currentHeadDistance !== undefined && candidateHeadDistance !== undefined) {
      return Math.abs(candidateHeadDistance - (currentHeadDistance + 1)) * 10000
        + laneDelta * 100
        + rowDistance * 10
        + horizontalDistance;
    }
  }

  return laneDelta * 100 + rowDistance * 10 + horizontalDistance;
}

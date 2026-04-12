export function renderRevisionGraphScriptGraphLogic(): string {
  return `
    function buildDirectionalMap(edges, sourceKey, targetKey) {
      const map = new Map();
      for (const node of graphNodes) {
        map.set(node.hash, []);
      }
      for (const edge of edges) {
        const source = edge[sourceKey];
        const target = edge[targetKey];
        if (!map.has(source)) {
          map.set(source, []);
        }
        map.get(source).push(target);
      }
      return map;
    }

    function buildDistanceMap(startHash, adjacencyMap) {
      const distances = new Map([[startHash, 0]]);
      const queue = [startHash];
      while (queue.length > 0) {
        const hash = queue.shift();
        if (!hash) {
          continue;
        }
        const baseDistance = distances.get(hash) || 0;
        const nextHashes = adjacencyMap.get(hash) || [];
        for (const nextHash of nextHashes) {
          if (!distances.has(nextHash)) {
            distances.set(nextHash, baseDistance + 1);
            queue.push(nextHash);
          }
        }
      }
      return distances;
    }

    function getPrimaryAncestorPath(startHash) {
      const precomputedPath = primaryAncestorPathsByHash[startHash];
      return Array.isArray(precomputedPath) && precomputedPath.length > 0
        ? precomputedPath
        : tracePrimaryPath(startHash, 'ancestor');
    }

    function tracePrimaryPath(startHash, direction) {
      const path = [startHash];
      const visited = new Set(path);
      let currentHash = startHash;

      while (true) {
        const nextHash = selectPrimaryNeighbor(currentHash, visited, direction);
        if (!nextHash) {
          break;
        }
        path.push(nextHash);
        visited.add(nextHash);
        currentHash = nextHash;
      }

      return path;
    }

    function selectPrimaryNeighbor(currentHash, visited, direction) {
      const adjacencyMap = direction === 'ancestor' ? parentMap : childMap;
      const candidates = (adjacencyMap.get(currentHash) || []).filter((hash) => !visited.has(hash));
      if (candidates.length === 0) {
        return undefined;
      }

      const preferredCandidates = filterPreferredCandidates(currentHash, candidates, direction);
      const pool = preferredCandidates.length > 0 ? preferredCandidates : candidates;
      return [...pool].sort((leftHash, rightHash) =>
        scorePathCandidate(currentHash, leftHash, direction) - scorePathCandidate(currentHash, rightHash, direction)
      )[0];
    }

    function filterPreferredCandidates(currentHash, candidates, direction) {
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

    function scorePathCandidate(currentHash, candidateHash, direction) {
      const currentNode = graphNodeByHash.get(currentHash);
      const candidateNode = graphNodeByHash.get(candidateHash);
      const laneDelta = Math.abs((candidateNode?.lane || 0) - (currentNode?.lane || 0));
      const rowDistance = Math.abs((candidateNode?.row || 0) - (currentNode?.row || 0));
      const horizontalDistance = Math.abs((candidateNode?.defaultLeft || 0) - (currentNode?.defaultLeft || 0));
      const candidateHeadDistance = headDistanceByHash.get(candidateHash);

      if (direction === 'descendant' && candidateHeadDistance !== undefined) {
        return candidateHeadDistance * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
      }

      if (direction === 'ancestor') {
        const currentHeadDistance = headDistanceByHash.get(currentHash);
        if (currentHeadDistance !== undefined && candidateHeadDistance !== undefined) {
          return Math.abs(candidateHeadDistance - (currentHeadDistance + 1)) * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
        }
      }

      return laneDelta * 100 + rowDistance * 10 + horizontalDistance;
    }

    function buildPathEdgeKeys(path, direction) {
      const keys = new Set();
      for (let index = 0; index < path.length - 1; index += 1) {
        const currentHash = path[index];
        const nextHash = path[index + 1];
        const edgeKey = direction === 'ancestor'
          ? currentHash + '->' + nextHash
          : nextHash + '->' + currentHash;
        keys.add(edgeKey);
      }
      return keys;
    }
  `;
}

interface RevisionGraphWebviewVirtualSceneLayout {
  readonly defaultTop: number;
  readonly height: number;
}

interface RevisionGraphWebviewVirtualSceneEdge {
  readonly from: string;
  readonly to: string;
}

interface RevisionGraphWebviewVirtualSceneVerticalBounds {
  readonly top: number;
  readonly bottom: number;
}

function getRevisionGraphWebviewVirtualEdgeVerticalBounds(
  edge: RevisionGraphWebviewVirtualSceneEdge,
  layoutsByHash: ReadonlyMap<string, RevisionGraphWebviewVirtualSceneLayout>
): RevisionGraphWebviewVirtualSceneVerticalBounds | null {
  const fromLayout = layoutsByHash.get(edge.from);
  const toLayout = layoutsByHash.get(edge.to);
  if (!fromLayout || !toLayout) {
    return null;
  }

  return {
    top: Math.min(fromLayout.defaultTop, toLayout.defaultTop),
    bottom: Math.max(
      fromLayout.defaultTop + fromLayout.height,
      toLayout.defaultTop + toLayout.height
    )
  };
}

function createRevisionGraphWebviewVirtualEdgeKey(
  edge: RevisionGraphWebviewVirtualSceneEdge
): string {
  return `${edge.from}->${edge.to}`;
}

function createRevisionGraphWebviewVirtualSceneKey(
  visibleHashes: ReadonlySet<string>,
  visibleEdges: readonly RevisionGraphWebviewVirtualSceneEdge[]
): string {
  return [
    [...visibleHashes].sort().join(','),
    visibleEdges.map(createRevisionGraphWebviewVirtualEdgeKey).sort().join(',')
  ].join('|');
}

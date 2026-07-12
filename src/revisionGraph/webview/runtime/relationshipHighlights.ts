interface RevisionGraphWebviewRelationshipHighlights {
  readonly isComparison: boolean;
  readonly anchorHash: string | null;
  readonly selectedHashes: ReadonlySet<string>;
  readonly relatedHashes: ReadonlySet<string>;
  readonly ancestorHashes: ReadonlySet<string>;
  readonly descendantHashes: ReadonlySet<string>;
  readonly ancestorEdgeKeys: ReadonlySet<string>;
  readonly descendantEdgeKeys: ReadonlySet<string>;
}

function createRevisionGraphWebviewRelationshipHighlights(
  baseHash: string | null,
  compareHash: string | null,
  ancestorPath: readonly string[],
  descendantPath: readonly string[]
): RevisionGraphWebviewRelationshipHighlights {
  if (baseHash !== null && compareHash !== null) {
    return {
      isComparison: true,
      anchorHash: null,
      selectedHashes: new Set([baseHash, compareHash].filter((hash) => hash.length > 0)),
      relatedHashes: new Set(),
      ancestorHashes: new Set(),
      descendantHashes: new Set(),
      ancestorEdgeKeys: new Set(),
      descendantEdgeKeys: new Set()
    };
  }

  const ancestorHashes = new Set(ancestorPath);
  const descendantHashes = new Set(descendantPath);
  return {
    isComparison: false,
    anchorHash: baseHash,
    selectedHashes: baseHash ? new Set([baseHash]) : new Set(),
    relatedHashes: new Set([...ancestorHashes, ...descendantHashes]),
    ancestorHashes,
    descendantHashes,
    ancestorEdgeKeys: createRevisionGraphWebviewPathEdgeKeys(ancestorPath, 'ancestor'),
    descendantEdgeKeys: createRevisionGraphWebviewPathEdgeKeys(descendantPath, 'descendant')
  };
}

function createRevisionGraphWebviewPathEdgeKeys(
  path: readonly string[],
  direction: 'ancestor' | 'descendant'
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (let index = 0; index < path.length - 1; index += 1) {
    const currentHash = path[index];
    const nextHash = path[index + 1];
    const edgeKey = direction === 'ancestor'
      ? `${currentHash}->${nextHash}`
      : `${nextHash}->${currentHash}`;
    keys.add(edgeKey);
  }
  return keys;
}

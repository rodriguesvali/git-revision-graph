interface RevisionGraphWebviewVirtualIndexBounds {
  readonly top: number;
  readonly bottom: number;
}

interface RevisionGraphWebviewVirtualIndexEntry<T> extends RevisionGraphWebviewVirtualIndexBounds {
  readonly entry: T;
  readonly order: number;
}

interface RevisionGraphWebviewVirtualIndexNode<T> {
  readonly center: number;
  readonly overlappingByTop: readonly RevisionGraphWebviewVirtualIndexEntry<T>[];
  readonly overlappingByBottom: readonly RevisionGraphWebviewVirtualIndexEntry<T>[];
  readonly left: RevisionGraphWebviewVirtualIndexNode<T> | null;
  readonly right: RevisionGraphWebviewVirtualIndexNode<T> | null;
}

interface RevisionGraphWebviewVirtualIndex<T> {
  readonly root: RevisionGraphWebviewVirtualIndexNode<T> | null;
  readonly size: number;
}

function createEmptyRevisionGraphWebviewVirtualIndex<T>(): RevisionGraphWebviewVirtualIndex<T> {
  return { root: null, size: 0 };
}

function buildRevisionGraphWebviewVirtualIndex<T>(
  entries: readonly T[],
  getBounds: (entry: T) => RevisionGraphWebviewVirtualIndexBounds | null
): RevisionGraphWebviewVirtualIndex<T> {
  const indexedEntries: RevisionGraphWebviewVirtualIndexEntry<T>[] = [];
  entries.forEach((entry, order) => {
    const bounds = normalizeRevisionGraphWebviewVirtualIndexBounds(getBounds(entry));
    if (bounds) {
      indexedEntries.push({ entry, order, ...bounds });
    }
  });
  return {
    root: buildRevisionGraphWebviewVirtualIndexNode(indexedEntries),
    size: indexedEntries.length
  };
}

function collectRevisionGraphWebviewVirtualIndexCandidates<T>(
  index: RevisionGraphWebviewVirtualIndex<T>,
  bounds: RevisionGraphWebviewVirtualIndexBounds,
  getKey: (entry: T) => string | null
): T[] {
  const normalizedBounds = normalizeRevisionGraphWebviewVirtualIndexBounds(bounds);
  if (!normalizedBounds || !index.root) {
    return [];
  }

  const matches: RevisionGraphWebviewVirtualIndexEntry<T>[] = [];
  collectRevisionGraphWebviewVirtualIndexMatches(index.root, normalizedBounds, matches);
  matches.sort((first, second) => first.order - second.order);

  const candidates: T[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const key = getKey(match.entry);
    if (key && !seen.has(key)) {
      seen.add(key);
      candidates.push(match.entry);
    }
  }
  return candidates;
}

function buildRevisionGraphWebviewVirtualIndexNode<T>(
  entries: readonly RevisionGraphWebviewVirtualIndexEntry<T>[]
): RevisionGraphWebviewVirtualIndexNode<T> | null {
  if (entries.length === 0) {
    return null;
  }

  const midpoints = entries
    .map((entry) => entry.top / 2 + entry.bottom / 2)
    .sort((first, second) => first - second);
  const center = midpoints[Math.floor(midpoints.length / 2)];
  const left: RevisionGraphWebviewVirtualIndexEntry<T>[] = [];
  const right: RevisionGraphWebviewVirtualIndexEntry<T>[] = [];
  const overlapping: RevisionGraphWebviewVirtualIndexEntry<T>[] = [];
  for (const entry of entries) {
    if (entry.bottom < center) {
      left.push(entry);
    } else if (entry.top > center) {
      right.push(entry);
    } else {
      overlapping.push(entry);
    }
  }

  return {
    center,
    overlappingByTop: [...overlapping].sort((first, second) => first.top - second.top),
    overlappingByBottom: [...overlapping].sort((first, second) => second.bottom - first.bottom),
    left: buildRevisionGraphWebviewVirtualIndexNode(left),
    right: buildRevisionGraphWebviewVirtualIndexNode(right)
  };
}

function collectRevisionGraphWebviewVirtualIndexMatches<T>(
  node: RevisionGraphWebviewVirtualIndexNode<T>,
  bounds: RevisionGraphWebviewVirtualIndexBounds,
  matches: RevisionGraphWebviewVirtualIndexEntry<T>[]
): void {
  if (bounds.bottom < node.center) {
    collectRevisionGraphWebviewVirtualIndexMatchesBelow(node, bounds, matches);
    return;
  }
  if (bounds.top > node.center) {
    collectRevisionGraphWebviewVirtualIndexMatchesAbove(node, bounds, matches);
    return;
  }

  matches.push(...node.overlappingByTop);
  if (node.left) {
    collectRevisionGraphWebviewVirtualIndexMatches(node.left, bounds, matches);
  }
  if (node.right) {
    collectRevisionGraphWebviewVirtualIndexMatches(node.right, bounds, matches);
  }
}

function collectRevisionGraphWebviewVirtualIndexMatchesBelow<T>(
  node: RevisionGraphWebviewVirtualIndexNode<T>,
  bounds: RevisionGraphWebviewVirtualIndexBounds,
  matches: RevisionGraphWebviewVirtualIndexEntry<T>[]
): void {
  for (const entry of node.overlappingByTop) {
    if (entry.top > bounds.bottom) {
      break;
    }
    matches.push(entry);
  }
  if (node.left) {
    collectRevisionGraphWebviewVirtualIndexMatches(node.left, bounds, matches);
  }
}

function collectRevisionGraphWebviewVirtualIndexMatchesAbove<T>(
  node: RevisionGraphWebviewVirtualIndexNode<T>,
  bounds: RevisionGraphWebviewVirtualIndexBounds,
  matches: RevisionGraphWebviewVirtualIndexEntry<T>[]
): void {
  for (const entry of node.overlappingByBottom) {
    if (entry.bottom < bounds.top) {
      break;
    }
    matches.push(entry);
  }
  if (node.right) {
    collectRevisionGraphWebviewVirtualIndexMatches(node.right, bounds, matches);
  }
}

function normalizeRevisionGraphWebviewVirtualIndexBounds(
  bounds: RevisionGraphWebviewVirtualIndexBounds | null
): RevisionGraphWebviewVirtualIndexBounds | null {
  if (!bounds || !Number.isFinite(bounds.top) || !Number.isFinite(bounds.bottom)) {
    return null;
  }
  return {
    top: Math.max(0, Math.min(bounds.top, bounds.bottom)),
    bottom: Math.max(0, Math.max(bounds.top, bounds.bottom))
  };
}

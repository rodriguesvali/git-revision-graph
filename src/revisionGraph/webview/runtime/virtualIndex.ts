interface RevisionGraphWebviewVirtualIndexBounds {
  readonly top: number;
  readonly bottom: number;
}

interface RevisionGraphWebviewVirtualBucketRange {
  readonly first: number;
  readonly last: number;
}

function buildRevisionGraphWebviewVirtualIndex<T>(
  entries: readonly T[],
  bucketSize: number,
  getBounds: (entry: T) => RevisionGraphWebviewVirtualIndexBounds | null
): Map<number, T[]> {
  const index = new Map<number, T[]>();

  for (const entry of entries) {
    const bounds = getBounds(entry);
    if (!bounds) {
      continue;
    }
    addRevisionGraphWebviewVirtualIndexEntry(index, bounds.top, bounds.bottom, entry, bucketSize);
  }

  return index;
}

function collectRevisionGraphWebviewVirtualIndexCandidates<T>(
  index: ReadonlyMap<number, readonly T[]>,
  bounds: RevisionGraphWebviewVirtualIndexBounds,
  bucketSize: number,
  getKey: (entry: T) => string | null
): T[] {
  const bucketRange = getRevisionGraphWebviewVirtualBucketRange(
    bounds.top,
    bounds.bottom,
    bucketSize
  );
  if (!bucketRange) {
    return [];
  }

  const candidates: T[] = [];
  const seen = new Set<string>();
  for (let bucket = bucketRange.first; bucket <= bucketRange.last; bucket += 1) {
    const entries = index.get(bucket) ?? [];
    for (const entry of entries) {
      const key = getKey(entry);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push(entry);
    }
  }

  return candidates;
}

function getRevisionGraphWebviewVirtualBucketRange(
  top: number,
  bottom: number,
  bucketSize: number
): RevisionGraphWebviewVirtualBucketRange | null {
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(bucketSize) || bucketSize <= 0) {
    return null;
  }

  return {
    first: Math.floor(Math.max(0, Math.min(top, bottom)) / bucketSize),
    last: Math.floor(Math.max(0, Math.max(top, bottom)) / bucketSize)
  };
}

function addRevisionGraphWebviewVirtualIndexEntry<T>(
  index: Map<number, T[]>,
  top: number,
  bottom: number,
  entry: T,
  bucketSize: number
): void {
  const bucketRange = getRevisionGraphWebviewVirtualBucketRange(top, bottom, bucketSize);
  if (!bucketRange) {
    return;
  }

  for (let bucket = bucketRange.first; bucket <= bucketRange.last; bucket += 1) {
    const entries = index.get(bucket);
    if (entries) {
      entries.push(entry);
    } else {
      index.set(bucket, [entry]);
    }
  }
}

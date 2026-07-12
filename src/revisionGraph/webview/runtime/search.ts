interface RevisionGraphWebviewSearchReference {
  readonly name: string;
  readonly kind: RevisionGraphWebviewRefKind;
}

interface RevisionGraphWebviewSearchNode {
  readonly hash: string;
  readonly row: number;
  readonly subject?: string;
  readonly author?: string;
  readonly refs: readonly RevisionGraphWebviewSearchReference[];
}

type RevisionGraphWebviewReferenceVisibility = (
  hash: string,
  reference: RevisionGraphWebviewSearchReference
) => boolean;

function normalizeRevisionGraphWebviewSearchQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getRevisionGraphWebviewSearchResultHashes(
  nodes: readonly RevisionGraphWebviewSearchNode[],
  normalizedQuery: string,
  isReferenceVisible: RevisionGraphWebviewReferenceVisibility
): readonly string[] {
  if (normalizedQuery.length === 0) {
    return [];
  }

  return nodes
    .slice()
    .sort((left, right) => left.row - right.row)
    .filter((node) => revisionGraphWebviewNodeMatchesSearchQuery(node, normalizedQuery, isReferenceVisible))
    .map((node) => node.hash);
}

function getRevisionGraphWebviewSearchActiveResultIndex(
  resultHashes: readonly string[],
  previousActiveHash: string | null
): number {
  if (resultHashes.length === 0) {
    return -1;
  }

  if (!previousActiveHash) {
    return 0;
  }

  const preservedIndex = resultHashes.indexOf(previousActiveHash);
  return preservedIndex >= 0 ? preservedIndex : 0;
}

function normalizeRevisionGraphWebviewSearchResultIndex(
  resultHashes: readonly string[],
  nextIndex: number
): number {
  if (resultHashes.length === 0) {
    return -1;
  }

  return ((nextIndex % resultHashes.length) + resultHashes.length) % resultHashes.length;
}

function getRevisionGraphWebviewActiveSearchResultHash(
  resultHashes: readonly string[],
  activeIndex: number
): string | null {
  return activeIndex >= 0 ? resultHashes[activeIndex] ?? null : null;
}

function revisionGraphWebviewNodeMatchesSearchQuery(
  node: RevisionGraphWebviewSearchNode,
  normalizedQuery: string,
  isReferenceVisible: RevisionGraphWebviewReferenceVisibility
): boolean {
  if (normalizedQuery.length === 0) {
    return false;
  }

  const candidateValues = [
    node.hash,
    node.subject ?? '',
    node.author ?? '',
    ...node.refs
      .filter((reference) => isReferenceVisible(node.hash, reference))
      .map((reference) => reference.name)
  ];
  return candidateValues.some((value) => value.toLowerCase().includes(normalizedQuery));
}

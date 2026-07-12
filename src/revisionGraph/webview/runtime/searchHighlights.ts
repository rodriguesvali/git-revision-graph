function syncRevisionGraphWebviewSearchHighlights(
  nodeElements: ReadonlyMap<string, HTMLElement>,
  searchResultHashes: readonly string[],
  activeSearchResultHash: string | null
): void {
  const matchHashes = new Set(searchResultHashes);
  for (const [hash, element] of nodeElements) {
    element.classList.toggle('search-match', matchHashes.has(hash));
    element.classList.toggle('search-active', hash === activeSearchResultHash);
  }
}

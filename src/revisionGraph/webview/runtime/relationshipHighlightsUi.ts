function syncRevisionGraphWebviewRelationshipHighlightsUi(
  nodeElements: ReadonlyMap<string, HTMLElement>,
  edgeElements: readonly Element[],
  highlights: RevisionGraphWebviewRelationshipHighlights
): void {
  if (highlights.isComparison) {
    for (const [hash, element] of nodeElements) {
      element.classList.toggle('selected', highlights.selectedHashes.has(hash));
      element.classList.remove('related', 'ancestor-related', 'descendant-related');
    }

    for (const element of edgeElements) {
      element.classList.remove('related', 'ancestor-path', 'descendant-path', 'muted');
    }
    return;
  }

  for (const [hash, element] of nodeElements) {
    const isAncestorRelated = highlights.anchorHash !== null
      && highlights.anchorHash !== hash
      && highlights.ancestorHashes.has(hash);
    const isDescendantRelated = highlights.anchorHash !== null
      && highlights.anchorHash !== hash
      && highlights.descendantHashes.has(hash);
    element.classList.toggle('selected', highlights.anchorHash === hash);
    element.classList.toggle(
      'related',
      highlights.anchorHash !== null
        && highlights.anchorHash !== hash
        && highlights.relatedHashes.has(hash)
    );
    element.classList.toggle('ancestor-related', isAncestorRelated);
    element.classList.toggle('descendant-related', isDescendantRelated);
  }

  for (const element of edgeElements) {
    const fromHash = element.getAttribute('data-edge-from');
    const toHash = element.getAttribute('data-edge-to');
    const edgeKey = fromHash && toHash ? `${fromHash}->${toHash}` : '';
    const isAncestorPath = highlights.anchorHash !== null && highlights.ancestorEdgeKeys.has(edgeKey);
    const isDescendantPath = highlights.anchorHash !== null && highlights.descendantEdgeKeys.has(edgeKey);
    const isRelated = isAncestorPath || isDescendantPath;

    element.classList.toggle('related', isRelated);
    element.classList.toggle('ancestor-path', isAncestorPath);
    element.classList.toggle('descendant-path', isDescendantPath);
    element.classList.toggle('muted', highlights.anchorHash !== null && !isRelated);
  }
}

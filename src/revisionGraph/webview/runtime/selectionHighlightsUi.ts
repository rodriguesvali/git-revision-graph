function syncRevisionGraphWebviewSelectionHighlightsUi(
  referenceElements: readonly Element[],
  nodeElements: ReadonlyMap<string, HTMLElement>,
  baseReferenceId: string | null,
  compareReferenceId: string | null,
  baseHash: string | null,
  compareHash: string | null,
  hasComparison: boolean
): void {
  for (const element of referenceElements) {
    const referenceId = element.getAttribute('data-ref-id');
    element.classList.toggle('base', referenceId === baseReferenceId);
    element.classList.toggle('compare', referenceId === compareReferenceId);
    element.classList.toggle('has-compare', hasComparison && referenceId === baseReferenceId);
  }

  for (const [hash, element] of nodeElements) {
    element.classList.toggle('base-target', baseHash === hash);
    element.classList.toggle('has-compare', hasComparison && baseHash === hash);
    element.classList.toggle('compare-target', compareHash === hash);
  }
}

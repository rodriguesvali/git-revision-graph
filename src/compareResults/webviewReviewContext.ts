import type { CompareResultsWebviewState } from '../compareResultsWebview';

export interface CompareResultsReviewContext {
  readonly query: string;
  readonly statusFilter: string;
  readonly selectedItemIds: readonly string[];
  readonly selectionAnchorItemId: string | undefined;
}

export function reconcileCompareResultsReviewContext(
  previous: Pick<CompareResultsWebviewState, 'kind' | 'comparisonId'>,
  next: Pick<CompareResultsWebviewState, 'kind' | 'comparisonId' | 'items'>,
  review: CompareResultsReviewContext
): CompareResultsReviewContext & { readonly preserved: boolean } {
  const preserved = previous.kind === 'results' && next.kind === 'results'
    && typeof next.comparisonId === 'string' && next.comparisonId.length > 0
    && previous.comparisonId === next.comparisonId;
  if (!preserved) {
    const selectedItemIds = next.kind === 'results' && next.items.length === 1 ? [next.items[0].id] : [];
    return { query: '', statusFilter: 'all', selectedItemIds,
      selectionAnchorItemId: selectedItemIds[0], preserved: false };
  }
  const validIds = new Set(next.items.map((item) => item.id));
  const selectedItemIds = review.selectedItemIds.filter((id) => validIds.has(id));
  return { ...review, selectedItemIds,
    selectionAnchorItemId: validIds.has(review.selectionAnchorItemId ?? '')
      ? review.selectionAnchorItemId : selectedItemIds[0], preserved: true };
}

export function renderCompareResultsReviewContextScript(): string {
  // This dependency-free function is shared by direct tests and the inline webview.
  return `
    ${reconcileCompareResultsReviewContext.toString()}

    function applyCompareResultsState(nextState) {
      const review = reconcileCompareResultsReviewContext(currentState, nextState, {
        query: searchInput.value, statusFilter: activeStatusFilter,
        selectedItemIds, selectionAnchorItemId
      });
      const focusedItemId = review.preserved
        ? document.activeElement?.closest?.('.row[data-item-id]')?.getAttribute('data-item-id')
        : undefined;
      currentState = nextState;
      syncCompareResultsActionsFromState();
      if (!review.preserved) searchInput.value = review.query;
      activeStatusFilter = review.statusFilter;
      selectedItemIds = review.selectedItemIds;
      selectionAnchorItemId = review.selectionAnchorItemId;
      resetDoubleClickTracking();
      closeContextMenu();
      render();
      if (focusedItemId) {
        if (getVisibleItemIds().includes(focusedItemId)) focusItem(focusedItemId);
        else searchInput.focus();
      }
    }
  `;
}

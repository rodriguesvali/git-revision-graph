export const REVISION_GRAPH_PANEL_VIEW_TYPE = 'gitRefs.revisionGraphEditorPanel';

export function matchesRevisionGraphPanelViewType(viewType: string): boolean {
  return viewType === REVISION_GRAPH_PANEL_VIEW_TYPE
    || viewType.endsWith(`-${REVISION_GRAPH_PANEL_VIEW_TYPE}`);
}

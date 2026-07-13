interface RevisionGraphWebviewDom {
  readonly viewport: HTMLDivElement;
  readonly canvas: HTMLDivElement;
  readonly sceneLayer: HTMLDivElement;
  readonly graphSvg: SVGSVGElement;
  readonly edgeLayer: SVGGElement;
  readonly nodeLayer: HTMLDivElement;
  readonly statusCard: HTMLDivElement;
  readonly statusMessage: HTMLDivElement;
  readonly statusActionButton: HTMLButtonElement;
  readonly contextMenu: HTMLDivElement;
  readonly referenceTooltip: HTMLDivElement;
  readonly graphMinimap: HTMLDivElement;
  readonly minimapSvg: SVGSVGElement;
  readonly minimapEdgeLayer: SVGGElement;
  readonly minimapNodeLayer: SVGGElement;
  readonly minimapViewport: SVGRectElement;
  readonly minimapZoomOutButton: HTMLButtonElement;
  readonly minimapZoomResetButton: HTMLButtonElement;
  readonly minimapZoomInButton: HTMLButtonElement;
  readonly loadingOverlay: HTMLDivElement;
  readonly loadingMessage: HTMLDivElement;
  readonly reloadButton: HTMLButtonElement;
  readonly reloadMenuButton: HTMLButtonElement;
  readonly fetchAllButton: HTMLButtonElement;
  readonly pullButton: HTMLButtonElement;
  readonly pushButton: HTMLButtonElement;
  readonly pushMenuButton: HTMLButtonElement;
  readonly syncButton: HTMLButtonElement;
  readonly scopeSelect: HTMLSelectElement;
  readonly viewOptionsButton: HTMLButtonElement;
  readonly viewOptionsMenu: HTMLDivElement;
  readonly showTagsToggle: HTMLInputElement;
  readonly showRemoteBranchesToggle: HTMLInputElement;
  readonly showStashesToggle: HTMLInputElement;
  readonly showMergeCommitsToggle: HTMLInputElement;
  readonly showMinimapToggle: HTMLInputElement;
  readonly flowGovernanceOptions: HTMLDivElement;
  readonly flowGovernanceEnabledToggle: HTMLInputElement;
  readonly searchInput: HTMLInputElement;
  readonly searchResultBadge: HTMLSpanElement;
  readonly searchPrevButton: HTMLButtonElement;
  readonly searchNextButton: HTMLButtonElement;
  readonly searchClearButton: HTMLButtonElement;
  readonly rangeFilter: HTMLDivElement;
  readonly rangeFilterLabel: HTMLSpanElement;
  readonly rangeFilterClearButton: HTMLButtonElement;
  readonly descendantFilter: HTMLDivElement;
  readonly descendantFilterLabel: HTMLSpanElement;
  readonly descendantFilterClearButton: HTMLButtonElement;
  readonly centerHeadButton: HTMLButtonElement;
  readonly zoomOutButton: HTMLButtonElement;
  readonly zoomResetButton: HTMLButtonElement;
  readonly zoomInButton: HTMLButtonElement;
}

function createRevisionGraphWebviewDom(): RevisionGraphWebviewDom {
  return {
    viewport: requireRevisionGraphElement<HTMLDivElement>('viewport'),
    canvas: requireRevisionGraphElement<HTMLDivElement>('canvas'),
    sceneLayer: requireRevisionGraphElement<HTMLDivElement>('sceneLayer'),
    graphSvg: requireRevisionGraphElement<SVGSVGElement>('graphSvg'),
    edgeLayer: requireRevisionGraphElement<SVGGElement>('edgeLayer'),
    nodeLayer: requireRevisionGraphElement<HTMLDivElement>('nodeLayer'),
    statusCard: requireRevisionGraphElement<HTMLDivElement>('statusCard'),
    statusMessage: requireRevisionGraphElement<HTMLDivElement>('statusMessage'),
    statusActionButton: requireRevisionGraphElement<HTMLButtonElement>('statusActionButton'),
    contextMenu: requireRevisionGraphElement<HTMLDivElement>('contextMenu'),
    referenceTooltip: requireRevisionGraphElement<HTMLDivElement>('referenceTooltip'),
    graphMinimap: requireRevisionGraphElement<HTMLDivElement>('graphMinimap'),
    minimapSvg: requireRevisionGraphElement<SVGSVGElement>('minimapSvg'),
    minimapEdgeLayer: requireRevisionGraphElement<SVGGElement>('minimapEdgeLayer'),
    minimapNodeLayer: requireRevisionGraphElement<SVGGElement>('minimapNodeLayer'),
    minimapViewport: requireRevisionGraphElement<SVGRectElement>('minimapViewport'),
    minimapZoomOutButton: requireRevisionGraphElement<HTMLButtonElement>('minimapZoomOutButton'),
    minimapZoomResetButton: requireRevisionGraphElement<HTMLButtonElement>('minimapZoomResetButton'),
    minimapZoomInButton: requireRevisionGraphElement<HTMLButtonElement>('minimapZoomInButton'),
    loadingOverlay: requireRevisionGraphElement<HTMLDivElement>('loadingOverlay'),
    loadingMessage: requireRevisionGraphElement<HTMLDivElement>('loadingMessage'),
    reloadButton: requireRevisionGraphElement<HTMLButtonElement>('reloadButton'),
    reloadMenuButton: requireRevisionGraphElement<HTMLButtonElement>('reloadMenuButton'),
    fetchAllButton: requireRevisionGraphElement<HTMLButtonElement>('fetchAllButton'),
    pullButton: requireRevisionGraphElement<HTMLButtonElement>('pullButton'),
    pushButton: requireRevisionGraphElement<HTMLButtonElement>('pushButton'),
    pushMenuButton: requireRevisionGraphElement<HTMLButtonElement>('pushMenuButton'),
    syncButton: requireRevisionGraphElement<HTMLButtonElement>('syncButton'),
    scopeSelect: requireRevisionGraphElement<HTMLSelectElement>('scopeSelect'),
    viewOptionsButton: requireRevisionGraphElement<HTMLButtonElement>('viewOptionsButton'),
    viewOptionsMenu: requireRevisionGraphElement<HTMLDivElement>('viewOptionsMenu'),
    showTagsToggle: requireRevisionGraphElement<HTMLInputElement>('showTagsToggle'),
    showRemoteBranchesToggle: requireRevisionGraphElement<HTMLInputElement>('showRemoteBranchesToggle'),
    showStashesToggle: requireRevisionGraphElement<HTMLInputElement>('showStashesToggle'),
    showMergeCommitsToggle: requireRevisionGraphElement<HTMLInputElement>('showMergeCommitsToggle'),
    showMinimapToggle: requireRevisionGraphElement<HTMLInputElement>('showMinimapToggle'),
    flowGovernanceOptions: requireRevisionGraphElement<HTMLDivElement>('flowGovernanceOptions'),
    flowGovernanceEnabledToggle: requireRevisionGraphElement<HTMLInputElement>('flowGovernanceEnabledToggle'),
    searchInput: requireRevisionGraphElement<HTMLInputElement>('searchInput'),
    searchResultBadge: requireRevisionGraphElement<HTMLSpanElement>('searchResultBadge'),
    searchPrevButton: requireRevisionGraphElement<HTMLButtonElement>('searchPrevButton'),
    searchNextButton: requireRevisionGraphElement<HTMLButtonElement>('searchNextButton'),
    searchClearButton: requireRevisionGraphElement<HTMLButtonElement>('searchClearButton'),
    rangeFilter: requireRevisionGraphElement<HTMLDivElement>('rangeFilter'),
    rangeFilterLabel: requireRevisionGraphElement<HTMLSpanElement>('rangeFilterLabel'),
    rangeFilterClearButton: requireRevisionGraphElement<HTMLButtonElement>('rangeFilterClearButton'),
    descendantFilter: requireRevisionGraphElement<HTMLDivElement>('descendantFilter'),
    descendantFilterLabel: requireRevisionGraphElement<HTMLSpanElement>('descendantFilterLabel'),
    descendantFilterClearButton: requireRevisionGraphElement<HTMLButtonElement>('descendantFilterClearButton'),
    centerHeadButton: requireRevisionGraphElement<HTMLButtonElement>('centerHeadButton'),
    zoomOutButton: requireRevisionGraphElement<HTMLButtonElement>('zoomOutButton'),
    zoomResetButton: requireRevisionGraphElement<HTMLButtonElement>('zoomResetButton'),
    zoomInButton: requireRevisionGraphElement<HTMLButtonElement>('zoomInButton')
  };
}

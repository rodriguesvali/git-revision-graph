interface RevisionGraphWebviewVirtualSceneLayers {
  readonly nodeLayer: { innerHTML: string };
  readonly edgeLayer: { innerHTML: string };
}

interface RevisionGraphWebviewVirtualSceneMarkup {
  readonly nodeMarkup: string;
  readonly edgeMarkup: string;
}

interface RevisionGraphWebviewVirtualSceneMarkupInput<Layout, Edge> {
  readonly visibleLayouts: readonly Layout[];
  readonly visibleEdges: readonly Edge[];
  readonly renderNodeMarkup: (layout: Layout) => string;
  readonly renderEdgeMarkup: (edge: Edge) => string;
}

function createRevisionGraphWebviewVirtualSceneMarkup<Layout, Edge>(
  input: RevisionGraphWebviewVirtualSceneMarkupInput<Layout, Edge>
): RevisionGraphWebviewVirtualSceneMarkup {
  return {
    nodeMarkup: input.visibleLayouts.map(input.renderNodeMarkup).join(''),
    edgeMarkup: input.visibleEdges.map(input.renderEdgeMarkup).join('')
  };
}

function commitRevisionGraphWebviewVirtualSceneDom(
  layers: RevisionGraphWebviewVirtualSceneLayers,
  markup: RevisionGraphWebviewVirtualSceneMarkup
): void {
  layers.nodeLayer.innerHTML = markup.nodeMarkup;
  layers.edgeLayer.innerHTML = markup.edgeMarkup;
}

function clearRevisionGraphWebviewVirtualSceneDom(
  layers: RevisionGraphWebviewVirtualSceneLayers
): void {
  commitRevisionGraphWebviewVirtualSceneDom(layers, { nodeMarkup: '', edgeMarkup: '' });
}

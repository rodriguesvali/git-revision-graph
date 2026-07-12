interface RevisionGraphWebviewVirtualSceneSelectableLayout {
  readonly hash: string;
}

interface RevisionGraphWebviewVirtualSceneSelectionInput<
  Layout extends RevisionGraphWebviewVirtualSceneSelectableLayout,
  Edge
> {
  readonly nodeCandidates: readonly Layout[];
  readonly containsSceneNode: (hash: string) => boolean;
  readonly isLayoutVisible: (layout: Layout) => boolean;
  readonly edgeCandidates: readonly Edge[];
  readonly isEdgeVisible: (edge: Edge, visibleHashes: ReadonlySet<string>) => boolean;
}

interface RevisionGraphWebviewVirtualSceneSelection<
  Layout extends RevisionGraphWebviewVirtualSceneSelectableLayout,
  Edge
> {
  readonly visibleLayouts: Layout[];
  readonly visibleHashes: Set<string>;
  readonly visibleEdges: Edge[];
}

function selectRevisionGraphWebviewVirtualScene<
  Layout extends RevisionGraphWebviewVirtualSceneSelectableLayout,
  Edge
>(
  input: RevisionGraphWebviewVirtualSceneSelectionInput<Layout, Edge>
): RevisionGraphWebviewVirtualSceneSelection<Layout, Edge> {
  const visibleLayouts = input.nodeCandidates.filter((layout) =>
    input.containsSceneNode(layout.hash) && input.isLayoutVisible(layout)
  );
  const visibleHashes = new Set(visibleLayouts.map((layout) => layout.hash));
  const visibleEdges = input.edgeCandidates.filter((edge) =>
    input.isEdgeVisible(edge, visibleHashes)
  );

  return { visibleLayouts, visibleHashes, visibleEdges };
}

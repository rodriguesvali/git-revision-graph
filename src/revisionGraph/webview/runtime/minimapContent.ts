interface RevisionGraphWebviewMinimapEdge {
  readonly from: string;
  readonly to: string;
}

interface RevisionGraphWebviewMinimapTransform {
  readonly scale: number;
  readonly mapX: (value: number) => number;
  readonly mapY: (value: number) => number;
}

interface RevisionGraphWebviewMinimapGeometry {
  readonly getNodeCenterX: (hash: string) => number;
  readonly getNodeTop: (hash: string) => number;
  readonly getNodeLeft: (hash: string) => number;
  readonly getNodeWidth: (hash: string) => number;
  readonly getNodeHeight: (hash: string) => number;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface RevisionGraphWebviewMinimapContent {
  readonly edgeMarkup: string;
  readonly nodeMarkup: string;
}

function renderRevisionGraphWebviewMinimapContent(
  edges: readonly RevisionGraphWebviewMinimapEdge[],
  nodeHashes: readonly string[],
  visibleNodeHashes: ReadonlySet<string>,
  headNodeHash: string | null,
  transform: RevisionGraphWebviewMinimapTransform,
  geometry: RevisionGraphWebviewMinimapGeometry
): RevisionGraphWebviewMinimapContent {
  return {
    edgeMarkup: edges
      .map((edge) => renderRevisionGraphWebviewMinimapEdge(edge, visibleNodeHashes, transform, geometry))
      .join(''),
    nodeMarkup: nodeHashes
      .map((hash) => renderRevisionGraphWebviewMinimapNode(hash, headNodeHash, transform, geometry))
      .join('')
  };
}

function renderRevisionGraphWebviewMinimapEdge(
  edge: RevisionGraphWebviewMinimapEdge,
  visibleNodeHashes: ReadonlySet<string>,
  transform: RevisionGraphWebviewMinimapTransform,
  geometry: RevisionGraphWebviewMinimapGeometry
): string {
  if (!visibleNodeHashes.has(edge.from) || !visibleNodeHashes.has(edge.to)) {
    return '';
  }

  const sourceX = transform.mapX(geometry.getNodeCenterX(edge.from) + geometry.offsetX);
  const sourceY = transform.mapY(
    geometry.getNodeTop(edge.from) + geometry.getNodeHeight(edge.from) / 2 + geometry.offsetY
  );
  const targetX = transform.mapX(geometry.getNodeCenterX(edge.to) + geometry.offsetX);
  const targetY = transform.mapY(
    geometry.getNodeTop(edge.to) + geometry.getNodeHeight(edge.to) / 2 + geometry.offsetY
  );
  return `<line class="minimap-edge" x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}"></line>`;
}

function renderRevisionGraphWebviewMinimapNode(
  hash: string,
  headNodeHash: string | null,
  transform: RevisionGraphWebviewMinimapTransform,
  geometry: RevisionGraphWebviewMinimapGeometry
): string {
  const left = geometry.getNodeLeft(hash) + geometry.offsetX;
  const top = geometry.getNodeTop(hash) + geometry.offsetY;
  const width = Math.max(2, geometry.getNodeWidth(hash) * transform.scale);
  const height = Math.max(2, geometry.getNodeHeight(hash) * transform.scale);
  const x = transform.mapX(left);
  const y = transform.mapY(top);
  const nodeClass = hash === headNodeHash ? 'minimap-node head' : 'minimap-node';
  return `<rect class="${nodeClass}" x="${x}" y="${y}" width="${width}" height="${height}" rx="1.5"></rect>`;
}

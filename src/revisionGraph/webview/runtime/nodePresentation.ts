interface RevisionGraphWebviewNodePresentationReference {
  readonly kind: string;
  readonly name: string;
}

interface RevisionGraphWebviewNodePresentationNode {
  readonly hash: string;
  readonly refs: readonly RevisionGraphWebviewNodePresentationReference[];
  readonly author?: string | null;
  readonly date?: string | null;
  readonly subject?: string | null;
}

interface RevisionGraphWebviewNodePresentationLayout {
  readonly width: number;
  readonly height: number;
  readonly defaultLeft: number;
  readonly defaultTop: number;
}

interface RevisionGraphWebviewNodePresentationReferenceTarget {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: string;
}

interface RevisionGraphWebviewNodePresentationFlowGovernance {
  readonly enabled: unknown;
}

function getRevisionGraphWebviewVisibleNodeReferences(
  node: RevisionGraphWebviewNodePresentationNode,
  isReferenceVisible: (reference: RevisionGraphWebviewNodePresentationReferenceTarget) => boolean
): RevisionGraphWebviewNodePresentationReference[] {
  return node.refs.filter((reference) => isReferenceVisible({
    id: createRevisionGraphWebviewNodeReferenceId(node.hash, reference.kind, reference.name),
    hash: node.hash,
    name: reference.name,
    kind: reference.kind
  }));
}

function getRevisionGraphWebviewNodePresentationClass(
  references: readonly RevisionGraphWebviewNodePresentationReference[]
): string {
  if (references.length === 0) {
    return 'node-structural';
  }

  const kinds = new Set(references.map((reference) => reference.kind));
  if (kinds.size === 1 && kinds.has('head')) {
    return 'node-head';
  }
  if (kinds.size === 1 && kinds.has('tag')) {
    return 'node-tag';
  }
  if (kinds.size === 1 && kinds.has('remote')) {
    return 'node-remote';
  }
  if (kinds.size === 1 && kinds.has('stash')) {
    return 'node-stash';
  }
  if (kinds.size === 1 && kinds.has('branch')) {
    return 'node-branch';
  }
  return 'node-mixed';
}

function formatRevisionGraphWebviewNodeSummary(
  node: RevisionGraphWebviewNodePresentationNode
): string {
  return node.hash.slice(0, 8);
}

function formatRevisionGraphWebviewNodeTitle(
  node: RevisionGraphWebviewNodePresentationNode,
  references: readonly RevisionGraphWebviewNodePresentationReference[]
): string {
  const referenceBlock = references.length > 0
    ? `Refs:\n${references.map((reference) => reference.name).join('\n')}\n\n`
    : '';
  const author = node.author || 'Unknown author';
  const date = node.date || 'Unknown date';
  const subject = node.subject || 'Structural commit';
  return `${referenceBlock}${node.hash}\n${subject}\n${author} on ${date}`;
}

function createRevisionGraphWebviewNodeRenderKey(
  node: RevisionGraphWebviewNodePresentationNode,
  layout: RevisionGraphWebviewNodePresentationLayout,
  visibleReferences: readonly RevisionGraphWebviewNodePresentationReference[],
  flowGovernance: RevisionGraphWebviewNodePresentationFlowGovernance | null
): string {
  return JSON.stringify({
    hash: node.hash,
    className: getRevisionGraphWebviewNodePresentationClass(visibleReferences),
    width: layout.width,
    height: layout.height,
    defaultLeft: layout.defaultLeft,
    defaultTop: layout.defaultTop,
    refs: visibleReferences.map((reference) => [reference.kind, reference.name]),
    flowGovernance,
    title: formatRevisionGraphWebviewNodeTitle(node, visibleReferences),
    summary: visibleReferences.length === 0 ? formatRevisionGraphWebviewNodeSummary(node) : ''
  });
}

function createRevisionGraphWebviewNodeReferenceId(hash: string, kind: string, name: string): string {
  return `${hash}::${kind}::${name}`;
}

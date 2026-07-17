interface RevisionGraphWebviewNodeMarkupInput {
  readonly node: RevisionGraphWebviewNodePresentationNode;
  readonly layout: RevisionGraphWebviewNodePresentationLayout;
  readonly nodeRenderKey: string;
  readonly visibleReferences: readonly RevisionGraphWebviewNodePresentationReference[];
  readonly getFlowKind: (referenceName: string) => string | null;
}

function renderRevisionGraphWebviewNodeMarkup(input: RevisionGraphWebviewNodeMarkupInput): string {
  const { node, layout, nodeRenderKey, visibleReferences } = input;
  const referenceLines = visibleReferences
    .map((reference) => renderRevisionGraphWebviewNodeReferenceMarkup(input, reference))
    .join('');
  const summary = visibleReferences.length === 0
    ? `<div class="node-summary">${escapeRevisionGraphWebviewNodeMarkupHtml(formatRevisionGraphWebviewNodeSummary(node))}</div>`
    : '';
  const nodeTitle = visibleReferences.length === 0
    ? ` title="${escapeRevisionGraphWebviewNodeMarkupHtml(formatRevisionGraphWebviewNodeTitle(node, visibleReferences))}"`
    : '';

  return `<div class="node ${getRevisionGraphWebviewNodePresentationClass(visibleReferences)}" data-node-hash="${escapeRevisionGraphWebviewNodeMarkupHtml(node.hash)}" data-node-render-key="${escapeRevisionGraphWebviewNodeMarkupHtml(nodeRenderKey)}" data-node-width="${layout.width}" data-node-height="${layout.height}" data-default-left="${layout.defaultLeft}" data-default-top="${layout.defaultTop}" style="left:${layout.defaultLeft}px; top:${layout.defaultTop}px; width:${layout.width}px"${nodeTitle}>` +
    '<button class="node-grip" type="button" data-node-grip="true" aria-label="Drag to rearrange horizontally" title="Drag to rearrange horizontally"></button>' +
    referenceLines +
    summary +
    '<span class="node-base-badge">(Base)</span>' +
  '</div>';
}

function renderRevisionGraphWebviewNodeReferenceMarkup(
  input: RevisionGraphWebviewNodeMarkupInput,
  reference: RevisionGraphWebviewNodePresentationReference
): string {
  const flowKind = input.getFlowKind(reference.name);
  const flowLabel = flowKind ? getRevisionGraphWebviewFlowKindLabel(flowKind) : '';
  const flowBadge = flowKind
    ? `<span class="flow-badge flow-kind-${escapeRevisionGraphWebviewNodeMarkupHtml(flowKind)}" role="img" aria-label="${escapeRevisionGraphWebviewNodeMarkupHtml(flowLabel)} branch type">${renderRevisionGraphWebviewFlowKindIcon(flowKind)}</span>`
    : '';
  const flowClass = flowKind
    ? ` flow-branch flow-kind-${escapeRevisionGraphWebviewNodeMarkupHtml(flowKind)}`
    : '';
  const referenceId = createRevisionGraphWebviewNodeReferenceId(
    input.node.hash,
    reference.kind,
    reference.name
  );

  return `<div class="ref-line kind-${escapeRevisionGraphWebviewNodeMarkupHtml(reference.kind)}${flowClass}" data-ref-id="${escapeRevisionGraphWebviewNodeMarkupHtml(referenceId)}" data-ref-name="${escapeRevisionGraphWebviewNodeMarkupHtml(reference.name)}" data-ref-kind="${escapeRevisionGraphWebviewNodeMarkupHtml(reference.kind)}" tabindex="0" aria-controls="referenceTooltip" aria-haspopup="dialog">${flowBadge}<span class="ref-name">${escapeRevisionGraphWebviewNodeMarkupHtml(reference.name)}</span></div>`;
}

function escapeRevisionGraphWebviewNodeMarkupHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function requireRevisionGraphElement<ElementType extends Element>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Revision Graph webview is missing required element #${id}.`);
  }
  // The generic maps the static shell id to the element subtype expected by
  // its caller; existence is validated here and all unsafety stays localized.
  return element as unknown as ElementType;
}

interface RevisionGraphWebviewRenderedElements {
  readonly nodeElements: Map<string, HTMLElement>;
  readonly edgeElements: Element[];
}

function collectRevisionGraphWebviewRenderedElements(root: ParentNode): RevisionGraphWebviewRenderedElements {
  const nodeEntries = Array.from(root.querySelectorAll<HTMLElement>('[data-node-hash]'))
    .map((element) => [element.getAttribute('data-node-hash'), element] as const)
    .filter((entry): entry is readonly [string, HTMLElement] => entry[0] !== null);
  return {
    nodeElements: new Map(nodeEntries),
    edgeElements: Array.from(root.querySelectorAll('[data-edge-from]'))
  };
}

function requireRevisionGraphElement<ElementType extends Element>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Revision Graph webview is missing required element #${id}.`);
  }
  // The generic maps the static shell id to the element subtype expected by
  // its caller; existence is validated here and all unsafety stays localized.
  return element as unknown as ElementType;
}

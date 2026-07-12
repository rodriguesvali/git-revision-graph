function requireRevisionGraphElement<ElementType extends Element>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Revision Graph webview is missing required element #${id}.`);
  }
  return element as unknown as ElementType;
}

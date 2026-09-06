interface RevisionGraphFlowPreviewParts {
  name: HTMLElement; context: HTMLElement; effects: HTMLElement; status: HTMLElement;
  toggle: HTMLButtonElement; details: HTMLElement;
}
const revisionGraphFlowPreviewParts = new WeakMap<HTMLElement, RevisionGraphFlowPreviewParts>();

function createRevisionGraphFlowPreviewElement(id: string): HTMLElement {
  const root = document.createElement('section');
  root.id = id;
  root.className = 'flow-form-preview';
  root.setAttribute('aria-label', 'Operation preview');
  const label = document.createElement('div');
  label.className = 'flow-preview-label';
  label.textContent = 'New branch';
  const name = document.createElement('code');
  name.className = 'flow-preview-name';
  const context = document.createElement('div');
  context.className = 'flow-preview-context';
  const effects = document.createElement('div');
  effects.className = 'flow-preview-effects';
  const status = document.createElement('div');
  status.className = 'flow-preview-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'flow-preview-toggle';
  toggle.textContent = 'Validation details and full name';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', id + 'Details');
  const details = document.createElement('div');
  details.id = id + 'Details';
  details.className = 'flow-preview-details';
  details.tabIndex = 0;
  details.hidden = true;
  toggle.addEventListener('click', () => {
    details.hidden = !details.hidden;
    toggle.setAttribute('aria-expanded', String(!details.hidden));
  });
  root.append(label, name, context, effects, status, toggle, details);
  revisionGraphFlowPreviewParts.set(root, { name, context, effects, status, toggle, details });
  return root;
}

function setRevisionGraphFlowPreviewPending(root: HTMLElement, retain: boolean): void {
  const parts = revisionGraphFlowPreviewParts.get(root);
  if (!parts) { if (!retain) root.textContent = 'Loading operation preview…'; return; }
  if (!retain) {
    parts.name.textContent = 'Preparing preview…';
    parts.context.textContent = '';
    parts.effects.textContent = '';
    parts.details.textContent = '';
    parts.details.hidden = true;
    parts.toggle.setAttribute('aria-expanded', 'false');
  }
  parts.status.textContent = retain ? 'Checking updated name…' : 'Loading operation preview…';
  parts.status.dataset.state = 'neutral';
  parts.status.setAttribute('aria-busy', 'true');
}

function renderRevisionGraphFlowPreview(root: HTMLElement, message: Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text' | 'summary'>): void {
  const parts = revisionGraphFlowPreviewParts.get(root);
  if (!parts) { root.textContent = message.text; return; }
  const summary = message.summary;
  if (summary) {
    parts.name.textContent = summary.branchName;
    parts.context.textContent = summary.context;
    parts.effects.textContent = summary.effects;
    parts.status.textContent = summary.validation;
    parts.status.dataset.state = summary.validationState;
    parts.details.textContent = `${summary.branchName}\n${summary.context}\n${summary.effects}\n\n${summary.validation}\n${summary.details}`;
  } else {
    parts.name.textContent = 'Preview unavailable';
    parts.context.textContent = '';
    parts.effects.textContent = '';
    parts.status.textContent = message.text;
    parts.status.dataset.state = 'neutral';
    parts.details.textContent = message.text;
  }
  parts.status.setAttribute('aria-busy', 'false');
}

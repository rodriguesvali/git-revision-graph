interface RevisionGraphWebviewFlowEqualizationReference {
  readonly refName: string;
  readonly kind?: string;
}

interface RevisionGraphWebviewFlowEqualizationDialogDependencies {
  readonly closeContextMenu: () => void;
  readonly getOrigins: (targetRefName: string) => readonly string[];
  readonly prepare: (targetRefName: string, originRefName: string, description: string) => void;
}

interface RevisionGraphWebviewFlowEqualizationDialogController {
  readonly show: (target: RevisionGraphWebviewTarget) => void;
  readonly close: () => void;
}

interface RevisionGraphWebviewFlowEqualizationDialogElements {
  readonly backdrop: HTMLElement;
  readonly originSelect: HTMLSelectElement;
  readonly descriptionInput: HTMLTextAreaElement;
  readonly error: HTMLElement;
}

function getRevisionGraphWebviewFlowEqualizationOrigins(
  active: boolean,
  references: readonly RevisionGraphWebviewFlowEqualizationReference[] | undefined,
  targetRefName: string
): string[] {
  if (!active || !Array.isArray(references)) {
    return [];
  }
  const originsByName = new Map<string, string>();
  for (const reference of references) {
    if (
      reference
      && reference.refName !== targetRefName
      && (reference.kind === 'main' || reference.kind === 'release')
    ) {
      originsByName.set(reference.refName, reference.kind);
    }
  }
  return [...originsByName.entries()]
    .sort(([leftName, leftKind], [rightName, rightKind]) => {
      if (leftKind !== rightKind) {
        return leftKind === 'main' ? -1 : 1;
      }
      return leftName.localeCompare(rightName);
    })
    .map(([refName]) => refName);
}

function createRevisionGraphWebviewFlowEqualizationDialogController(
  dependencies: RevisionGraphWebviewFlowEqualizationDialogDependencies
): RevisionGraphWebviewFlowEqualizationDialogController {
  let elements: RevisionGraphWebviewFlowEqualizationDialogElements | null = null;
  let target: RevisionGraphWebviewTarget | null = null;

  function show(nextTarget: RevisionGraphWebviewTarget): void {
    dependencies.closeContextMenu();
    const dialog = ensureDialog();
    target = nextTarget;
    dialog.originSelect.textContent = '';
    const origins = dependencies.getOrigins(nextTarget.name);
    if (origins.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No eligible origin branches';
      option.disabled = true;
      option.selected = true;
      dialog.originSelect.appendChild(option);
    } else {
      for (const origin of origins) {
        const option = document.createElement('option');
        option.value = origin;
        option.textContent = origin;
        dialog.originSelect.appendChild(option);
      }
    }
    dialog.descriptionInput.value = '';
    setError('');
    dialog.backdrop.hidden = false;
    document.body.classList.add('flow-dialog-open');
    window.setTimeout(() => dialog.originSelect.focus(), 0);
  }

  function close(): void {
    if (!elements) {
      return;
    }
    elements.backdrop.hidden = true;
    target = null;
    document.body.classList.remove('flow-dialog-open');
  }

  function submit(event: Event): void {
    event.preventDefault();
    const dialog = ensureDialog();
    const originRefName = dialog.originSelect.value;
    const description = dialog.descriptionInput.value.trim();
    if (!originRefName) {
      setError('Origin branch is required.');
      dialog.originSelect.focus();
      return;
    }
    if (!description) {
      setError('Description is required.');
      dialog.descriptionInput.focus();
      return;
    }
    if (!target) {
      close();
      return;
    }
    const targetRefName = target.name;
    close();
    dependencies.prepare(targetRefName, originRefName, description);
  }

  function setError(message: string): void {
    const error = ensureDialog().error;
    error.textContent = message;
    error.hidden = !message;
  }

  function ensureDialog(): RevisionGraphWebviewFlowEqualizationDialogElements {
    if (elements) {
      return elements;
    }
    const backdrop = document.createElement('div');
    backdrop.id = 'flowEqualizationDialog';
    backdrop.className = 'flow-dialog-backdrop';
    backdrop.hidden = true;

    const form = document.createElement('form');
    form.className = 'flow-dialog';
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');
    form.setAttribute('aria-labelledby', 'flowEqualizationDialogTitle');

    const title = document.createElement('h2');
    title.id = 'flowEqualizationDialogTitle';
    title.className = 'flow-dialog-title';
    title.textContent = 'Prepare Equalization';
    form.appendChild(title);

    const originLabel = document.createElement('label');
    originLabel.className = 'flow-form-field';
    originLabel.setAttribute('for', 'flowEqualizationOriginInput');
    const originText = document.createElement('span');
    originText.className = 'flow-form-label';
    originText.textContent = 'Origin branch *';
    const originSelect = document.createElement('select');
    originSelect.id = 'flowEqualizationOriginInput';
    originSelect.className = 'flow-form-input';
    originSelect.required = true;
    originSelect.setAttribute('aria-required', 'true');
    originLabel.append(originText, originSelect);
    form.appendChild(originLabel);

    const descriptionLabel = document.createElement('label');
    descriptionLabel.className = 'flow-form-field';
    descriptionLabel.setAttribute('for', 'flowEqualizationDescriptionInput');
    const descriptionText = document.createElement('span');
    descriptionText.className = 'flow-form-label';
    descriptionText.textContent = 'Description *';
    const descriptionInput = document.createElement('textarea');
    descriptionInput.id = 'flowEqualizationDescriptionInput';
    descriptionInput.className = 'flow-form-input flow-form-textarea';
    descriptionInput.required = true;
    descriptionInput.setAttribute('aria-required', 'true');
    descriptionInput.maxLength = 2048;
    descriptionLabel.append(descriptionText, descriptionInput);
    form.appendChild(descriptionLabel);

    const error = document.createElement('div');
    error.className = 'flow-form-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    form.appendChild(error);

    const actions = document.createElement('div');
    actions.className = 'flow-dialog-actions';
    const cancelButton = document.createElement('button');
    cancelButton.className = 'flow-dialog-button';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    const submitButton = document.createElement('button');
    submitButton.className = 'flow-dialog-button primary';
    submitButton.type = 'submit';
    submitButton.textContent = 'Prepare Equalization';
    actions.append(cancelButton, submitButton);
    form.appendChild(actions);
    backdrop.appendChild(form);
    document.body.appendChild(backdrop);

    elements = { backdrop, originSelect, descriptionInput, error };
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        close();
      }
    });
    cancelButton.addEventListener('click', close);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    form.addEventListener('submit', submit);
    return elements;
  }

  return { show, close };
}

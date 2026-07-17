type RevisionGraphWebviewFlowBranchInputName =
  | 'taskDevInput'
  | 'shortNameInput'
  | 'nameInput'
  | 'descriptionInput';

interface RevisionGraphWebviewFlowBranchValidationError {
  readonly message: string;
  readonly input: RevisionGraphWebviewFlowBranchInputName;
}

interface RevisionGraphWebviewFlowBranchDialogCopy {
  readonly title: string;
  readonly submitLabel: string;
}

interface RevisionGraphWebviewFlowBranchDialogElements {
  readonly backdrop: HTMLElement;
  readonly title: HTMLElement;
  readonly submitButton: HTMLButtonElement;
  readonly nameLabel: HTMLLabelElement;
  readonly nameInput: HTMLInputElement;
  readonly taskDevLabel: HTMLLabelElement;
  readonly taskDevText: HTMLElement;
  readonly taskDevInput: HTMLInputElement;
  readonly shortNameLabel: HTMLLabelElement;
  readonly shortNameInput: HTMLInputElement;
  readonly descriptionInput: HTMLTextAreaElement;
  readonly descriptionAiButton: HTMLButtonElement;
  readonly error: HTMLElement;
}

interface RevisionGraphWebviewFlowBranchDialogController {
  readonly show: (
    target: RevisionGraphWebviewTarget,
    branchKind: RevisionGraphWebviewFlowBranchKind
  ) => void;
  readonly close: () => void;
  readonly showImprovementResult: (
    result: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'set-flow-ai-text-result' }>
  ) => void;
}

interface RevisionGraphWebviewFlowBranchDialogDependencies {
  readonly closeContextMenu: () => void;
  readonly submit: (
    target: RevisionGraphWebviewTarget,
    branchKind: RevisionGraphWebviewFlowBranchKind,
    name: string,
    description: string
  ) => void;
  readonly improveReleaseText: (
    sourceRefName: string,
    releaseName: string,
    text: string
  ) => number;
  readonly cancelImprovement: (requestId: number) => void;
}

function showRevisionGraphWebviewFlowBranchForm(
  message: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-branch-form' }>,
  targets: readonly RevisionGraphWebviewTarget[],
  showForm: (target: RevisionGraphWebviewTarget, branchKind: RevisionGraphWebviewFlowBranchKind) => void
): void {
  const target = targets.find((candidate) => candidate.kind !== 'commit' && candidate.name === message.sourceRefName);
  if (target) {
    showForm(target, message.branchKind);
  }
}

function getRevisionGraphWebviewFlowBranchValidationError(
  branchKind: RevisionGraphWebviewFlowBranchKind,
  taskDev: string,
  shortName: string,
  name: string,
  description: string
): RevisionGraphWebviewFlowBranchValidationError | null {
  const usesStructuredName = isRevisionGraphWebviewStructuredFlowBranchKind(branchKind);
  if (branchKind === 'task' && !/^[0-9]+$/.test(taskDev)) {
    return { message: 'Dev Task must be a number.', input: 'taskDevInput' };
  }
  if ((branchKind === 'hotfix' || branchKind === 'bug') && !taskDev) {
    const label = branchKind === 'hotfix' ? 'Hotfix ID' : 'Bug ID';
    return { message: label + ' is required.', input: 'taskDevInput' };
  }
  if (usesStructuredName && !shortName) {
    return { message: 'Short name is required.', input: 'shortNameInput' };
  }
  if (!usesStructuredName && !name) {
    return { message: 'Name is required.', input: 'nameInput' };
  }
  if (!description) {
    return { message: 'Description is required.', input: 'descriptionInput' };
  }
  return null;
}

function createRevisionGraphWebviewFlowBranchDialogController(
  dependencies: RevisionGraphWebviewFlowBranchDialogDependencies
): RevisionGraphWebviewFlowBranchDialogController {
  let elements: RevisionGraphWebviewFlowBranchDialogElements | null = null;
  let target: RevisionGraphWebviewTarget | null = null;
  let branchKind: RevisionGraphWebviewFlowBranchKind | null = null;
  let pendingRequestId: number | undefined;

  function show(nextTarget: RevisionGraphWebviewTarget, nextBranchKind: RevisionGraphWebviewFlowBranchKind): void {
    dependencies.closeContextMenu();
    cancelPendingImprovement();
    const dialog = ensureDialog();
    const copy = getRevisionGraphWebviewFlowBranchDialogCopy(nextBranchKind);
    const usesStructuredName = isRevisionGraphWebviewStructuredFlowBranchKind(nextBranchKind);
    target = nextTarget;
    branchKind = nextBranchKind;
    dialog.title.textContent = copy.title;
    dialog.submitButton.textContent = copy.submitLabel;
    dialog.nameLabel.hidden = usesStructuredName;
    dialog.nameInput.required = !usesStructuredName;
    dialog.nameInput.setAttribute('aria-required', String(!usesStructuredName));
    dialog.taskDevLabel.hidden = !usesStructuredName;
    dialog.taskDevInput.required = usesStructuredName;
    dialog.taskDevInput.setAttribute('aria-required', String(usesStructuredName));
    dialog.taskDevText.textContent = nextBranchKind === 'bug'
      ? 'Bug ID *'
      : nextBranchKind === 'hotfix' ? 'Hotfix ID *' : 'Dev Task *';
    dialog.taskDevInput.inputMode = nextBranchKind === 'task' ? 'numeric' : 'text';
    dialog.shortNameLabel.hidden = !usesStructuredName;
    dialog.shortNameInput.required = usesStructuredName;
    dialog.shortNameInput.setAttribute('aria-required', String(usesStructuredName));
    dialog.nameInput.value = '';
    dialog.taskDevInput.value = '';
    dialog.shortNameInput.value = '';
    dialog.descriptionInput.value = '';
    dialog.descriptionAiButton.hidden = nextBranchKind !== 'release';
    syncAiAction();
    setError('');
    dialog.backdrop.hidden = false;
    document.body.classList.add('flow-dialog-open');
    window.setTimeout(() => (usesStructuredName ? dialog.taskDevInput : dialog.nameInput).focus(), 0);
  }

  function close(): void {
    if (!elements) {
      return;
    }
    cancelPendingImprovement();
    elements.backdrop.hidden = true;
    target = null;
    branchKind = null;
    document.body.classList.remove('flow-dialog-open');
  }

  function showImprovementResult(
    result: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'set-flow-ai-text-result' }>
  ): void {
    if (result.surface !== 'release' || result.field !== 'description'
      || result.requestId !== pendingRequestId) return;
    pendingRequestId = undefined;
    syncAiAction();
    if (result.status === 'ready' && typeof result.content === 'string') {
      ensureDialog().descriptionInput.value = result.content;
      syncAiAction();
    }
  }

  function improveReleaseText(): void {
    const dialog = ensureDialog();
    if (!target || branchKind !== 'release') return;
    const releaseName = dialog.nameInput.value.trim();
    const text = dialog.descriptionInput.value.trim();
    if (!releaseName || !text) return;
    cancelPendingImprovement();
    pendingRequestId = dependencies.improveReleaseText(target.name, releaseName, text);
    syncAiAction();
  }

  function cancelPendingImprovement(): void {
    if (pendingRequestId === undefined) return;
    const requestId = pendingRequestId;
    pendingRequestId = undefined;
    dependencies.cancelImprovement(requestId);
  }

  function handleReleaseInput(): void {
    cancelPendingImprovement();
    syncAiAction();
  }

  function syncAiAction(): void {
    if (!elements) return;
    const enabled = branchKind === 'release'
      && !!target
      && !!elements.nameInput.value.trim()
      && !!elements.descriptionInput.value.trim();
    setRevisionGraphWebviewFlowAiTextButtonState(
      elements.descriptionAiButton,
      enabled,
      pendingRequestId !== undefined
    );
  }

  function submit(event: Event): void {
    event.preventDefault();
    const dialog = ensureDialog();
    if (!target || !branchKind) {
      close();
      return;
    }
    const taskDev = dialog.taskDevInput.value.trim();
    const shortName = dialog.shortNameInput.value.trim();
    const name = isRevisionGraphWebviewStructuredFlowBranchKind(branchKind)
      ? taskDev + '-' + shortName
      : dialog.nameInput.value.trim();
    const description = dialog.descriptionInput.value.trim();
    const validationError = getRevisionGraphWebviewFlowBranchValidationError(
      branchKind,
      taskDev,
      shortName,
      name,
      description
    );
    if (validationError) {
      setError(validationError.message);
      dialog[validationError.input].focus();
      return;
    }
    dependencies.submit(target, branchKind, name, description);
    close();
  }

  function setError(message: string): void {
    const error = ensureDialog().error;
    error.textContent = message;
    error.hidden = !message;
  }

  function ensureDialog(): RevisionGraphWebviewFlowBranchDialogElements {
    if (elements) {
      return elements;
    }
    const backdrop = document.createElement('div');
    backdrop.id = 'flowBranchDialog';
    backdrop.className = 'flow-dialog-backdrop';
    backdrop.hidden = true;

    const form = document.createElement('form');
    form.className = 'flow-dialog';
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');
    form.setAttribute('aria-labelledby', 'flowBranchDialogTitle');

    const title = document.createElement('h2');
    title.id = 'flowBranchDialogTitle';
    title.className = 'flow-dialog-title';
    form.appendChild(title);

    const name = createRevisionGraphWebviewFlowBranchTextField('flowBranchNameInput', 'Name *', 240);
    name.label.id = 'flowBranchNameLabel';
    form.appendChild(name.label);

    const taskDev = createRevisionGraphWebviewFlowBranchTextField('flowBranchTaskDevInput', 'Dev Task *', 40);
    taskDev.label.id = 'flowBranchTaskDevLabel';
    taskDev.label.hidden = true;
    taskDev.input.inputMode = 'numeric';
    form.appendChild(taskDev.label);

    const shortName = createRevisionGraphWebviewFlowBranchTextField('flowBranchShortNameInput', 'Short name *', 199);
    shortName.label.id = 'flowBranchShortNameLabel';
    shortName.label.hidden = true;
    form.appendChild(shortName.label);

    const descriptionLabel = document.createElement('label');
    descriptionLabel.className = 'flow-form-field';
    descriptionLabel.setAttribute('for', 'flowBranchDescriptionInput');
    const descriptionText = document.createElement('span');
    descriptionText.className = 'flow-form-label';
    descriptionText.textContent = 'Description *';
    const descriptionInput = document.createElement('textarea');
    descriptionInput.id = 'flowBranchDescriptionInput';
    descriptionInput.className = 'flow-form-input flow-form-textarea';
    descriptionInput.required = true;
    descriptionInput.setAttribute('aria-required', 'true');
    descriptionInput.maxLength = 2048;
    const descriptionRow = document.createElement('div');
    descriptionRow.className = 'flow-ai-field-row';
    const descriptionAiButton = createRevisionGraphWebviewFlowAiTextButton('Improve with AI');
    descriptionAiButton.hidden = true;
    descriptionRow.append(descriptionInput, descriptionAiButton);
    descriptionLabel.append(descriptionText, descriptionRow);
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
    submitButton.textContent = 'Create Release';
    actions.append(cancelButton, submitButton);
    form.appendChild(actions);
    backdrop.appendChild(form);
    document.body.appendChild(backdrop);

    elements = {
      backdrop,
      title,
      submitButton,
      nameLabel: name.label,
      nameInput: name.input,
      taskDevLabel: taskDev.label,
      taskDevText: taskDev.text,
      taskDevInput: taskDev.input,
      shortNameLabel: shortName.label,
      shortNameInput: shortName.input,
      descriptionInput,
      descriptionAiButton,
      error
    };
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        close();
      }
    });
    cancelButton.addEventListener('click', close);
    descriptionAiButton.addEventListener('click', improveReleaseText);
    name.input.addEventListener('input', handleReleaseInput);
    descriptionInput.addEventListener('input', handleReleaseInput);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    form.addEventListener('submit', submit);
    return elements;
  }

  return { show, close, showImprovementResult };
}

function createRevisionGraphWebviewFlowBranchTextField(
  inputId: string,
  labelText: string,
  maxLength: number
): { readonly label: HTMLLabelElement; readonly text: HTMLElement; readonly input: HTMLInputElement } {
  const label = document.createElement('label');
  label.className = 'flow-form-field';
  label.setAttribute('for', inputId);
  const text = document.createElement('span');
  text.className = 'flow-form-label';
  text.textContent = labelText;
  const input = document.createElement('input');
  input.id = inputId;
  input.className = 'flow-form-input';
  input.type = 'text';
  input.required = true;
  input.setAttribute('aria-required', 'true');
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  label.append(text, input);
  return { label, text, input };
}

function isRevisionGraphWebviewStructuredFlowBranchKind(branchKind: RevisionGraphWebviewFlowBranchKind): boolean {
  return branchKind === 'task' || branchKind === 'bug' || branchKind === 'hotfix';
}

function getRevisionGraphWebviewFlowBranchDialogCopy(
  branchKind: RevisionGraphWebviewFlowBranchKind
): RevisionGraphWebviewFlowBranchDialogCopy {
  if (branchKind === 'task') {
    return { title: 'Start New Task', submitLabel: 'Create Task' };
  }
  if (branchKind === 'feature') {
    return { title: 'Start New Feature', submitLabel: 'Create Feature' };
  }
  if (branchKind === 'hotfix') {
    return { title: 'Start New Hot Fix', submitLabel: 'Create Hot Fix' };
  }
  if (branchKind === 'bug') {
    return { title: 'Start New Bug', submitLabel: 'Create Bug' };
  }
  return { title: 'Start New Release', submitLabel: 'Create Release' };
}

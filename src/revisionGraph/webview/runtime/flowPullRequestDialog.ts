interface RevisionGraphWebviewFlowPullRequestDialogDependencies {
  readonly closeContextMenu: () => void;
  readonly getTargets: (sourceRefName: string) => readonly RevisionGraphWebviewFlowPullRequestTarget[];
  readonly requestContext: (sourceRefName: string, targetRefName: string) => void;
  readonly improveText: (
    sourceRefName: string,
    targetRefName: string,
    field: 'title' | 'description',
    title: string,
    description: string
  ) => number;
  readonly cancelImprovement: (requestId: number, field: 'title' | 'description') => void;
  readonly openUrl: (
    sourceRefName: string,
    targetRefName: string,
    title: string,
    description: string
  ) => void;
}

interface RevisionGraphWebviewFlowPullRequestDialogController {
  readonly open: (target: RevisionGraphWebviewTarget) => void;
  readonly showContext: (
    context: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-pr-context' }>
  ) => void;
  readonly showImprovementResult: (
    result: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'set-flow-ai-text-result' }>
  ) => void;
  readonly close: () => void;
}

interface RevisionGraphWebviewFlowPullRequestDialogElements {
  readonly backdrop: HTMLElement;
  readonly flow: HTMLElement;
  readonly targetLabel: HTMLLabelElement;
  readonly targetSelect: HTMLSelectElement;
  readonly titleInput: HTMLInputElement;
  readonly descriptionInput: HTMLTextAreaElement;
  readonly titleAiButton: HTMLButtonElement;
  readonly descriptionAiButton: HTMLButtonElement;
  readonly warning: HTMLElement;
  readonly openButton: HTMLButtonElement;
}

function getRevisionGraphWebviewFlowPullRequestWarning(
  sourceRefName: string,
  target: RevisionGraphWebviewFlowPullRequestTarget
): string {
  if (target.status === 'production-not-ancestor') {
    return 'Production promotion aborted: production contains commits missing from this source branch. '
      + 'Synchronize or equalize and validate the source before opening the Pull Request.';
  }
  if (target.status === 'production-out-of-sync') {
    return 'Production promotion aborted: the local production branch is not synchronized with its remote. '
      + 'Synchronize production, refresh the graph, and retry.';
  }
  if (target.status === 'not-ahead') {
    return sourceRefName + ' has no commits ahead of ' + target.targetRefName + '. Choose another release.';
  }
  if (target.status === 'unknown') {
    return 'Could not verify whether this branch is eligible for the selected Pull Request target.';
  }
  return '';
}

function createRevisionGraphWebviewFlowPullRequestDialogController(
  dependencies: RevisionGraphWebviewFlowPullRequestDialogDependencies
): RevisionGraphWebviewFlowPullRequestDialogController {
  let elements: RevisionGraphWebviewFlowPullRequestDialogElements | null = null;
  let sourceRefName = '';
  let targetRefName = '';
  let contextReady = false;
  const pendingRequestIds: Partial<Record<'title' | 'description', number>> = {};

  function open(target: RevisionGraphWebviewTarget): void {
    dependencies.closeContextMenu();
    cancelPendingImprovements();
    const dialog = ensureDialog();
    sourceRefName = target.name;
    targetRefName = '';
    const targets = dependencies.getTargets(sourceRefName);
    initializeRevisionGraphWebviewFlowPullRequestTargetSelect(dialog.targetSelect, targets);
    dialog.targetLabel.hidden = false;
    dialog.flow.textContent = sourceRefName + ' -> select a release';
    dialog.titleInput.value = '';
    dialog.descriptionInput.value = '';
    setWarning(targets.length > 0 ? '' : 'No release branch is available as a Pull Request target.');
    setActionsEnabled(false);
    dialog.backdrop.hidden = false;
    document.body.classList.add('flow-dialog-open');
    window.setTimeout(() => dialog.targetSelect.focus(), 0);
  }

  function showContext(
    context: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-pr-context' }>
  ): void {
    const dialog = ensureDialog();
    if (!dialog.backdrop.hidden && (
      sourceRefName !== context.sourceRefName || targetRefName !== context.targetRefName
    )) {
      return;
    }
    if (dialog.backdrop.hidden) {
      sourceRefName = context.sourceRefName;
      targetRefName = context.targetRefName;
      dialog.targetSelect.textContent = '';
      const option = document.createElement('option');
      option.value = context.targetRefName;
      option.textContent = context.targetRefName;
      dialog.targetSelect.appendChild(option);
      dialog.targetLabel.hidden = true;
      dialog.flow.textContent = context.sourceRefName + ' -> ' + context.targetRefName;
      dialog.backdrop.hidden = false;
      document.body.classList.add('flow-dialog-open');
    }
    dialog.titleInput.value = context.title;
    dialog.descriptionInput.value = context.description;
    setWarning('');
    setActionsEnabled(true);
  }

  function showImprovementResult(
    result: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'set-flow-ai-text-result' }>
  ): void {
    if (result.surface !== 'pull-request' || pendingRequestIds[result.field] !== result.requestId) {
      return;
    }
    delete pendingRequestIds[result.field];
    const dialog = ensureDialog();
    if (result.status !== 'ready' || typeof result.content !== 'string') {
      syncActions();
      return;
    }
    if (result.field === 'title') dialog.titleInput.value = result.content;
    else dialog.descriptionInput.value = result.content;
    syncActions();
  }

  function close(): void {
    if (!elements) {
      return;
    }
    cancelPendingImprovements();
    elements.backdrop.hidden = true;
    sourceRefName = '';
    targetRefName = '';
    contextReady = false;
    document.body.classList.remove('flow-dialog-open');
  }

  function applyTargetSelection(): void {
    const dialog = ensureDialog();
    cancelPendingImprovements();
    const candidate = dependencies.getTargets(sourceRefName).find((target) =>
      target.targetRefName === dialog.targetSelect.value
    );
    targetRefName = candidate ? candidate.targetRefName : '';
    dialog.targetSelect.value = targetRefName;
    dialog.flow.textContent = targetRefName
      ? sourceRefName + ' -> ' + targetRefName
      : sourceRefName + ' -> no release available';
    dialog.titleInput.value = '';
    dialog.descriptionInput.value = '';
    if (!candidate) {
      setWarning('No release branch is available as a Pull Request target.');
      setActionsEnabled(false);
      return;
    }
    setActionsEnabled(false);
    dependencies.requestContext(sourceRefName, targetRefName);
    setWarning(getRevisionGraphWebviewFlowPullRequestWarning(sourceRefName, candidate));
  }

  function improveField(field: 'title' | 'description'): void {
    const dialog = ensureDialog();
    if (!sourceRefName || !targetRefName
      || !dialog.titleInput.value.trim() || !dialog.descriptionInput.value.trim()) return;
    cancelPendingImprovement(field);
    const requestId = dependencies.improveText(
      sourceRefName,
      targetRefName,
      field,
      dialog.titleInput.value.trim(),
      dialog.descriptionInput.value.trim()
    );
    pendingRequestIds[field] = requestId;
    syncActions();
  }

  function cancelPendingImprovement(field: 'title' | 'description'): void {
    const requestId = pendingRequestIds[field];
    if (requestId === undefined) return;
    delete pendingRequestIds[field];
    dependencies.cancelImprovement(requestId, field);
  }

  function cancelPendingImprovements(): void {
    cancelPendingImprovement('title');
    cancelPendingImprovement('description');
  }

  function handleFieldInput(field: 'title' | 'description'): void {
    cancelPendingImprovement(field);
    syncActions();
  }

  function setWarning(message: string): void {
    const warning = ensureDialog().warning;
    warning.textContent = message;
    warning.hidden = !message;
  }

  function setActionsEnabled(enabled: boolean): void {
    contextReady = enabled;
    syncActions();
  }

  function syncActions(): void {
    const dialog = ensureDialog();
    const hasTitle = contextReady && !!dialog.titleInput.value.trim();
    const hasDescription = contextReady && !!dialog.descriptionInput.value.trim();
    setRevisionGraphWebviewFlowAiTextButtonState(
      dialog.titleAiButton,
      hasTitle && hasDescription,
      pendingRequestIds.title !== undefined
    );
    setRevisionGraphWebviewFlowAiTextButtonState(
      dialog.descriptionAiButton,
      hasTitle && hasDescription,
      pendingRequestIds.description !== undefined
    );
    dialog.openButton.disabled = !hasTitle || !hasDescription;
  }

  function ensureDialog(): RevisionGraphWebviewFlowPullRequestDialogElements {
    if (elements) {
      return elements;
    }
    const backdrop = document.createElement('div');
    backdrop.id = 'flowPullRequestContextDialog';
    backdrop.className = 'flow-dialog-backdrop';
    backdrop.hidden = true;

    const dialog = document.createElement('div');
    dialog.className = 'flow-dialog flow-pr-context-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'flowPullRequestContextDialogTitle');

    const heading = document.createElement('h2');
    heading.id = 'flowPullRequestContextDialogTitle';
    heading.className = 'flow-dialog-title';
    heading.textContent = 'Promotion Pull Request Context';
    dialog.appendChild(heading);

    const introduction = document.createElement('p');
    introduction.className = 'flow-dialog-description';
    introduction.textContent = 'Review and improve the generated context before opening your Pull Request.';
    dialog.appendChild(introduction);

    const targetLabel = document.createElement('label');
    targetLabel.className = 'flow-form-field';
    targetLabel.setAttribute('for', 'flowPullRequestTargetSelect');
    const targetText = document.createElement('span');
    targetText.className = 'flow-form-label';
    targetText.textContent = 'Target release';
    const targetSelect = document.createElement('select');
    targetSelect.id = 'flowPullRequestTargetSelect';
    targetSelect.className = 'flow-form-input';
    targetLabel.append(targetText, targetSelect);
    dialog.appendChild(targetLabel);

    const flowField = document.createElement('div');
    flowField.className = 'flow-form-field';
    const flowLabel = document.createElement('span');
    flowLabel.className = 'flow-form-label';
    flowLabel.textContent = 'Flow';
    const flow = document.createElement('div');
    flow.className = 'flow-pr-context-flow';
    flowField.append(flowLabel, flow);
    dialog.appendChild(flowField);

    const titleField = createRevisionGraphWebviewFlowPullRequestContextField(
      'Title',
      'flowPullRequestTitleInput',
      false
    );
    const descriptionField = createRevisionGraphWebviewFlowPullRequestContextField(
      'Description',
      'flowPullRequestDescriptionInput',
      true
    );
    dialog.append(titleField.container, descriptionField.container);

    const warning = document.createElement('div');
    warning.className = 'flow-pr-context-warning';
    warning.setAttribute('role', 'alert');
    warning.hidden = true;
    dialog.appendChild(warning);

    const actions = document.createElement('div');
    actions.className = 'flow-dialog-actions';
    const closeButton = document.createElement('button');
    closeButton.className = 'flow-dialog-button';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    const openButton = document.createElement('button');
    openButton.className = 'flow-dialog-button primary';
    openButton.type = 'button';
    openButton.textContent = 'Open Pull Request';
    actions.append(closeButton, openButton);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    elements = {
      backdrop,
      flow,
      targetLabel,
      targetSelect,
      titleInput: titleField.input as HTMLInputElement,
      descriptionInput: descriptionField.input as HTMLTextAreaElement,
      titleAiButton: titleField.aiButton,
      descriptionAiButton: descriptionField.aiButton,
      warning,
      openButton
    };
    titleField.aiButton.addEventListener('click', () => improveField('title'));
    descriptionField.aiButton.addEventListener('click', () => improveField('description'));
    titleField.input.addEventListener('input', () => handleFieldInput('title'));
    descriptionField.input.addEventListener('input', () => handleFieldInput('description'));
    targetSelect.addEventListener('change', applyTargetSelection);
    openButton.addEventListener('click', () => {
      if (sourceRefName && targetRefName) {
        const title = elements?.titleInput.value.trim();
        const description = elements?.descriptionInput.value.trim();
        if (title && description) dependencies.openUrl(sourceRefName, targetRefName, title, description);
      }
    });
    closeButton.addEventListener('click', close);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        close();
      }
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    return elements;
  }

  return { open, showContext, showImprovementResult, close };
}

function createRevisionGraphWebviewFlowPullRequestContextField(
  labelText: string,
  inputId: string,
  multiline: boolean
): {
  readonly container: HTMLElement;
  readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly aiButton: HTMLButtonElement;
} {
  const container = document.createElement('div');
  container.className = 'flow-form-field';
  const label = document.createElement('label');
  label.className = 'flow-form-label';
  label.setAttribute('for', inputId);
  label.textContent = labelText;
  const row = document.createElement('div');
  row.className = 'flow-ai-field-row';
  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  input.id = inputId;
  input.className = 'flow-form-input' + (multiline ? ' flow-form-textarea' : '');
  input.maxLength = multiline ? 2048 : 240;
  if (input instanceof HTMLInputElement) {
    input.type = 'text';
  }
  const aiButton = createRevisionGraphWebviewFlowAiTextButton('Improve with AI');
  row.append(input, aiButton);
  container.append(label, row);
  return { container, input, aiButton };
}

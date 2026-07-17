interface RevisionGraphWebviewFlowPullRequestDialogDependencies {
  readonly closeContextMenu: () => void;
  readonly getTargets: (sourceRefName: string) => readonly RevisionGraphWebviewFlowPullRequestTarget[];
  readonly requestContext: (sourceRefName: string, targetRefName: string) => void;
  readonly copyField: (
    sourceRefName: string,
    targetRefName: string,
    field: 'title' | 'description'
  ) => void;
  readonly openUrl: (sourceRefName: string, targetRefName: string) => void;
  readonly renderCopyIcon: () => string;
}

interface RevisionGraphWebviewFlowPullRequestDialogController {
  readonly open: (target: RevisionGraphWebviewTarget) => void;
  readonly showContext: (
    context: Extract<RevisionGraphWebviewHostMessage, { readonly type: 'show-flow-pr-context' }>
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
  readonly titleCopyButton: HTMLButtonElement;
  readonly descriptionCopyButton: HTMLButtonElement;
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

  function open(target: RevisionGraphWebviewTarget): void {
    dependencies.closeContextMenu();
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

  function close(): void {
    if (!elements) {
      return;
    }
    elements.backdrop.hidden = true;
    sourceRefName = '';
    targetRefName = '';
    document.body.classList.remove('flow-dialog-open');
  }

  function applyTargetSelection(): void {
    const dialog = ensureDialog();
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

  function copyField(field: 'title' | 'description'): void {
    if (sourceRefName && targetRefName) {
      dependencies.copyField(sourceRefName, targetRefName, field);
    }
  }

  function setWarning(message: string): void {
    const warning = ensureDialog().warning;
    warning.textContent = message;
    warning.hidden = !message;
  }

  function setActionsEnabled(enabled: boolean): void {
    const dialog = ensureDialog();
    dialog.titleCopyButton.disabled = !enabled;
    dialog.descriptionCopyButton.disabled = !enabled;
    dialog.openButton.disabled = !enabled;
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
    introduction.textContent = 'Review the generated context and copy each field into your Pull Request.';
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
      false,
      dependencies.renderCopyIcon
    );
    const descriptionField = createRevisionGraphWebviewFlowPullRequestContextField(
      'Description',
      'flowPullRequestDescriptionInput',
      true,
      dependencies.renderCopyIcon
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
      titleCopyButton: titleField.copyButton,
      descriptionCopyButton: descriptionField.copyButton,
      warning,
      openButton
    };
    titleField.copyButton.addEventListener('click', () => copyField('title'));
    descriptionField.copyButton.addEventListener('click', () => copyField('description'));
    targetSelect.addEventListener('change', applyTargetSelection);
    openButton.addEventListener('click', () => {
      if (sourceRefName && targetRefName) {
        dependencies.openUrl(sourceRefName, targetRefName);
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

  return { open, showContext, close };
}

function createRevisionGraphWebviewFlowPullRequestContextField(
  labelText: string,
  inputId: string,
  multiline: boolean,
  renderCopyIcon: () => string
): {
  readonly container: HTMLElement;
  readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly copyButton: HTMLButtonElement;
} {
  const container = document.createElement('div');
  container.className = 'flow-form-field';
  const label = document.createElement('label');
  label.className = 'flow-form-label';
  label.setAttribute('for', inputId);
  label.textContent = labelText;
  const row = document.createElement('div');
  row.className = 'flow-pr-context-copy-row';
  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  input.id = inputId;
  input.className = 'flow-form-input' + (multiline ? ' flow-form-textarea' : '');
  input.readOnly = true;
  if (input instanceof HTMLInputElement) {
    input.type = 'text';
  }
  const copyButton = document.createElement('button');
  copyButton.className = 'flow-pr-context-copy';
  copyButton.type = 'button';
  copyButton.title = 'Copy ' + labelText;
  copyButton.setAttribute('aria-label', 'Copy ' + labelText);
  copyButton.innerHTML = renderCopyIcon();
  row.append(input, copyButton);
  container.append(label, row);
  return { container, input, copyButton };
}

type RevisionGraphFlowFormResponse = Pick<RevisionGraphProtocol.FlowFormResult, 'status' | 'message'>;

function createRevisionGraphFlowFormBridge(
  getRepositoryPath: () => string | undefined,
  postMessage: (message: RevisionGraphProtocol.MessageOf<'submit-flow-form'>) => void
) {
  let nextRequestId = 0;
  const pending = new Map<number, { repositoryPath: string; resolve: (result: RevisionGraphFlowFormResponse) => void }>();
  return {
    submit(action: RevisionGraphProtocol.FlowFormAction): Promise<RevisionGraphFlowFormResponse> {
      const repositoryPath = getRepositoryPath();
      if (!repositoryPath) return Promise.resolve({ status: 'retry', message: 'Select a repository before trying again.' });
      const requestId = ++nextRequestId;
      return new Promise((resolve) => {
        pending.set(requestId, { repositoryPath, resolve });
        postMessage({ type: 'submit-flow-form', repositoryPath, requestId, action });
      });
    },
    receive(result: RevisionGraphProtocol.FlowFormResult): void {
      const request = pending.get(result.requestId);
      if (!request || result.repositoryPath !== request.repositoryPath || result.repositoryPath !== getRepositoryPath()) return;
      pending.delete(result.requestId);
      request.resolve(result);
    },
    reset(): void {
      for (const request of pending.values()) request.resolve({ status: 'retry', message: 'The repository changed.' });
      pending.clear();
    }
  };
}

interface RevisionGraphFlowSubmissionElements {
  readonly backdrop: HTMLElement;
  readonly submitButton: HTMLButtonElement;
  readonly error: HTMLElement;
}

function createRevisionGraphFlowSubmissionUi(
  getElements: () => RevisionGraphFlowSubmissionElements,
  close: () => void
) {
  let pending = false;
  let blocked = false;
  let generation = 0;
  let restore = () => {};
  return {
    isPending: () => pending,
    reset(): void { generation++; restore(); pending = false; blocked = false; },
    async run(operation: () => Promise<RevisionGraphFlowFormResponse>): Promise<void> {
      if (pending || blocked) return;
      const token = ++generation;
      const { backdrop, submitButton, error } = getElements();
      const controls = Array.from(backdrop.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement>('input, button, textarea, select'));
      const disabled = controls.map((control) => control.disabled);
      const label = submitButton.textContent;
      restore = () => {
        controls.forEach((control, index) => { control.disabled = disabled[index]; });
        submitButton.textContent = label;
        backdrop.removeAttribute('aria-busy');
      };
      pending = true;
      controls.forEach((control) => { control.disabled = true; });
      submitButton.textContent = 'Processing…';
      backdrop.setAttribute('aria-busy', 'true');
      error.textContent = '';
      error.hidden = true;
      let result: RevisionGraphFlowFormResponse;
      try { result = await operation(); }
      catch { result = { status: 'retry', message: 'Could not complete the request. Review the repository state before trying again.' }; }
      if (token !== generation) return;
      restore();
      pending = false;
      if (result.status === 'success') { close(); return; }
      blocked = result.status === 'partial';
      submitButton.disabled = blocked;
      error.textContent = result.message;
      error.hidden = false;
      error.setAttribute('tabindex', '-1');
      error.focus();
    }
  };
}

function resetRevisionGraphFlowForms(
  bridge: { reset(): void },
  branch: { reset(): void },
  equalization: { reset(): void }
): void {
  bridge.reset();
  branch.reset();
  equalization.reset();
}

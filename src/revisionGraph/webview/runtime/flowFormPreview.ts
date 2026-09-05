interface RevisionGraphFlowPreviewController {
  update(action: RevisionGraphProtocol.FlowFormPreviewAction, element: HTMLElement): void;
  receive(message: RevisionGraphProtocol.FlowFormPreview): void;
  reset(): void;
}

let nextFlowPreviewRequestId = 0;

function createRevisionGraphFlowPreviewController(
  getRepositoryPath: () => string | undefined,
  postMessage: (message: RevisionGraphProtocol.MessageOf<'preview-flow-form'>) => void
): RevisionGraphFlowPreviewController {
  let timer: number | undefined;
  let requestId = 0;
  let repositoryPath: string | undefined;
  let element: HTMLElement | undefined;
  let key = '';
  function reset(): void {
    window.clearTimeout(timer);
    timer = undefined;
    requestId = 0;
    key = '';
    element?.removeAttribute('aria-busy');
    element = undefined;
  }
  return {
    update(action, nextElement): void {
      const nextRepository = getRepositoryPath();
      const nextKey = JSON.stringify([nextRepository, action]);
      if (key === nextKey && element === nextElement) return;
      const retainPreview = element === nextElement && repositoryPath === nextRepository;
      reset();
      key = nextKey;
      element = nextElement;
      repositoryPath = nextRepository;
      requestId = ++nextFlowPreviewRequestId;
      if (!retainPreview) element.textContent = 'Loading operation preview…';
      element.setAttribute('aria-busy', 'true');
      const id = requestId;
      timer = window.setTimeout(() => {
        if (requestId === id && repositoryPath && repositoryPath === getRepositoryPath()) {
          postMessage({ type: 'preview-flow-form', requestId: id, repositoryPath, action });
        }
      }, 350);
    },
    receive(message): void {
      if (!element || message.requestId !== requestId || message.repositoryPath !== repositoryPath
        || message.repositoryPath !== getRepositoryPath()) return;
      element.textContent = message.text;
      element.setAttribute('aria-busy', 'false');
    },
    reset
  };
}

function createRevisionGraphFlowPreviews(
  getRepositoryPath: () => string | undefined,
  postMessage: (message: RevisionGraphProtocol.MessageOf<'preview-flow-form'>) => void
) {
  const branch = createRevisionGraphFlowPreviewController(getRepositoryPath, postMessage);
  const equalization = createRevisionGraphFlowPreviewController(getRepositoryPath, postMessage);
  return { branch, equalization, receive(message: RevisionGraphProtocol.FlowFormPreview): void {
    branch.receive(message);
    equalization.receive(message);
  } };
}

function createRevisionGraphFlowPreviewElement(id: string): HTMLElement {
  const element = document.createElement('div');
  element.id = id;
  element.className = 'flow-form-preview';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  return element;
}

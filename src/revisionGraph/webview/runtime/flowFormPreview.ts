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
  let action: RevisionGraphProtocol.FlowFormPreviewAction | undefined;
  function reset(): void {
    window.clearTimeout(timer);
    timer = undefined;
    requestId = 0;
    key = '';
    if (element) setRevisionGraphFlowPreviewRetry(element);
    action = undefined;
    element?.removeAttribute('aria-busy');
    element = undefined;
  }
  const controller: RevisionGraphFlowPreviewController = {
    update(nextAction, nextElement): void {
      const nextRepository = getRepositoryPath();
      const nextKey = JSON.stringify([nextRepository, nextAction]);
      if (key === nextKey && element === nextElement) return;
      const retainPreview = element === nextElement && repositoryPath === nextRepository;
      reset();
      key = nextKey;
      action = nextAction;
      element = nextElement;
      repositoryPath = nextRepository;
      requestId = ++nextFlowPreviewRequestId;
      setRevisionGraphFlowPreviewPending(element, retainPreview);
      element.setAttribute('aria-busy', 'true');
      const id = requestId;
      timer = window.setTimeout(() => {
        if (requestId === id && repositoryPath && repositoryPath === getRepositoryPath()) {
          postMessage({ type: 'preview-flow-form', requestId: id, repositoryPath, action: nextAction });
        }
      }, 350);
    },
    receive(message): void {
      if (!element || message.requestId !== requestId || message.repositoryPath !== repositoryPath
        || message.repositoryPath !== getRepositoryPath()) return;
      setRevisionGraphFlowPreviewRetry(element);
      renderRevisionGraphFlowPreview(element, message);
      element.setAttribute('aria-busy', 'false');
      if (message.status === 'unavailable' && !message.summary) {
        key = '';
        setRevisionGraphFlowPreviewRetry(element, () => {
          if (element && action && repositoryPath === getRepositoryPath()) controller.update(action, element);
        });
      }
    },
    reset
  };
  return controller;
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

function acquireRevisionGraphWebviewApi(
  getState: () => RevisionGraphWebviewHostState | null | undefined
): RevisionGraphRuntimeVsCodeApi {
  const api = acquireVsCodeApi();
  return {
    getState: () => api.getState(),
    setState: (state) => api.setState(state),
    postMessage: (message) => {
      const bound = 'origin' in message ? message : bindRevisionGraphWebviewMessage(message, getState());
      return bound ? api.postMessage(bound) : false;
    }
  };
}

function isRevisionGraphGlobalMessage(message: RevisionGraphWebviewMessage): message is RevisionGraphProtocol.GlobalMessage {
  return ['webview-ready', 'refresh', 'refresh-with-empty-cache', 'choose-repository', 'load-trace'].includes(message.type);
}

function bindRevisionGraphWebviewMessage(
  message: RevisionGraphWebviewMessage, state: RevisionGraphWebviewHostState | null | undefined
): RevisionGraphProtocol.ClientMessage | undefined {
  if (isRevisionGraphGlobalMessage(message)) return message;
  const origin = state?.messageOrigin;
  return origin ? { ...message, origin } : undefined;
}

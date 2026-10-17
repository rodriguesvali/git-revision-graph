import { isBoundedNonEmptyString, isRecord } from './webviewMessageValidation';

export interface WebviewMessageOrigin {
  readonly repositoryPath: string;
  readonly contextId: string;
}

export type WebviewClientMessage<Message extends { readonly type: string }> =
  Extract<Message, { readonly type: 'ready' }>
  | (Exclude<Message, { readonly type: 'ready' }> & { readonly origin: WebviewMessageOrigin });

export function matchesWebviewMessageOrigin(raw: unknown, expected: WebviewMessageOrigin | undefined): boolean {
  if (!expected || !isRecord(raw) || !isRecord(raw.origin)) return false;
  return isBoundedNonEmptyString(raw.origin.repositoryPath)
    && isBoundedNonEmptyString(raw.origin.contextId)
    && raw.origin.repositoryPath === expected.repositoryPath
    && raw.origin.contextId === expected.contextId;
}

export function createWebviewMessageOrigin(
  repositoryPath: string | undefined, contextId: string | undefined
): WebviewMessageOrigin | undefined {
  return repositoryPath && contextId ? { repositoryPath, contextId } : undefined;
}

/** Shared by the two inline runtimes; the typed graph runtime has its own bridge. */
export function renderScopedWebviewPostMessage(): string {
  return `function postMessage(message) {
    if (message.type === 'ready') return vscode.postMessage(message);
    if (!currentState || !currentState.messageOrigin) return false;
    return vscode.postMessage({ ...message, origin: currentState.messageOrigin });
  }`;
}

export function isAuthorizedWebviewMessage<Message extends { readonly type: string }>(
  message: Message | undefined, raw: unknown, origin: WebviewMessageOrigin | undefined
): message is Message {
  return !!message && (message.type === 'ready' || matchesWebviewMessageOrigin(raw, origin));
}

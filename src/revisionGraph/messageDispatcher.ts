import { randomUUID } from 'node:crypto';
import { matchesWebviewMessageOrigin } from '../webviewMessageOrigin';
import { RevisionGraphMessage, RevisionGraphViewState } from '../revisionGraphTypes';
import {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState,
  validateRevisionGraphMessage
} from './messageValidation';

export interface RevisionGraphMessageDispatchContext {
  readonly currentState: RevisionGraphViewState;
  readonly currentRepositoryPath: string | undefined;
  rejectMessage?(message: RevisionGraphMessage): void;
  handleMessage(message: RevisionGraphMessage): Promise<void>;
}

export class RevisionGraphMessageDispatcher {
  private origin: RevisionGraphProtocol.MessageOrigin | undefined;

  bindState(state: RevisionGraphViewState): RevisionGraphViewState {
    this.origin = state.repositoryPath ? { repositoryPath: state.repositoryPath, contextId: randomUUID() } : undefined;
    return { ...state, messageOrigin: this.origin };
  }

  invalidate(): void { this.origin = undefined; }

  async dispatch(rawMessage: unknown, context: RevisionGraphMessageDispatchContext): Promise<void> {
    const message = validateRevisionGraphMessage(rawMessage);
    if (
      !message ||
      (!isGlobalMessage(message) && (
        this.origin?.repositoryPath !== context.currentRepositoryPath
        || !matchesWebviewMessageOrigin(rawMessage, this.origin)
        || !matchesWebviewMessageOrigin(rawMessage, context.currentState.messageOrigin)
      )) ||
      !isRevisionGraphMessageAllowedForState(message, context.currentState) ||
      !isRevisionGraphMessageAllowedForCurrentRepository(
        message,
        context.currentState,
        context.currentRepositoryPath
      )
    ) {
      if (message) context.rejectMessage?.(message);
      return;
    }

    await context.handleMessage(message);
  }
}

function isGlobalMessage(message: RevisionGraphMessage): message is RevisionGraphProtocol.GlobalMessage {
  return ['webview-ready', 'refresh', 'refresh-with-empty-cache', 'choose-repository', 'load-trace'].includes(message.type);
}

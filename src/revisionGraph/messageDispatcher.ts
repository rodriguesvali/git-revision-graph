import { RevisionGraphMessage, RevisionGraphViewState } from '../revisionGraphTypes';
import {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState,
  validateRevisionGraphMessage
} from './messageValidation';

export interface RevisionGraphMessageDispatchContext {
  readonly currentState: RevisionGraphViewState;
  readonly currentRepositoryPath: string | undefined;
  handleMessage(message: RevisionGraphMessage): Promise<void>;
}

export class RevisionGraphMessageDispatcher {
  async dispatch(rawMessage: unknown, context: RevisionGraphMessageDispatchContext): Promise<void> {
    const message = validateRevisionGraphMessage(rawMessage);
    if (
      !message ||
      !isRevisionGraphMessageAllowedForState(message, context.currentState) ||
      !isRevisionGraphMessageAllowedForCurrentRepository(
        message,
        context.currentState,
        context.currentRepositoryPath
      )
    ) {
      return;
    }

    await context.handleMessage(message);
  }
}

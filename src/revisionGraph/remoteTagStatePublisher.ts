import type { Repository } from '../git';
import type {
  RemoteTagPublicationState,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { createRevisionGraphRemoteTagStateMessage } from './hostMessages';
import {
  isRemoteTagPublicationStateResponseCurrent,
  type RemoteTagPublicationRequestContext
} from './remoteTagState';

export interface RevisionGraphRemoteTagStatePublisherHost {
  getCurrentRepository(): Repository | undefined;
  getCurrentState(): RevisionGraphViewState;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphRemoteTagStatePublisher {
  constructor(private readonly host: RevisionGraphRemoteTagStatePublisherHost) {}

  createRequestContext(repository: Repository): RemoteTagPublicationRequestContext {
    return {
      repositoryPath: repository.rootUri.fsPath,
      state: this.host.getCurrentState()
    };
  }

  postIfCurrent(
    requestContext: RemoteTagPublicationRequestContext,
    tagName: string,
    state: RemoteTagPublicationState
  ): void {
    if (!isRemoteTagPublicationStateResponseCurrent(
      requestContext,
      this.host.getCurrentRepository()?.rootUri.fsPath,
      this.host.getCurrentState()
    )) {
      return;
    }

    this.host.postHostMessage(createRevisionGraphRemoteTagStateMessage(tagName, state));
  }
}

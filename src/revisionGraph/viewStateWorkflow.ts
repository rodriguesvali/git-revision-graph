import { Repository } from '../git';
import {
  normalizeRevisionGraphProjectionOptionsForScope,
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../revisionGraphTypes';
import { RevisionGraphRefreshRequestLike } from '../revisionGraphRefresh';
import { createRevisionGraphUpdateStateMessage } from './hostMessages';

export interface RevisionGraphViewStateWorkflowHost {
  pickRepository(): Promise<Repository | undefined>;
  setCurrentRepository(repository: Repository | undefined): void;
  getCurrentState(): RevisionGraphViewState;
  getProjectionOptions(): RevisionGraphViewState['projectionOptions'];
  setProjectionOptions(options: RevisionGraphViewState['projectionOptions']): void;
  refresh(request?: RevisionGraphRefreshRequestLike): Promise<void>;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphViewStateWorkflow {
  constructor(private readonly host: RevisionGraphViewStateWorkflowHost) {}

  async chooseRepository(): Promise<void> {
    const pickedRepository = await this.host.pickRepository();
    if (!pickedRepository) {
      this.host.postHostMessage(createRevisionGraphUpdateStateMessage(this.host.getCurrentState()));
      return;
    }

    this.host.setCurrentRepository(pickedRepository);
    await this.host.refresh('full-rebuild');
  }

  async setProjectionOptions(
    options: Partial<RevisionGraphViewState['projectionOptions']>
  ): Promise<void> {
    const nextProjectionOptions = normalizeRevisionGraphProjectionOptionsForScope({
      ...this.host.getProjectionOptions(),
      ...options
    });
    this.host.setProjectionOptions(nextProjectionOptions);
    await this.host.refresh('projection-only');
  }
}

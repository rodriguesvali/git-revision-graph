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
    const requestedDescendantFocus = options.descendantFocus;
    if (
      requestedDescendantFocus &&
      !this.host.getCurrentState().scene.nodes.some((node) => node.hash === requestedDescendantFocus.anchorRevision)
    ) {
      this.host.postHostMessage(createRevisionGraphUpdateStateMessage(this.host.getCurrentState()));
      return;
    }

    const currentProjectionOptions = this.host.getProjectionOptions();
    const isScopeChange = options.refScope !== undefined && options.refScope !== currentProjectionOptions.refScope;
    const nextProjectionOptions = normalizeRevisionGraphProjectionOptionsForScope({
      ...currentProjectionOptions,
      ...options,
      ...(isScopeChange
        ? { revisionRange: undefined, descendantFocus: undefined }
        : hasOwnProjectionOption(options, 'revisionRange') && options.revisionRange
          ? { descendantFocus: undefined }
          : hasOwnProjectionOption(options, 'descendantFocus') && options.descendantFocus
            ? { revisionRange: undefined }
            : {})
    });
    this.host.setProjectionOptions(nextProjectionOptions);
    await this.host.refresh('projection-only');
  }
}

function hasOwnProjectionOption(
  options: Partial<RevisionGraphViewState['projectionOptions']>,
  key: keyof RevisionGraphViewState['projectionOptions']
): boolean {
  return Object.prototype.hasOwnProperty.call(options, key);
}

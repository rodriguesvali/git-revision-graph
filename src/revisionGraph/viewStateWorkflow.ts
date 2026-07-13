import { Repository } from '../git';
import {
  normalizeRevisionGraphProjectionOptionsForScope,
  RevisionGraphProjectionOptionsUpdate,
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
    options: RevisionGraphProjectionOptionsUpdate
  ): Promise<void> {
    const normalizedOptions = normalizeProjectionOptionsUpdate(options);
    const requestedDescendantFocus = normalizedOptions.descendantFocus;
    if (
      requestedDescendantFocus &&
      !this.host.getCurrentState().scene.nodes.some((node) => node.hash === requestedDescendantFocus.anchorRevision)
    ) {
      this.host.postHostMessage(createRevisionGraphUpdateStateMessage(this.host.getCurrentState()));
      return;
    }

    const currentProjectionOptions = this.host.getProjectionOptions();
    const isScopeChange = normalizedOptions.refScope !== undefined
      && normalizedOptions.refScope !== currentProjectionOptions.refScope;
    const nextProjectionOptions = normalizeRevisionGraphProjectionOptionsForScope({
      ...currentProjectionOptions,
      ...normalizedOptions,
      ...(isScopeChange
        ? { revisionRange: undefined, descendantFocus: undefined }
        : hasOwnProjectionOption(normalizedOptions, 'revisionRange') && normalizedOptions.revisionRange
          ? { descendantFocus: undefined }
          : hasOwnProjectionOption(normalizedOptions, 'descendantFocus') && normalizedOptions.descendantFocus
            ? { revisionRange: undefined }
            : {})
    });
    this.host.setProjectionOptions(nextProjectionOptions);
    await this.host.refresh('projection-only');
  }
}

function normalizeProjectionOptionsUpdate(
  options: RevisionGraphProjectionOptionsUpdate
): Partial<RevisionGraphViewState['projectionOptions']> {
  const { revisionRange, descendantFocus, ...scalarOptions } = options;
  return {
    ...scalarOptions,
    ...(hasOwnProjectionOption(options, 'revisionRange')
      ? { revisionRange: revisionRange ?? undefined }
      : {}),
    ...(hasOwnProjectionOption(options, 'descendantFocus')
      ? { descendantFocus: descendantFocus ?? undefined }
      : {})
  };
}

function hasOwnProjectionOption(
  options: RevisionGraphProjectionOptionsUpdate | Partial<RevisionGraphViewState['projectionOptions']>,
  key: keyof RevisionGraphProjectionOptionsUpdate
): boolean {
  return Object.prototype.hasOwnProperty.call(options, key);
}

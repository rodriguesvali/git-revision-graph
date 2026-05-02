import type { RevisionGraphProjectionOptions } from './revisionGraph/model/commitGraphTypes';
import type { RevisionGraphReferencePatch } from './revisionGraphTypes';

export type RevisionGraphRefreshIntent =
  | 'full-rebuild'
  | 'projection-rebuild'
  | 'metadata-patch'
  | 'overlay-patch';

export type RevisionGraphRepositoryEventKind = 'state' | 'checkout';

export interface RevisionGraphRefreshRequest {
  readonly intent: RevisionGraphRefreshIntent;
  readonly repositoryPath?: string;
  readonly followUpEvents?: readonly RevisionGraphRepositoryEventKind[];
  readonly referencePatch?: RevisionGraphReferencePatch;
}

export type RevisionGraphRefreshRequestLike =
  | RevisionGraphRefreshIntent
  | RevisionGraphRefreshRequest
  | undefined;

export interface PendingRevisionGraphFollowUpRefresh {
  readonly id: number;
  readonly expiresAt: number;
  readonly eventKinds: ReadonlySet<RevisionGraphRepositoryEventKind>;
}

export interface PreparedPendingRevisionGraphRefresh {
  readonly repositoryPath: string;
  readonly id: number;
}

export class RevisionGraphSnapshotReloadSemaphore {
  private reusableRepositoryPath: string | undefined;

  markReloadRequired(): void {
    this.reusableRepositoryPath = undefined;
  }

  markReloadComplete(repositoryPath: string): void {
    this.reusableRepositoryPath = repositoryPath;
  }

  canReuseSnapshot(repositoryPath: string | undefined): boolean {
    return !!repositoryPath && this.reusableRepositoryPath === repositoryPath;
  }

  requiresReload(repositoryPath: string | undefined): boolean {
    return !this.canReuseSnapshot(repositoryPath);
  }
}

export function shouldReloadSnapshotForProjectionOptionsChange(
  previousOptions: RevisionGraphProjectionOptions,
  nextOptions: RevisionGraphProjectionOptions
): boolean {
  return previousOptions.refScope !== nextOptions.refScope ||
    previousOptions.showTags !== nextOptions.showTags ||
    previousOptions.showRemoteBranches !== nextOptions.showRemoteBranches ||
    previousOptions.showStashes !== nextOptions.showStashes ||
    previousOptions.showCurrentBranchDescendants !== nextOptions.showCurrentBranchDescendants;
}

const FOLLOW_UP_SUPPRESSION_WINDOW_MS = 5000;
let nextPendingFollowUpRefreshId = 0;

export function getRefreshLoadingLabel(intent: RevisionGraphRefreshIntent): string {
  switch (intent) {
    case 'projection-rebuild':
      return 'Updating revision graph view...';
    case 'metadata-patch':
    case 'overlay-patch':
      return 'Updating revision graph...';
    case 'full-rebuild':
      return 'Loading revision graph...';
  }
}

export function getRefreshLoadingMode(intent: RevisionGraphRefreshIntent): 'blocking' | 'subtle' {
  switch (intent) {
    case 'metadata-patch':
    case 'overlay-patch':
      return 'subtle';
    case 'projection-rebuild':
    case 'full-rebuild':
      return 'blocking';
  }
}

export function normalizeRefreshRequest(
  request: RevisionGraphRefreshRequestLike
): RevisionGraphRefreshRequest {
  if (!request) {
    return { intent: 'full-rebuild' };
  }

  if (typeof request === 'string') {
    return { intent: request };
  }

  return request;
}

export function createActionRefreshRequest(
  intent: RevisionGraphRefreshIntent,
  repositoryPath: string
): RevisionGraphRefreshRequest {
  return {
    intent,
    repositoryPath,
    followUpEvents: getDefaultFollowUpEventsForIntent(intent)
  };
}

export function createRepositoryRefreshRequest(
  intent: RevisionGraphRefreshIntent,
  repositoryPath?: string
): RevisionGraphRefreshRequest {
  if (!repositoryPath) {
    return { intent };
  }

  return createActionRefreshRequest(intent, repositoryPath);
}

export function getDefaultFollowUpEventsForIntent(
  intent: RevisionGraphRefreshIntent
): readonly RevisionGraphRepositoryEventKind[] {
  switch (intent) {
    case 'metadata-patch':
    case 'full-rebuild':
      return ['state', 'checkout'];
    case 'projection-rebuild':
    case 'overlay-patch':
      return [];
  }
}

export function registerPendingFollowUpRefresh(
  pendingRefreshes: Map<string, PendingRevisionGraphFollowUpRefresh[]>,
  request: RevisionGraphRefreshRequest,
  now = Date.now()
): PreparedPendingRevisionGraphRefresh | undefined {
  if (!request.repositoryPath || !request.followUpEvents || request.followUpEvents.length === 0) {
    return undefined;
  }

  const repositoryPath = request.repositoryPath;
  const activeEntries = getActivePendingFollowUpRefreshes(pendingRefreshes.get(repositoryPath), now);
  const entry: PendingRevisionGraphFollowUpRefresh = {
    id: ++nextPendingFollowUpRefreshId,
    expiresAt: now + FOLLOW_UP_SUPPRESSION_WINDOW_MS,
    eventKinds: new Set(request.followUpEvents)
  };
  activeEntries.push(entry);
  pendingRefreshes.set(repositoryPath, activeEntries);

  return {
    repositoryPath,
    id: entry.id
  };
}

export function cancelPendingFollowUpRefresh(
  pendingRefreshes: Map<string, PendingRevisionGraphFollowUpRefresh[]>,
  preparedRefresh: PreparedPendingRevisionGraphRefresh
): void {
  const activeEntries = getActivePendingFollowUpRefreshes(
    pendingRefreshes.get(preparedRefresh.repositoryPath),
    Date.now()
  ).filter((entry) => entry.id !== preparedRefresh.id);

  if (activeEntries.length === 0) {
    pendingRefreshes.delete(preparedRefresh.repositoryPath);
    return;
  }

  pendingRefreshes.set(preparedRefresh.repositoryPath, activeEntries);
}

export function consumePendingFollowUpRefresh(
  pendingRefreshes: Map<string, PendingRevisionGraphFollowUpRefresh[]>,
  repositoryPath: string,
  eventKind: RevisionGraphRepositoryEventKind,
  now = Date.now()
): boolean {
  const activeEntries = getActivePendingFollowUpRefreshes(pendingRefreshes.get(repositoryPath), now);
  if (activeEntries.length === 0) {
    pendingRefreshes.delete(repositoryPath);
    return false;
  }

  pendingRefreshes.set(repositoryPath, activeEntries);
  return activeEntries.some((entry) => entry.eventKinds.has(eventKind));
}

function getActivePendingFollowUpRefreshes(
  entries: readonly PendingRevisionGraphFollowUpRefresh[] | undefined,
  now: number
): PendingRevisionGraphFollowUpRefresh[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  return entries.filter((entry) => entry.expiresAt >= now);
}

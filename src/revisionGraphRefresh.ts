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
}

export type RevisionGraphRefreshRequestLike =
  | RevisionGraphRefreshIntent
  | RevisionGraphRefreshRequest
  | undefined;

export interface PendingRevisionGraphFollowUpRefresh {
  readonly expiresAt: number;
  readonly remainingEventKinds: Set<RevisionGraphRepositoryEventKind>;
}

const FOLLOW_UP_SUPPRESSION_WINDOW_MS = 1500;

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
  pendingRefreshes: Map<string, PendingRevisionGraphFollowUpRefresh>,
  request: RevisionGraphRefreshRequest,
  now = Date.now()
): void {
  if (!request.repositoryPath || !request.followUpEvents || request.followUpEvents.length === 0) {
    return;
  }

  pendingRefreshes.set(request.repositoryPath, {
    expiresAt: now + FOLLOW_UP_SUPPRESSION_WINDOW_MS,
    remainingEventKinds: new Set(request.followUpEvents)
  });
}

export function consumePendingFollowUpRefresh(
  pendingRefreshes: Map<string, PendingRevisionGraphFollowUpRefresh>,
  repositoryPath: string,
  eventKind: RevisionGraphRepositoryEventKind,
  now = Date.now()
): boolean {
  const pending = pendingRefreshes.get(repositoryPath);
  if (!pending) {
    return false;
  }

  if (pending.expiresAt < now) {
    pendingRefreshes.delete(repositoryPath);
    return false;
  }

  if (!pending.remainingEventKinds.has(eventKind)) {
    return false;
  }

  return true;
}

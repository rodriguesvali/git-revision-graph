export type RevisionGraphRefreshIntent = 'full-rebuild';

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
  readonly id: number;
  readonly expiresAt: number;
  readonly eventKinds: ReadonlySet<RevisionGraphRepositoryEventKind>;
}

export interface PreparedPendingRevisionGraphRefresh {
  readonly repositoryPath: string;
  readonly id: number;
}

const FOLLOW_UP_SUPPRESSION_WINDOW_MS = 5000;
let nextPendingFollowUpRefreshId = 0;

export function getRefreshLoadingLabel(_intent: RevisionGraphRefreshIntent): string {
  return 'Loading revision graph...';
}

export function getRefreshLoadingMode(_intent: RevisionGraphRefreshIntent): 'blocking' {
  return 'blocking';
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
  _intent: RevisionGraphRefreshIntent
): readonly RevisionGraphRepositoryEventKind[] {
  return ['state', 'checkout'];
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

  let consumed = false;
  for (const entry of activeEntries) {
    if (!consumed && entry.eventKinds.has(eventKind)) {
      consumed = true;
    }
  }

  pendingRefreshes.set(repositoryPath, activeEntries);

  return consumed;
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

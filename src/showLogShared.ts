import { getRepositoryRelativeChangePath, getStatusLabel } from './changePresentation';
import type { Change, Repository } from './git';
import type { RevisionLogEntry, RevisionLogSource } from './revisionGraphTypes';
import { buildShowLogLaneRows, type ShowLogLaneRow } from './showLog/showLogLanes';

export interface ShowLogState {
  readonly kind: 'hidden' | 'visible';
  readonly repository: Repository | undefined;
  readonly source: RevisionLogSource | undefined;
  readonly showAllBranches: boolean;
  readonly entries: readonly RevisionLogEntry[];
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly errorMessage: string | undefined;
  readonly expandedCommitHash: string | undefined;
  readonly loadingCommitHash: string | undefined;
  readonly expandedCommitError: string | undefined;
  readonly cachedChanges: Readonly<Record<string, readonly Change[]>>;
}

export interface ShowLogWebviewChangeItem {
  readonly id: string;
  readonly path: string;
  readonly status: string;
}

export interface ShowLogWebviewCommitItem {
  readonly hash: string;
  readonly shortHash: string;
  readonly subject: string;
  readonly author: string;
  readonly date: string;
  readonly refs: readonly string[];
  readonly stats: string | undefined;
  readonly topology: ShowLogLaneRow;
  readonly expanded: boolean;
  readonly loadingChanges: boolean;
  readonly changeError: string | undefined;
  readonly changes: readonly ShowLogWebviewChangeItem[];
}

export interface ShowLogWebviewState {
  readonly kind: 'hidden' | 'visible';
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly summary: string;
  readonly showAllBranches: boolean;
  readonly canToggleAllBranches: boolean;
  readonly emptyMessage: string | undefined;
  readonly errorMessage: string | undefined;
  readonly commits: readonly ShowLogWebviewCommitItem[];
  readonly hasMore: boolean;
}

export function createHiddenShowLogState(): ShowLogState {
  return {
    kind: 'hidden',
    repository: undefined,
    source: undefined,
    showAllBranches: false,
    entries: [],
    hasMore: false,
    loading: false,
    loadingMore: false,
    errorMessage: undefined,
    expandedCommitHash: undefined,
    loadingCommitHash: undefined,
    expandedCommitError: undefined,
    cachedChanges: {}
  };
}

export function getShowLogSourceLabel(source: RevisionLogSource | undefined): string {
  if (!source) {
    return '';
  }

  switch (source.kind) {
    case 'target':
      return source.label;
    case 'range':
      return `${source.baseLabel}..${source.compareLabel}`;
  }
}

export function buildShowLogSummary(
  source: RevisionLogSource | undefined,
  commitCount: number,
  hasMore: boolean
): string {
  const sourceLabel = getShowLogSourceLabel(source);
  if (!sourceLabel) {
    return '';
  }

  const commitLabel = `${commitCount}${hasMore ? '+' : ''} commit${commitCount === 1 && !hasMore ? '' : 's'}`;
  return `${sourceLabel} • ${commitLabel}`;
}

export function buildShowLogEmptyMessage(state: ShowLogState): string | undefined {
  if (state.kind === 'hidden' || !state.source) {
    return 'Use Show Log from the graph context menu to load a commit stack or range here.';
  }

  if (state.loading) {
    return 'Loading log...';
  }

  switch (state.source.kind) {
    case 'target':
      return `No commits found for ${state.source.label}.`;
    case 'range':
      return `No commits found between ${state.source.baseLabel} and ${state.source.compareLabel}.`;
  }
}

export function buildShowLogWebviewState(state: ShowLogState): ShowLogWebviewState {
  if (state.kind === 'hidden') {
    return {
      kind: 'hidden',
      loading: false,
      loadingMore: false,
      summary: '',
      showAllBranches: false,
      canToggleAllBranches: false,
      emptyMessage: buildShowLogEmptyMessage(state),
      errorMessage: undefined,
      commits: [],
      hasMore: false
    };
  }

  const topologyByHash = buildShowLogLaneRows(state.entries);

  return {
    kind: 'visible',
    loading: state.loading,
    loadingMore: state.loadingMore,
    summary: buildShowLogSummary(state.source, state.entries.length, state.hasMore),
    showAllBranches: state.showAllBranches,
    canToggleAllBranches: state.source?.kind === 'target',
    emptyMessage: state.entries.length === 0 ? buildShowLogEmptyMessage(state) : undefined,
    errorMessage: state.errorMessage,
    commits: state.entries.map((entry) => {
      const changes = state.cachedChanges[entry.hash] ?? [];
      return {
        hash: entry.hash,
        shortHash: entry.shortHash,
        subject: entry.subject,
        author: entry.author,
        date: entry.date,
        refs: entry.references.map((ref) => formatShowLogRef(ref.name, ref.kind)),
        stats: formatShortStat(entry.shortStat),
        topology: topologyByHash.get(entry.hash) ?? {
          laneCount: 1,
          nodeLane: 0,
          continuingLanes: [0],
          secondaryParentLanes: [],
          colorByLane: { 0: 0 }
        },
        expanded: state.expandedCommitHash === entry.hash,
        loadingChanges: state.loadingCommitHash === entry.hash,
        changeError: state.expandedCommitHash === entry.hash ? state.expandedCommitError : undefined,
        changes: state.expandedCommitHash === entry.hash
          ? changes.map((change, index) => ({
            id: `${entry.hash}:${index}`,
            path: getRepositoryRelativeChangePath(state.repository?.rootUri.fsPath ?? '', change),
            status: getStatusLabel(change.status)
          }))
          : []
      };
    }),
    hasMore: state.hasMore
  };
}

function formatShowLogRef(name: string, kind: RevisionLogEntry['references'][number]['kind']): string {
  switch (kind) {
    case 'head':
      return `HEAD → ${name}`;
    case 'tag':
      return `tag:${name}`;
    default:
      return name;
  }
}

function formatShortStat(shortStat: RevisionLogEntry['shortStat']): string | undefined {
  if (!shortStat) {
    return undefined;
  }

  const parts = [`${shortStat.files} files`];
  if (shortStat.insertions > 0) {
    parts.push(`+${shortStat.insertions}`);
  }
  if (shortStat.deletions > 0) {
    parts.push(`-${shortStat.deletions}`);
  }

  return parts.join(' • ');
}

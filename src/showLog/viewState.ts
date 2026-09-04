import { getRepositoryRelativeChangePath, getStatusLabel } from '../changePresentation';
import type { RevisionLogEntry, RevisionLogSource } from '../revisionGraphTypes';
import { REVISION_LOG_FILTER_SCAN_MAX_COMMITS } from '../revisionGraph/revisionLogTypes';
import type { ShowLogState } from '../showLogShared';
import { buildShowLogLaneRows, type ShowLogLaneRow } from './showLogLanes';

const FILTER_SCAN_LIMIT_LABEL = REVISION_LOG_FILTER_SCAN_MAX_COMMITS.toLocaleString('en-US');

export interface ShowLogWebviewChangeItem {
  readonly id: string;
  readonly path: string;
  readonly status: string;
}

export interface ShowLogWebviewReferenceItem {
  readonly name: string;
  readonly label: string;
  readonly kind: RevisionLogEntry['references'][number]['kind'];
}

export interface ShowLogWebviewCommitItem {
  readonly hash: string;
  readonly shortHash: string;
  readonly subject: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
  readonly isMerge: boolean;
  readonly refs: readonly ShowLogWebviewReferenceItem[];
  readonly stats: string | undefined;
  readonly topology: ShowLogLaneRow;
  readonly expanded: boolean;
  readonly loadingChanges: boolean;
  readonly changeError: string | undefined;
  readonly changes: readonly ShowLogWebviewChangeItem[];
}

export interface ShowLogWebviewState {
  readonly kind: 'hidden' | 'visible';
  readonly sourceToken: string;
  readonly loading: boolean;
  readonly loadingLabel?: string;
  readonly loadingMore: boolean;
  readonly summary: string;
  readonly summaryCount: string;
  readonly showAllBranches: boolean;
  readonly canToggleAllBranches: boolean;
  readonly filterText: string;
  readonly emptyMessage: string | undefined;
  readonly searchNotice: string | undefined;
  readonly errorMessage: string | undefined;
  readonly commits: readonly ShowLogWebviewCommitItem[];
  readonly hasMore: boolean;
}

export interface ShowLogWebviewAppendPatch {
  readonly sourceToken: string;
  readonly previousCommitCount: number;
  readonly summaryCount: string;
  readonly loadingMore: boolean;
  readonly errorMessage: string | undefined;
  readonly commits: readonly ShowLogWebviewCommitItem[];
  readonly hasMore: boolean;
}

export function getShowLogSourceLabel(source: RevisionLogSource | undefined): string {
  if (!source) {
    return '';
  }

  switch (source.kind) {
    case 'target':
      return source.label;
    case 'range':
      return `Base: ${source.baseLabel} -> Compare: ${source.compareLabel}`;
  }
}

export function buildShowLogCommitLabel(commitCount: number, hasMore: boolean): string {
  return `${commitCount}${hasMore ? '+' : ''} commit${commitCount === 1 && !hasMore ? '' : 's'}`;
}

export function buildShowLogEmptyMessage(state: ShowLogState): string | undefined {
  if (state.kind === 'hidden' || !state.source) {
    return 'Use Show Log from the graph context menu to load a commit stack or range here.';
  }

  if (state.loading) {
    return 'Loading log...';
  }

  if (state.filterText.trim()) {
    if (state.searchTruncated) {
      return `No commits found matching "${state.filterText.trim()}" in the first ${FILTER_SCAN_LIMIT_LABEL} commits. Older history was not searched.`;
    }
    return `No commits found matching "${state.filterText.trim()}".`;
  }

  switch (state.source.kind) {
    case 'target':
      return `No commits found for ${state.source.label}.`;
    case 'range':
      return `No commits found between ${state.source.baseLabel} and ${state.source.compareLabel}.`;
  }
}

export function buildShowLogSearchNotice(state: ShowLogState): string | undefined {
  if (!state.searchTruncated || state.entries.length === 0) {
    return undefined;
  }

  return `Showing matches from the first ${FILTER_SCAN_LIMIT_LABEL} commits. Older history was not searched.`;
}

export function buildShowLogWebviewState(state: ShowLogState): ShowLogWebviewState {
  if (state.kind === 'hidden') {
    return {
      kind: 'hidden',
      sourceToken: '',
      loading: false,
      loadingLabel: undefined,
      loadingMore: false,
      summary: '',
      summaryCount: '',
      showAllBranches: false,
      canToggleAllBranches: false,
      filterText: '',
      emptyMessage: buildShowLogEmptyMessage(state),
      searchNotice: undefined,
      errorMessage: undefined,
      commits: [],
      hasMore: false
    };
  }

  const topologyByHash = buildShowLogLaneRows(state.entries);

  return {
    kind: 'visible',
    sourceToken: state.sourceToken,
    loading: state.loading,
    loadingLabel: state.loadingLabel,
    loadingMore: state.loadingMore,
    summary: getShowLogSourceLabel(state.source),
    summaryCount: buildShowLogCommitLabel(state.entries.length, state.hasMore),
    showAllBranches: state.showAllBranches,
    canToggleAllBranches: state.source?.kind === 'target',
    filterText: state.filterText,
    emptyMessage: state.entries.length === 0 ? buildShowLogEmptyMessage(state) : undefined,
    searchNotice: buildShowLogSearchNotice(state),
    errorMessage: state.errorMessage,
    commits: state.entries.map((entry) => {
      const changes = state.cachedChanges[entry.hash] ?? [];
      return {
        hash: entry.hash,
        shortHash: entry.shortHash,
        subject: entry.subject,
        message: entry.message,
        author: entry.author,
        date: entry.date,
        isMerge: entry.parentHashes.length > 1,
        refs: entry.references.map((ref) => ({
          name: ref.name,
          label: formatShowLogRef(ref.name, ref.kind),
          kind: ref.kind
        })),
        stats: formatShortStat(entry.shortStat),
        topology: topologyByHash.get(entry.hash) ?? {
          laneCount: 1,
          nodeLane: 0,
          continuingLanes: [0],
          secondaryParentLanes: [],
          mergeStartLanes: [],
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

export function buildShowLogWebviewAppendPatch(
  state: ShowLogState,
  previousCommitCount: number
): ShowLogWebviewAppendPatch | undefined {
  if (state.kind !== 'visible') {
    return undefined;
  }

  const safePreviousCommitCount = Math.max(0, Math.min(previousCommitCount, state.entries.length));
  const webviewState = buildShowLogWebviewState(state);
  return {
    sourceToken: webviewState.sourceToken,
    previousCommitCount: safePreviousCommitCount,
    summaryCount: webviewState.summaryCount,
    loadingMore: webviewState.loadingMore,
    errorMessage: webviewState.errorMessage,
    commits: webviewState.commits.slice(safePreviousCommitCount),
    hasMore: webviewState.hasMore
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

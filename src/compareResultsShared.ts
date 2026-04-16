import type { Change, Repository } from './git';
import { getRepositoryRelativeChangePath, getStatusLabel } from './changePresentation';
import type { RefSelection } from './refActions';

export type CompareResultsState =
  | {
    readonly kind: 'empty';
  }
  | {
    readonly kind: 'between';
    readonly repository: Repository;
    readonly left: RefSelection;
    readonly right: RefSelection;
    readonly changes: readonly Change[];
  }
  | {
    readonly kind: 'worktree';
    readonly repository: Repository;
    readonly target: RefSelection;
    readonly changes: readonly Change[];
  };

export interface CompareResultItem {
  readonly id: string;
  readonly repository: Repository;
  readonly change: Change;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
  readonly leftRef: string | undefined;
  readonly rightRef: string | undefined;
  readonly worktreeRef: string | undefined;
  readonly worktreeLabel: string | undefined;
}

export function buildCompareResultItems(
  repository: Repository,
  changes: readonly Change[],
  leftRef: string | undefined,
  rightRef: string | undefined,
  worktreeRef: string | undefined,
  worktreeLabel: string | undefined
): CompareResultItem[] {
  return [...changes]
    .map<CompareResultItem>((change) => {
      const relativePath = getRepositoryRelativeChangePath(repository.rootUri.fsPath, change);
      return {
        id: [
          relativePath,
          getStatusLabel(change.status),
          leftRef ?? '',
          rightRef ?? '',
          worktreeRef ?? ''
        ].join('::'),
        repository,
        change,
        label: relativePath,
        description: relativePath,
        detail: getStatusLabel(change.status),
        leftRef,
        rightRef,
        worktreeRef,
        worktreeLabel
      };
    })
    .sort((left, right) => left.description.localeCompare(right.description));
}

export function buildCompareResultsMessage(state: CompareResultsState): string {
  switch (state.kind) {
    case 'empty':
      return 'Run a compare from the revision graph or Command Palette to keep the changed files here.';
    case 'between':
      return `${state.left.label} <-> ${state.right.label} • ${formatFileCount(state.changes.length)}`;
    case 'worktree':
      return `${state.target.label} <-> worktree • ${formatFileCount(state.changes.length)}`;
  }
}

export interface CompareResultsWorktreeRefreshOutcome {
  readonly nextState: CompareResultsState;
  readonly infoMessage: string | undefined;
}

export function applyCompareResultsWorktreeRefresh(
  state: CompareResultsState,
  repository: Repository,
  refName: string,
  changes: readonly Change[]
): CompareResultsWorktreeRefreshOutcome | undefined {
  if (
    state.kind !== 'worktree'
    || state.repository.rootUri.fsPath !== repository.rootUri.fsPath
    || state.target.refName !== refName
  ) {
    return undefined;
  }

  if (changes.length === 0) {
    return {
      nextState: { kind: 'empty' },
      infoMessage: `The worktree is now aligned with ${state.target.label}.`
    };
  }

  return {
    nextState: {
      ...state,
      changes: [...changes]
    },
    infoMessage: undefined
  };
}

function formatFileCount(count: number): string {
  return count === 1 ? '1 file changed' : `${count} files changed`;
}

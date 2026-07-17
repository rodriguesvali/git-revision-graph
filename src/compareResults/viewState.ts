import * as path from 'node:path';

import { getRepositoryRelativeUriPath, getTargetUri } from '../changePresentation';
import {
  buildCompareResultItems,
  buildCompareResultsMessage,
  type CompareResultItem,
  type CompareResultsState
} from '../compareResultsShared';
import type {
  CompareResultsWebviewItem,
  CompareResultsWebviewState
} from '../compareResultsWebview';
import type { CompareBriefingState } from './aiBriefing';

export function createCompareResultsWebviewState(
  state: CompareResultsState,
  briefing: CompareBriefingState = { kind: 'idle' },
  hasBriefingGenerator = false
): CompareResultsWebviewState {
  if (state.kind === 'empty') {
    return {
      kind: 'empty',
      summary: '',
      emptyMessage: buildCompareResultsMessage(state),
      canOpenUnifiedDiff: false,
      canGenerateBriefing: false,
      briefing: { kind: 'idle' },
      items: []
    };
  }

  if (state.kind === 'loading') {
    return {
      kind: 'loading',
      summary: buildCompareResultsMessage(state),
      sourceLabel: state.sourceLabel,
      targetLabel: state.targetLabel,
      canOpenUnifiedDiff: false,
      canGenerateBriefing: false,
      briefing: { kind: 'idle' },
      items: []
    };
  }

  return {
    kind: 'results',
    summary: buildCompareResultsMessage(state),
    sourceLabel: state.kind === 'between' ? state.left.label : state.target.label,
    targetLabel: state.kind === 'between' ? state.right.label : 'Worktree',
    canOpenUnifiedDiff: true,
    canGenerateBriefing: hasBriefingGenerator,
    briefing,
    items: getCompareResultItems(state).map((item) => toCompareResultsWebviewItem(item))
  };
}

export function getCompareResultItems(state: CompareResultsState): CompareResultItem[] {
  switch (state.kind) {
    case 'empty':
    case 'loading':
      return [];
    case 'between':
      return buildCompareResultItems(
        state.repository,
        state.changes,
        state.left.refName,
        state.right.refName,
        undefined,
        undefined
      );
    case 'worktree':
      return buildCompareResultItems(
        state.repository,
        state.changes,
        undefined,
        undefined,
        state.target.refName,
        state.target.label
      );
  }
}

export function toCompareResultsWebviewItem(
  item: CompareResultItem
): CompareResultsWebviewItem {
  const originalPath = getRepositoryRelativeUriPath(
    item.repository.rootUri.fsPath,
    item.change.originalUri.fsPath
  );
  const isRename = !!item.change.renameUri && originalPath !== item.label;
  return {
    id: item.id,
    path: item.label,
    originalPath: isRename ? originalPath : undefined,
    name: path.basename(item.label),
    directory: path.dirname(item.label) === '.' ? '' : path.dirname(item.label),
    fullPath: getTargetUri(item.change).fsPath,
    status: item.detail,
    leftRef: item.leftRef,
    rightRef: item.rightRef,
    worktreeRef: item.worktreeRef,
    worktreeLabel: item.worktreeLabel
  };
}

import type { CompareBriefingState } from './aiBriefing';

export interface CompareResultsWebviewItem {
  readonly fileOpenActions?: readonly import('../fileOpen').FileOpenAction[];
  readonly id: string;
  readonly path: string;
  readonly originalPath: string | undefined;
  readonly name: string;
  readonly directory: string;
  readonly fullPath: string;
  readonly status: string;
  readonly canRevert: boolean;
  readonly leftRef: string | undefined;
  readonly rightRef: string | undefined;
  readonly worktreeRef: string | undefined;
  readonly worktreeLabel: string | undefined;
}

export interface CompareResultsWebviewState {
  readonly messageOrigin?: import('../webviewMessageOrigin').WebviewMessageOrigin;
  readonly kind: 'empty' | 'loading' | 'results';
  readonly comparisonId?: string;
  readonly summary: string;
  readonly sourceLabel?: string | undefined;
  readonly targetLabel?: string | undefined;
  readonly emptyMessage?: string | undefined;
  readonly canOpenUnifiedDiff: boolean;
  readonly canGenerateBriefing: boolean;
  readonly briefing: CompareBriefingState;
  readonly items: readonly CompareResultsWebviewItem[];
}
